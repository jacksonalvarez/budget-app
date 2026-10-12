import { ocrCredentials } from "./config";
import { HttpError } from "../http";
import { CategoryRef, DraftTransaction, normalizeExtractedRows } from "./ledger";
import { readPdfText } from "./pdf-text";
import { MAX_TEXT_CHARS } from "./prompt";
import { ocrDocument, structureText } from "./providers";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export interface ExtractResult {
  transactions: DraftTransaction[];
  method: "pdf-text" | "mistral-ocr" | "gemini";
  provider: "mistral" | "gemini";
  model: string;
  warnings: string[];
}

export function mimeFromFilename(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
}

export async function extractTransactions(input: {
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
  categories: CategoryRef[];
}): Promise<ExtractResult> {
  const credentials = ocrCredentials();
  if (!credentials) {
    throw new HttpError(409, "Document reading is not configured. Set MISTRAL_API_KEY or GEMINI_API_KEY.");
  }
  if (input.bytes.byteLength === 0) throw new HttpError(400, "That file is empty");
  if (input.bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new HttpError(400, "Files need to be 4 MB or smaller");
  }
  if (!ALLOWED_TYPES.has(input.mimeType)) {
    throw new HttpError(400, "Upload a PDF, JPEG, PNG, or WebP");
  }

  try {
    const warnings: string[] = [];
    let payload: unknown;
    let method: ExtractResult["method"] = credentials.provider === "mistral" ? "mistral-ocr" : "gemini";
    let model = credentials.model;

    if (input.mimeType === "application/pdf") {
      let pdf: { text: string; pageCount: number; usable: boolean } | null = null;
      try {
        pdf = await readPdfText(input.bytes);
      } catch (error) {
        console.error("PDF text extraction failed", error instanceof Error ? error.message : error);
      }

      if (pdf?.usable) {
        const text = pdf.text.slice(0, MAX_TEXT_CHARS);
        if (pdf.text.length > MAX_TEXT_CHARS) {
          warnings.push("The PDF text was long, so only the first part was structured.");
        }
        payload = await structureText(credentials, text, input.categories);
        method = "pdf-text";
        model = credentials.provider === "mistral" ? credentials.structureModel : credentials.model;
      } else {
        const ocr = await ocrDocument(
          credentials,
          input.bytes,
          input.mimeType,
          input.categories,
          pdf?.pageCount ?? null,
        );
        payload = ocr.payload;
        warnings.push(...ocr.warnings);
      }
    } else {
      const ocr = await ocrDocument(credentials, input.bytes, input.mimeType, input.categories, null);
      payload = ocr.payload;
      warnings.push(...ocr.warnings);
    }

    const transactions = normalizeExtractedRows(payload, input.categories);
    if (transactions.length === 0) {
      warnings.push("No transaction rows were found. Try a clearer export or a CSV from the bank.");
    }

    return {
      transactions,
      method,
      provider: credentials.provider,
      model,
      warnings,
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error("Document extract failed", error instanceof Error ? error.message : error);
    throw new HttpError(502, "The document reader failed. Check the API key and try a smaller file.");
  }
}
