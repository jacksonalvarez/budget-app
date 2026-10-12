import { NextResponse } from "next/server";
import { createLinkToken } from "../../../../lib/integrations/plaid-service";
import { toErrorResponse } from "../../../../lib/http";
import { requireUserId } from "../../../../lib/session";

export const runtime = "nodejs";

export async function POST() {
  try {
    const userId = await requireUserId();
    const linkToken = await createLinkToken(userId);
    return NextResponse.json({ linkToken });
  } catch (error) {
    return toErrorResponse(error);
  }
}
