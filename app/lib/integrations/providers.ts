import { OcrCredentials } from "./config";
import { parseModelJson } from "./ledger";
import { documentPrompt, MAX_OCR_PAGES, transactionResponseSchema } from "./prompt";
import { CategoryRef } from "./ledger";

async function readError(response: Response, label: string): Promise<never> {
  console.error(`${label} failed`, response.status);
  throw new Error(`${label} failed (${response.status})`);
}

export async function structureText(
  credentials: OcrCredentials,
  text: string,
  categories: CategoryRef[],
): Promise<unknown> {
  const prompt = documentPrompt(categories);
  const document = text.slice(0, 80_000);
  if (credentials.provider === "gemini") {
    return geminiGenerate(credentials, prompt, document, null);
  }
  return mistralChat(credentials, prompt, document);
}

export async function ocrDocument(
  credentials: OcrCredentials,
  bytes: Uint8Array,
  mimeType: string,
  categories: CategoryRef[],
  pageCount: number | null,
): Promise<{ payload: unknown; warnings: string[] }> {
  const warnings: string[] = [];
  if (credentials.provider === "gemini") {
    if (pageCount != null && pageCount > MAX_OCR_PAGES) {
      warnings.push(`This PDF has ${pageCount} pages. Gemini was asked to read the first ${MAX_OCR_PAGES}.`);
    }
    const payload = await geminiGenerate(
      credentials,
      `${documentPrompt(categories)}\nIf the document has more than ${MAX_OCR_PAGES} pages, only read the first ${MAX_OCR_PAGES}.`,
      null,
      { bytes, mimeType },
    );
    return { payload, warnings };
  }

  const payload = await mistralOcr(credentials, bytes, mimeType, categories, pageCount, warnings);
  return { payload, warnings };
}

async function geminiGenerate(
  credentials: OcrCredentials,
  prompt: string,
  text: string | null,
  file: { bytes: Uint8Array; mimeType: string } | null,
): Promise<unknown> {
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (text) parts.push({ text });
  if (file) {
    parts.push({
      inline_data: {
        mime_type: file.mimeType,
        data: Buffer.from(file.bytes).toString("base64"),
      },
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(credentials.model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": credentials.apiKey,
      },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: transactionResponseSchema,
        },
      }),
    },
  );
  if (!response.ok) await readError(response, "Gemini");

  const body = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = body.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  return parseModelJson(content);
}

async function mistralChat(credentials: OcrCredentials, prompt: string, text: string): Promise<unknown> {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${credentials.apiKey}`,
    },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model: credentials.structureModel,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text },
      ],
    }),
  });
  if (!response.ok) await readError(response, "Mistral");

  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return parseModelJson(body.choices?.[0]?.message?.content || "");
}

async function mistralOcr(
  credentials: OcrCredentials,
  bytes: Uint8Array,
  mimeType: string,
  categories: CategoryRef[],
  pageCount: number | null,
  warnings: string[],
): Promise<unknown> {
  const dataUrl = `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
  const image = mimeType.startsWith("image/");
  const pages = !image && pageCount != null && pageCount > MAX_OCR_PAGES
    ? Array.from({ length: MAX_OCR_PAGES }, (_, index) => index)
    : undefined;
  if (pages) warnings.push(`This PDF has ${pageCount} pages. Mistral OCR read the first ${MAX_OCR_PAGES}.`);

  const requestBody = {
    model: credentials.model,
    document: image
      ? { type: "image_url", image_url: dataUrl }
      : { type: "document_url", document_url: dataUrl },
    table_format: "markdown",
    include_image_base64: false,
    ...(pages ? { pages } : {}),
    document_annotation_format: {
      type: "json_schema",
      json_schema: {
        name: "ledger_transactions",
        strict: false,
        schema: transactionResponseSchema,
      },
    },
    document_annotation_prompt: documentPrompt(categories),
  };

  let response = await postMistralOcr(credentials.apiKey, requestBody);
  if (response.status === 400) {
    const { document_annotation_format: _format, document_annotation_prompt: _prompt, ...withoutAnnotation } = requestBody;
    response = await postMistralOcr(credentials.apiKey, withoutAnnotation);
  }
  if (!response.ok) await readError(response, "Mistral OCR");

  const body = await response.json() as {
    document_annotation?: unknown;
    pages?: Array<{ markdown?: string }>;
  };
  const annotation = annotationPayload(body.document_annotation);
  if (annotation) return annotation;

  const markdown = (body.pages || []).map((page) => page.markdown || "").join("\n\n").trim();
  if (!markdown) return { transactions: [] };
  warnings.push("Mistral OCR returned text, so a second model pass structured the transactions.");
  return mistralChat(credentials, documentPrompt(categories), markdown);
}

function annotationPayload(annotation: unknown): unknown | null {
  if (!annotation) return null;
  if (typeof annotation === "string") {
    try {
      return parseModelJson(annotation);
    } catch {
      return null;
    }
  }
  if (typeof annotation === "object") return annotation;
  return null;
}

function postMistralOcr(apiKey: string, body: unknown): Promise<Response> {
  return fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify(body),
  });
}
