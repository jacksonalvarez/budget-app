import { NextRequest, NextResponse } from "next/server";
import { syncPlaidItems } from "../../../../lib/integrations/plaid-service";
import { toErrorResponse } from "../../../../lib/http";
import { requireUserId } from "../../../../lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json().catch(() => ({})) as { itemId?: string };
    const summary = await syncPlaidItems(userId, body.itemId);
    return NextResponse.json(summary);
  } catch (error) {
    return toErrorResponse(error);
  }
}
