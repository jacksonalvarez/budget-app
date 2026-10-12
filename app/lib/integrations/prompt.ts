import { CategoryRef, extractionPrompt } from "./ledger";

export const MAX_OCR_PAGES = 8;
export const MAX_TEXT_CHARS = 80_000;

export const transactionResponseSchema = {
  type: "object",
  properties: {
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          description: { type: "string" },
          amount: { type: "number" },
          type: { type: "string", enum: ["income", "expense"] },
          category: { type: "string" },
        },
        required: ["date", "description", "amount", "type"],
      },
    },
  },
  required: ["transactions"],
};

export function documentPrompt(categories: CategoryRef[]): string {
  return extractionPrompt(categories);
}
