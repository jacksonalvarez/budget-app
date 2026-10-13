import { deleteJson, readJson, writeJson } from "../s3-storage";
import { decryptSecret, encryptSecret } from "./crypto";

export interface PlaidAccountSummary {
  accountId: string;
  name: string;
  mask: string | null;
  type: string | null;
  subtype: string | null;
}

export interface StoredPlaidItem {
  itemId: string;
  accessToken: string;
  cursor: string;
  institutionName: string | null;
  accounts: PlaidAccountSummary[];
  connectedAt: string;
  lastSyncedAt: string | null;
}

export interface PlaidConnection {
  itemId: string;
  institutionName: string | null;
  accounts: Pick<PlaidAccountSummary, "name" | "mask" | "type">[];
  connectedAt: string;
  lastSyncedAt: string | null;
}

interface PlaidItemFile {
  items: StoredPlaidItem[];
}

interface PlaidItemIndex {
  userId: string;
}

function userKey(userId: string): string {
  return `users/${userId}/plaid-items.json`;
}

function indexKey(itemId: string): string {
  return `plaid/items/${itemId}.json`;
}

async function readItems(userId: string): Promise<StoredPlaidItem[]> {
  const file = await readJson<PlaidItemFile>(userKey(userId));
  return file?.items ?? [];
}

export function toConnection(item: StoredPlaidItem): PlaidConnection {
  return {
    itemId: item.itemId,
    institutionName: item.institutionName,
    accounts: item.accounts.map((account) => ({
      name: account.name,
      mask: account.mask,
      type: account.type,
    })),
    connectedAt: item.connectedAt,
    lastSyncedAt: item.lastSyncedAt,
  };
}

export async function listPlaidConnections(userId: string): Promise<PlaidConnection[]> {
  const items = await readItems(userId);
  return items.map(toConnection);
}

export async function savePlaidItem(
  userId: string,
  item: Omit<StoredPlaidItem, "accessToken"> & { accessToken: string },
): Promise<void> {
  const items = await readItems(userId);
  const stored: StoredPlaidItem = {
    ...item,
    accessToken: item.accessToken.startsWith("enc:v1:") ? item.accessToken : encryptSecret(item.accessToken),
  };
  const next = items.some((existing) => existing.itemId === item.itemId)
    ? items.map((existing) => (existing.itemId === item.itemId ? { ...stored, connectedAt: existing.connectedAt } : existing))
    : [...items, stored];

  await writeJson(userKey(userId), { items: next });
  await writeJson(indexKey(item.itemId), { userId } satisfies PlaidItemIndex);
}

export async function updatePlaidCursor(userId: string, itemId: string, cursor: string, syncedAt: string): Promise<void> {
  const items = await readItems(userId);
  await writeJson(userKey(userId), {
    items: items.map((item) => (
      item.itemId === itemId ? { ...item, cursor, lastSyncedAt: syncedAt } : item
    )),
  });
}

export async function getPlaidItem(userId: string, itemId: string): Promise<(StoredPlaidItem & { plainAccessToken: string }) | null> {
  const item = (await readItems(userId)).find((candidate) => candidate.itemId === itemId);
  if (!item) return null;
  return { ...item, plainAccessToken: decryptSecret(item.accessToken) };
}

export async function listPlaidItems(userId: string): Promise<Array<StoredPlaidItem & { plainAccessToken: string }>> {
  const items = await readItems(userId);
  return items.map((item) => ({ ...item, plainAccessToken: decryptSecret(item.accessToken) }));
}

export async function findPlaidItemOwner(itemId: string): Promise<string | null> {
  const index = await readJson<PlaidItemIndex>(indexKey(itemId));
  return index?.userId ?? null;
}

export async function deletePlaidItem(userId: string, itemId: string): Promise<void> {
  const items = await readItems(userId);
  await writeJson(userKey(userId), { items: items.filter((item) => item.itemId !== itemId) });
  await deleteJson(indexKey(itemId));
}
