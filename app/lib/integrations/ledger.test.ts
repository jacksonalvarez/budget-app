import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fingerprint,
  mapPlaidCategory,
  mergePlaidTransactions,
  normalizeExtractedRows,
  parseModelJson,
  pdfTextIsUsable,
  plaidAmount,
} from "./ledger";
import { Transaction } from "../../types";

const categories = [
  { id: "food", name: "Food & Dining", type: "expense" as const },
  { id: "salary", name: "Salary", type: "income" as const },
];

describe("document rows", () => {
  it("keeps real rows and drops balances", () => {
    const rows = normalizeExtractedRows({
      transactions: [
        { date: "2026-03-02", description: "Cafe", amount: "$12.50", type: "debit", category: "Food & Dining" },
        { date: "03/03/2026", description: "Paycheck", amount: 1000, type: "income", category: "salary" },
        { date: "2026-03-04", description: "Opening balance", amount: 0, type: "income" },
        { date: "not-a-date", description: "Nope", amount: 5, type: "expense" },
      ],
    }, categories);

    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], {
      date: "2026-03-02",
      description: "Cafe",
      amount: 12.5,
      type: "expense",
      category: "food",
    });
    assert.equal(rows[1].category, "salary");
  });

  it("parses fenced JSON", () => {
    const parsed = parseModelJson('Sure\n```json\n{"transactions":[]}\n```');
    assert.deepEqual(parsed, { transactions: [] });
  });

  it("rejects a scanned page that has almost no text", () => {
    assert.equal(pdfTextIsUsable("   \n--"), false);
    assert.equal(pdfTextIsUsable("Starbucks Store 1234 Seattle WA 03/02/2026 Total 4.50"), true);
  });
});

describe("plaid sync", () => {
  it("treats a positive Plaid amount as money leaving the account", () => {
    assert.deepEqual(plaidAmount(18.2), { amount: 18.2, type: "expense" });
    assert.deepEqual(plaidAmount(-2500), { amount: 2500, type: "income" });
    assert.equal(mapPlaidCategory("FOOD_AND_DRINK", "expense"), "food");
    assert.equal(mapPlaidCategory("INCOME", "income"), "salary");
  });

  it("links a bank row onto a matching manual transaction and drops the pending copy", () => {
    const existing: Transaction[] = [{
      id: "manual-1",
      description: "Cafe",
      amount: 12.5,
      type: "expense",
      date: "2026-03-02",
      category: "food",
    }, {
      id: "plaid_pending-1",
      description: "Cafe",
      amount: 12.5,
      type: "expense",
      date: "2026-03-02",
      source: "plaid",
      externalId: "pending-1",
      pending: true,
    }];

    const result = mergePlaidTransactions(existing, {
      added: [{
        transaction_id: "posted-1",
        account_id: "acc",
        amount: 12.5,
        date: "2026-03-02",
        name: "CAFE 123",
        merchant_name: "Cafe",
        pending: false,
        pending_transaction_id: "pending-1",
        personal_finance_category: { primary: "FOOD_AND_DRINK" },
        iso_currency_code: "USD",
      }],
      modified: [],
      removed: [{ transaction_id: "pending-1" }],
    }, { acc: "Checking ••1234" });

    assert.equal(result.removed, 1);
    assert.equal(result.added, 0);
    assert.equal(result.transactions.length, 1);
    assert.equal(result.transactions[0].id, "manual-1");
    assert.equal(result.transactions[0].externalId, "posted-1");
    assert.equal(result.transactions[0].category, "food");
    assert.equal(result.transactions[0].accountName, "Checking ••1234");
    assert.equal(fingerprint(result.transactions[0]).includes("cafe"), true);
  });
});
