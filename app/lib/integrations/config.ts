export type PlaidEnvironmentName = "sandbox" | "development" | "production";
export type OcrProviderName = "mistral" | "gemini";

export interface PlaidPublicConfig {
  enabled: boolean;
  configured: boolean;
  environment: PlaidEnvironmentName | null;
  products: string[];
  webhookConfigured: boolean;
  redirectConfigured: boolean;
  reason?: string;
}

export interface OcrPublicConfig {
  enabled: boolean;
  configured: boolean;
  provider: OcrProviderName | null;
  model: string | null;
  reason?: string;
}

export interface IntegrationConfig {
  plaid: PlaidPublicConfig;
  ocr: OcrPublicConfig;
}

export interface PlaidCredentials {
  clientId: string;
  secret: string;
  environment: PlaidEnvironmentName;
  products: string[];
  countryCodes: string[];
  webhookUrl: string | null;
  redirectUri: string | null;
}

export interface OcrCredentials {
  provider: OcrProviderName;
  apiKey: string;
  model: string;
  structureModel: string;
}

type Env = Record<string, string | undefined>;

const PLAID_ENVIRONMENTS = new Set<PlaidEnvironmentName>(["sandbox", "development", "production"]);
const PLAID_PRODUCTS = new Set([
  "transactions",
  "auth",
  "identity",
  "balance",
  "investments",
  "liabilities",
  "statements",
  "assets",
]);
const PLAID_COUNTRIES = new Set(["US", "CA", "GB", "IE", "FR", "ES", "NL", "DE"]);

function trimmed(value: string | undefined): string {
  return value?.trim() ?? "";
}

function enabledFlag(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  return !["0", "false", "off", "no"].includes(value.trim().toLowerCase());
}

function parseList(value: string | undefined, allowed: Set<string>, fallback: string[]): string[] {
  const items = trimmed(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (allowed.has(item) ? item : allowed.has(item.toUpperCase()) ? item.toUpperCase() : ""))
    .filter(Boolean);

  return items.length > 0 ? Array.from(new Set(items)) : fallback;
}

export function resolveIntegrationConfig(env: Env): IntegrationConfig {
  const plaidEnabled = enabledFlag(env.PLAID_ENABLED);
  const clientId = trimmed(env.PLAID_CLIENT_ID);
  const secret = trimmed(env.PLAID_SECRET);
  const environmentRaw = trimmed(env.PLAID_ENV) || "sandbox";
  const environment = PLAID_ENVIRONMENTS.has(environmentRaw as PlaidEnvironmentName)
    ? (environmentRaw as PlaidEnvironmentName)
    : null;
  const products = parseList(env.PLAID_PRODUCTS, PLAID_PRODUCTS, ["transactions"]);
  const webhookConfigured = trimmed(env.PLAID_WEBHOOK_URL).length > 0;
  const redirectConfigured = trimmed(env.PLAID_REDIRECT_URI).length > 0;

  let plaidReason: string | undefined;
  if (!plaidEnabled) plaidReason = "PLAID_ENABLED is off";
  else if (!clientId || !secret) plaidReason = "Set PLAID_CLIENT_ID and PLAID_SECRET";
  else if (!environment) plaidReason = "PLAID_ENV must be sandbox, development, or production";

  const ocrEnabled = enabledFlag(env.OCR_ENABLED);
  const requested = trimmed(env.OCR_PROVIDER).toLowerCase();
  const mistralKey = trimmed(env.MISTRAL_API_KEY);
  const geminiKey = trimmed(env.GEMINI_API_KEY) || trimmed(env.GOOGLE_GENERATIVE_AI_API_KEY);
  let provider: OcrProviderName | null = null;
  if (requested === "mistral" || requested === "gemini") provider = requested;
  else if (!requested && mistralKey) provider = "mistral";
  else if (!requested && geminiKey) provider = "gemini";

  const providerKey = provider === "mistral" ? mistralKey : provider === "gemini" ? geminiKey : "";
  const model =
    trimmed(env.OCR_MODEL) ||
    (provider === "mistral" ? "mistral-ocr-latest" : provider === "gemini" ? "gemini-2.5-flash" : "");

  let ocrReason: string | undefined;
  if (!ocrEnabled) ocrReason = "OCR_ENABLED is off";
  else if (requested && requested !== "mistral" && requested !== "gemini") {
    ocrReason = "OCR_PROVIDER must be mistral or gemini";
  } else if (!provider) ocrReason = "Set MISTRAL_API_KEY or GEMINI_API_KEY";
  else if (!providerKey) ocrReason = `Missing API key for ${provider}`;

  return {
    plaid: {
      enabled: plaidEnabled,
      configured: plaidEnabled && Boolean(clientId && secret && environment),
      environment,
      products,
      webhookConfigured,
      redirectConfigured,
      reason: plaidReason,
    },
    ocr: {
      enabled: ocrEnabled,
      configured: ocrEnabled && Boolean(provider && providerKey) && !ocrReason,
      provider: ocrReason && ocrReason.startsWith("OCR_PROVIDER") ? null : provider,
      model: model || null,
      reason: ocrReason,
    },
  };
}

export function integrationConfig(): IntegrationConfig {
  return resolveIntegrationConfig(process.env);
}

export function plaidCredentials(env: Env = process.env): PlaidCredentials | null {
  const config = resolveIntegrationConfig(env);
  if (!config.plaid.configured || !config.plaid.environment) return null;

  return {
    clientId: trimmed(env.PLAID_CLIENT_ID),
    secret: trimmed(env.PLAID_SECRET),
    environment: config.plaid.environment,
    products: config.plaid.products,
    countryCodes: parseList(env.PLAID_COUNTRY_CODES, PLAID_COUNTRIES, ["US"]),
    webhookUrl: trimmed(env.PLAID_WEBHOOK_URL) || null,
    redirectUri: trimmed(env.PLAID_REDIRECT_URI) || null,
  };
}

export function ocrCredentials(env: Env = process.env): OcrCredentials | null {
  const config = resolveIntegrationConfig(env);
  if (!config.ocr.configured || !config.ocr.provider || !config.ocr.model) return null;

  const apiKey =
    config.ocr.provider === "mistral"
      ? trimmed(env.MISTRAL_API_KEY)
      : trimmed(env.GEMINI_API_KEY) || trimmed(env.GOOGLE_GENERATIVE_AI_API_KEY);

  return {
    provider: config.ocr.provider,
    apiKey,
    model: config.ocr.model,
    structureModel:
      trimmed(env.OCR_STRUCTURE_MODEL) ||
      (config.ocr.provider === "mistral" ? "mistral-small-latest" : config.ocr.model),
  };
}
