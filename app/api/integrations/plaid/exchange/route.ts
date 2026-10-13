import { NextRequest, NextResponse } from "next/server";
import { connectPlaidItem } from "../../../../lib/integrations/plaid-service";
import { toErrorResponse } from "../../../../lib/http";
import { requireUserId } from "../../../../lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json() as { publicToken?: string; institutionName?: string | null };
    const summary = await connectPlaidItem(userId, body.publicToken || "", body.institutionName ?? null);
    return NextResponse.json(summary);
  } catch (error) {
    return toErrorResponse(error);
  }
}
