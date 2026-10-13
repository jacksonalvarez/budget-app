import { NextRequest, NextResponse } from "next/server";
import { handlePlaidWebhook } from "../../../../lib/integrations/plaid-service";
import { toErrorResponse } from "../../../../lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const result = await handlePlaidWebhook(rawBody, request.headers.get("plaid-verification"));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
