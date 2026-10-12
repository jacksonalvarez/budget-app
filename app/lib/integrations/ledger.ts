import { Transaction } from "../../types";

export interface DraftTransaction {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category?: string;
}

export interface CategoryRef {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
}

export interface PlaidSyncTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string | null;
  pending: boolean;
  pending_transaction_id?: string | null;
  personal_finance_category?: { primary?: string | null } | null;
  iso_currency_code?: string | null;
}

export interface PlaidMergeResult {
  transactions: Transaction[];
  added: number;
  updated: number;
  removed: number;
}

const EXPENSE_CATEGORIES: Record<string, string> = {
  FOOD_AND_DRINK: "food",
  TRANSPORTATION: "transportation",
  TRAVEL: "transportation",
  RENT_AND_UTILITIES: "housing",
  HOME_IMPROVEMENT: "housing",
  ENTERTAINMENT: "entertainment",
  GENERAL_MERCHANDISE: "shopping",
  MEDICAL: "healthcare",
  PERSONAL_CARE: "personal",
  BANK_FEES: "other-expense",
  LOAN_PAYMENTS: "other-expense",
  GENERAL_SERVICES: "other-expense",
  GOVERNMENT_AND_NON_PROFIT: "other-expense",
};

const INCOME_CATEGORIES: Record<string, string> = {
  INCOME: "salary",
  TRANSFER_IN: "other-income",
};

const MAX_ROWS = 400;

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function pdfTextIsUsable(text: string): boolean {
  const trimmed = text.replace(/\s+/g, " ").trim();
  const alnum = trimmed.replace(/[^a-z0-9]/gi, "");
  return alnum.length >= 40 && /\d/.test(trimmed);
}

export function fingerprint(transaction: {
  date: string;
  description: string;
  amount: number;
  type: string;
}): string {
  const description = transaction.description.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `${transaction.date}|${transaction.type}|${roundMoney(transaction.amount).toFixed(2)}|${description}`;
}

export function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("The document reader returned an empty response");

  try {
    return JSON.parse(trimmed);
  } catch {
    // Models sometimes wrap JSON in a fence or a sentence.
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return JSON.parse(fenced[1]);

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));

  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) return JSON.parse(trimmed.slice(arrayStart, arrayEnd + 1));

  throw new Error("The document reader did not return transaction JSON");
}

export function extractionPrompt(categories: CategoryRef[]): string {
  const list = categories
    .filter((category) => category.type === "income" || category.type === "expense" || category.type === "both")
    .map((category) => `- ${category.id} (${category.type}): ${category.name}`)
    .join("\n");

  return `You extract posted financial transactions from a bank statement, credit card statement, or receipt.
Return JSON with a transactions array.
Rules:
- One object per transaction row. Skip opening balances, closing balances, running balances, and page headers.
- amount is a positive number. Do not include a currency symbol.
- type is "expense" when money leaves the account and "income" when money arrives.
- date is YYYY-MM-DD. Infer the year from the statement period. Skip a row when the year cannot be determined.
- description is the merchant or payee.
- category is one of the ids below, or omit it when none fits.
- Do not invent transactions that are not in the document.

Categories:
${list || "- other-expense (expense): Other Expenses"}`;
}

export function plaidAmount(amount: number): { amount: number; type: "income" | "expense" } {
  if (amount < 0) return { amount: roundMoney(Math.abs(amount)), type: "income" };
  return { amount: roundMoney(Math.abs(amount)), type: "expense" };
}

export function mapPlaidCategory(primary: string | null | undefined, type: "income" | "expense"): string {
  const table = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return table[primary || ""] || (type === "income" ? "other-income" : "other-expense");
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = `${iso[1]}-${iso[2]}-${iso[3]}`;
    return isRealDate(date) ? date : null;
  }

  const us = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!us) return null;
  const month = Number(us[1]);
  const day = Number(us[2]);
  let year = Number(us[3]);
  if (year < 100) year += 2000;
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isRealDate(date) ? date : null;
}

function isRealDate(date: string): boolean {
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return roundMoney(Math.abs(value));
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[$,\s]/g, "").replace(/[()]/g, "");
  const amount = Number(cleaned.replace(/^\+/, ""));
  if (!Number.isFinite(amount)) return null;
  return roundMoney(Math.abs(amount));
}

function normalizeType(value: unknown, rawAmount: unknown): "income" | "expense" | null {
  if (typeof value === "string") {
    const kind = value.trim().toLowerCase();
    if (["income", "credit", "deposit", "inflow", "in"].includes(kind)) return "income";
    if (["expense", "debit", "withdrawal", "outflow", "out", "purchase"].includes(kind)) return "expense";
  }
  if (typeof rawAmount === "number" && rawAmount < 0) return "expense";
  if (typeof rawAmount === "string" && /^\s*[-(]/.test(rawAmount)) return "expense";
  return null;
}

function resolveCategory(
  value: unknown,
  type: "income" | "expense",
  categories: CategoryRef[],
): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const needle = value.trim().toLowerCase();
  const match = categories.find((category) => {
    const typeOk = category.type === type || category.type === "both";
    if (!typeOk) return false;
    return category.id.toLowerCase() === needle || category.name.toLowerCase() === needle;
  });
  return match?.id;
}

export function normalizeExtractedRows(payload: unknown, categories: CategoryRef[]): DraftTransaction[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { transactions?: unknown }).transactions)
      ? (payload as { transactions: unknown[] }).transactions
      : [];

  const drafts: DraftTransaction[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const date = normalizeDate(record.date);
    const amount = normalizeAmount(record.amount);
    const type = normalizeType(record.type, record.amount);
    const description = typeof record.description === "string" ? record.description.trim().slice(0, 180) : "";
    if (!date || amount == null || amount <= 0 || !type || !description) continue;

    const draft: DraftTransaction = {
      date,
      description,
      amount,
      type,
      category: resolveCategory(record.category, type, categories),
    };
    const key = fingerprint(draft);
    if (seen.has(key)) continue;
    seen.add(key);
    drafts.push(draft);
    if (drafts.length >= MAX_ROWS) break;
  }

  return drafts;
}

function plaidDescription(transaction: PlaidSyncTransaction): string {
  const base = (transaction.merchant_name || transaction.name || "Transaction").trim().slice(0, 180);
  if (transaction.iso_currency_code && transaction.iso_currency_code !== "USD") {
    return `${base} (${transaction.iso_currency_code})`;
  }
  return base;
}

export function plaidTransactionToDraft(
  transaction: PlaidSyncTransaction,
  accountNames: Record<string, string>,
): (DraftTransaction & { externalId: string; pending: boolean; accountName?: string }) | null {
  if (!transaction.transaction_id || !transaction.date || !Number.isFinite(transaction.amount) || transaction.amount === 0) {
    return null;
  }
  const signed = plaidAmount(transaction.amount);
  if (signed.amount <= 0) return null;
  const date = normalizeDate(transaction.date);
  if (!date) return null;

  return {
    ...signed,
    date,
    description: plaidDescription(transaction),
    category: mapPlaidCategory(transaction.personal_finance_category?.primary, signed.type),
    externalId: transaction.transaction_id,
    pending: transaction.pending,
    accountName: accountNames[transaction.account_id],
  };
}

export function mergePlaidTransactions(
  existing: Transaction[],
  change: {
    added: PlaidSyncTransaction[];
    modified: PlaidSyncTransaction[];
    removed: { transaction_id: string }[];
  },
  accountNames: Record<string, string>,
): PlaidMergeResult {
  const removedIds = new Set(change.removed.map((item) => item.transaction_id).filter(Boolean));
  for (const transaction of [...change.added, ...change.modified]) {
    if (transaction.pending_transaction_id) removedIds.add(transaction.pending_transaction_id);
  }

  let removed = 0;
  const kept = existing.filter((transaction) => {
    if (transaction.externalId && removedIds.has(transaction.externalId)) {
      removed += 1;
      return false;
    }
    return true;
  });

  const byExternal = new Map<string, number>();
  const byFingerprint = new Map<string, number>();
  kept.forEach((transaction, index) => {
    if (transaction.externalId) byExternal.set(transaction.externalId, index);
    byFingerprint.set(fingerprint(transaction), index);
  });

  let added = 0;
  let updated = 0;
  const apply = (transaction: PlaidSyncTransaction) => {
    const draft = plaidTransactionToDraft(transaction, accountNames);
    if (!draft) return;
    const externalIndex = byExternal.get(draft.externalId);
    const fingerprintIndex = byFingerprint.get(fingerprint(draft));
    const index = externalIndex ?? fingerprintIndex;

    if (index == null) {
      const created: Transaction = {
        id: `plaid_${draft.externalId}`,
        description: draft.description,
        amount: draft.amount,
        type: draft.type,
        date: draft.date,
        category: draft.category,
        source: "plaid",
        externalId: draft.externalId,
        pending: draft.pending,
        accountName: draft.accountName,
      };
      byExternal.set(draft.externalId, kept.length);
      byFingerprint.set(fingerprint(created), kept.length);
      kept.push(created);
      added += 1;
      return;
    }

    const current = kept[index];
    kept[index] = {
      ...current,
      description: draft.description,
      amount: draft.amount,
      type: draft.type,
      date: draft.date,
      category: current.category || draft.category,
      source: "plaid",
      externalId: draft.externalId,
      pending: draft.pending,
      accountName: draft.accountName || current.accountName,
    };
    byExternal.set(draft.externalId, index);
    updated += 1;
  };

  const seen = new Set<string>();
  for (const transaction of [...change.modified, ...change.added]) {
    if (!transaction.transaction_id || removedIds.has(transaction.transaction_id) || seen.has(transaction.transaction_id)) {
      continue;
    }
    seen.add(transaction.transaction_id);
    apply(transaction);
  }

  kept.sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id));

  return { transactions: kept, added, updated, removed };
}
