import { extractText } from "unpdf";
import { pdfTextIsUsable } from "./ledger";

export async function readPdfText(bytes: Uint8Array): Promise<{ text: string; pageCount: number; usable: boolean }> {
  const result = await extractText(bytes, { mergePages: true });
  const text = result.text;
  return {
    text,
    pageCount: result.totalPages,
    usable: pdfTextIsUsable(text),
  };
}
