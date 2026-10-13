import { NextRequest, NextResponse } from "next/server";
import { defaultCategories } from "../../../utils/categories";
import { extractTransactions, mimeFromFilename } from "../../../lib/integrations/extract";
import { HttpError, toErrorResponse } from "../../../lib/http";
import { loadUserDataFromS3 } from "../../../lib/s3-storage";
import { requireUserId } from "../../../lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Choose a PDF or image");

    const mimeType = file.type || mimeFromFilename(file.name) || "";
    const bytes = new Uint8Array(await file.arrayBuffer());
    const userData = await loadUserDataFromS3(userId);
    const categories = userData?.categories?.length ? userData.categories : defaultCategories;
    const result = await extractTransactions({
      bytes,
      mimeType,
      filename: file.name,
      categories,
    });

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
