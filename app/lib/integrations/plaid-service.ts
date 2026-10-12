import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";
import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from "plaid";
import { loadUserDataFromS3, saveUserDataToS3 } from "../s3-storage";
import { HttpError } from "../http";
import { plaidCredentials, PlaidCredentials } from "./config";
import { sha256Hex, timingSafeHexEqual } from "./crypto";
import { mergePlaidTransactions, PlaidSyncTransaction } from "./ledger";
import {
  deletePlaidItem,
  findPlaidItemOwner,
  getPlaidItem,
  listPlaidConnections,
  listPlaidItems,
  PlaidAccountSummary,
  PlaidConnection,
  savePlaidItem,
  updatePlaidCursor,
} from "./plaid-store";

const keyCache = new Map<string, unknown>();

export interface PlaidSyncSummary {
  added: number;
  updated: number;
  removed: number;
  productNotReady: boolean;
  connections: PlaidConnection[];
}

function requireCredentials(): PlaidCredentials {
  const credentials = plaidCredentials();
  if (!credentials) {
    throw new HttpError(409, "Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET to enable it.");
  }
  return credentials;
}

function plaidClient(credentials: PlaidCredentials): PlaidApi {
  return new PlaidApi(new Configuration({
    basePath: PlaidEnvironments[credentials.environment],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": credentials.clientId,
        "PLAID-SECRET": credentials.secret,
      },
    },
  }));
}

function plaidFailure(error: unknown): { code?: string; message: string } {
  const data = (error as { response?: { data?: { error_code?: string; error_message?: string } } }).response?.data;
  if (data?.error_code) return { code: data.error_code, message: data.error_message || data.error_code };
  if (error instanceof Error) return { message: error.message };
  return { message: "Plaid request failed" };
}

function accountNames(accounts: PlaidAccountSummary[]): Record<string, string> {
  return Object.fromEntries(accounts.map((account) => {
    const mask = account.mask ? ` ••${account.mask}` : "";
    return [account.accountId, `${account.name}${mask}`];
  }));
}

async function syncAccessToken(
  client: PlaidApi,
  userId: string,
  itemId: string,
  accessToken: string,
  cursor: string,
  accounts: PlaidAccountSummary[],
): Promise<{ added: number; updated: number; removed: number; productNotReady: boolean }> {
  const added: PlaidSyncTransaction[] = [];
  const modified: PlaidSyncTransaction[] = [];
  const removed: { transaction_id: string }[] = [];
  let nextCursor = cursor;
  let hasMore = true;

  try {
    while (hasMore) {
      const response = await client.transactionsSync({
        access_token: accessToken,
        cursor: nextCursor || undefined,
        count: 200,
      });
      added.push(...(response.data.added as PlaidSyncTransaction[]));
      modified.push(...(response.data.modified as PlaidSyncTransaction[]));
      removed.push(...response.data.removed.map((item) => ({ transaction_id: item.transaction_id })));
      hasMore = response.data.has_more;
      nextCursor = response.data.next_cursor;
    }
  } catch (error) {
    const failure = plaidFailure(error);
    if (failure.code === "PRODUCT_NOT_READY") {
      return { added: 0, updated: 0, removed: 0, productNotReady: true };
    }
    throw new HttpError(502, failure.message);
  }

  const current = await loadUserDataFromS3(userId);
  if (!current) throw new HttpError(500, "Budget data is not available yet");

  const merged = mergePlaidTransactions(
    current.transactions || [],
    { added, modified, removed },
    accountNames(accounts),
  );
  await saveUserDataToS3(userId, { ...current, transactions: merged.transactions });
  await updatePlaidCursor(userId, itemId, nextCursor, new Date().toISOString());

  return {
    added: merged.added,
    updated: merged.updated,
    removed: merged.removed,
    productNotReady: false,
  };
}

export async function createLinkToken(userId: string): Promise<string> {
  const credentials = requireCredentials();
  const client = plaidClient(credentials);
  try {
    const response = await client.linkTokenCreate({
      user: { client_user_id: userId.slice(0, 128) },
      client_name: "Personal Budget Tracker",
      products: credentials.products as Products[],
      country_codes: credentials.countryCodes as CountryCode[],
      language: "en",
      ...(credentials.webhookUrl ? { webhook: credentials.webhookUrl } : {}),
      ...(credentials.redirectUri ? { redirect_uri: credentials.redirectUri } : {}),
    });
    return response.data.link_token;
  } catch (error) {
    throw new HttpError(502, plaidFailure(error).message);
  }
}

export async function connectPlaidItem(
  userId: string,
  publicToken: string,
  institutionName: string | null,
): Promise<PlaidSyncSummary> {
  if (!publicToken.trim()) throw new HttpError(400, "Missing Plaid public token");

  const credentials = requireCredentials();
  const client = plaidClient(credentials);
  let accessToken = "";
  let itemId = "";
  let accounts: PlaidAccountSummary[] = [];

  try {
    const exchanged = await client.itemPublicTokenExchange({ public_token: publicToken });
    accessToken = exchanged.data.access_token;
    itemId = exchanged.data.item_id;
    const accountResponse = await client.accountsGet({ access_token: accessToken });
    accounts = accountResponse.data.accounts.map((account) => ({
      accountId: account.account_id,
      name: account.name,
      mask: account.mask,
      type: account.type,
      subtype: account.subtype,
    }));
  } catch (error) {
    throw new HttpError(502, plaidFailure(error).message);
  }

  const existing = await getPlaidItem(userId, itemId);
  await savePlaidItem(userId, {
    itemId,
    accessToken,
    cursor: existing?.cursor || "",
    institutionName: institutionName?.trim().slice(0, 80) || existing?.institutionName || null,
    accounts,
    connectedAt: existing?.connectedAt || new Date().toISOString(),
    lastSyncedAt: existing?.lastSyncedAt || null,
  });

  const summary = await syncAccessToken(client, userId, itemId, accessToken, existing?.cursor || "", accounts);
  return { ...summary, connections: await listPlaidConnections(userId) };
}

export async function syncPlaidItems(userId: string, itemId?: string): Promise<PlaidSyncSummary> {
  const credentials = requireCredentials();
  const client = plaidClient(credentials);
  const items = await listPlaidItems(userId);
  const selected = itemId ? items.filter((item) => item.itemId === itemId) : items;
  if (itemId && selected.length === 0) throw new HttpError(404, "That bank connection is not on this account");

  const totals = { added: 0, updated: 0, removed: 0, productNotReady: false };
  for (const item of selected) {
    const summary = await syncAccessToken(
      client,
      userId,
      item.itemId,
      item.plainAccessToken,
      item.cursor,
      item.accounts,
    );
    totals.added += summary.added;
    totals.updated += summary.updated;
    totals.removed += summary.removed;
    totals.productNotReady = totals.productNotReady || summary.productNotReady;
  }

  return { ...totals, connections: await listPlaidConnections(userId) };
}

export async function disconnectPlaidItem(userId: string, itemId: string): Promise<PlaidConnection[]> {
  const credentials = requireCredentials();
  const item = await getPlaidItem(userId, itemId);
  if (!item) throw new HttpError(404, "That bank connection is not on this account");

  try {
    await plaidClient(credentials).itemRemove({ access_token: item.plainAccessToken });
  } catch (error) {
    const failure = plaidFailure(error);
    if (failure.code !== "ITEM_NOT_FOUND") throw new HttpError(502, failure.message);
  }

  await deletePlaidItem(userId, itemId);
  return listPlaidConnections(userId);
}

export async function handlePlaidWebhook(rawBody: string, verificationJwt: string | null): Promise<{ synced: boolean }> {
  const credentials = plaidCredentials();
  if (!credentials) throw new HttpError(404, "Plaid is not configured");
  if (!verificationJwt) throw new HttpError(401, "Missing Plaid verification");

  const client = plaidClient(credentials);
  await verifyPlaidWebhook(client, rawBody, verificationJwt);

  let body: { webhook_type?: string; webhook_code?: string; item_id?: string };
  try {
    body = JSON.parse(rawBody) as { webhook_type?: string; webhook_code?: string; item_id?: string };
  } catch {
    throw new HttpError(400, "Invalid webhook body");
  }
  const shouldSync = body.webhook_type === "TRANSACTIONS" && Boolean(body.item_id);
  if (!shouldSync || !body.item_id) return { synced: false };

  const userId = await findPlaidItemOwner(body.item_id);
  if (!userId) return { synced: false };
  await syncPlaidItems(userId, body.item_id);
  return { synced: true };
}

async function verifyPlaidWebhook(client: PlaidApi, rawBody: string, token: string): Promise<void> {
  let kid = "";
  try {
    kid = String(decodeProtectedHeader(token).kid || "");
  } catch {
    throw new HttpError(401, "Invalid Plaid verification");
  }
  if (!kid) throw new HttpError(401, "Invalid Plaid verification");

  try {
    let jwk = keyCache.get(kid);
    if (!jwk) {
      const response = await client.webhookVerificationKeyGet({ key_id: kid });
      const key = response.data.key as {
        expired_at?: number | null;
        kty?: string;
        crv?: string;
        x?: string;
        y?: string;
        kid?: string;
        alg?: string;
        use?: string;
      };
      if (key.expired_at != null) throw new HttpError(401, "Expired Plaid verification key");
      jwk = {
        kty: key.kty,
        crv: key.crv,
        x: key.x,
        y: key.y,
        kid: key.kid,
        alg: key.alg || "ES256",
        use: key.use,
      };
      keyCache.set(kid, jwk);
    }

    const publicKey = await importJWK(jwk as Parameters<typeof importJWK>[0], "ES256");
    const verified = await jwtVerify(token, publicKey);
    const issuedAt = typeof verified.payload.iat === "number" ? verified.payload.iat : 0;
    if (!issuedAt || Math.abs(Date.now() / 1000 - issuedAt) > 60 * 5) {
      throw new HttpError(401, "Stale Plaid verification");
    }
    const claimed = String(verified.payload.request_body_sha256 || "");
    if (!timingSafeHexEqual(sha256Hex(rawBody), claimed)) {
      throw new HttpError(401, "Plaid webhook body did not match its signature");
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "Invalid Plaid verification");
  }
}
