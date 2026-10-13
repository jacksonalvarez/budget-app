import { NextRequest, NextResponse } from "next/server";
import { disconnectPlaidItem } from "../../../../lib/integrations/plaid-service";
import { HttpError, toErrorResponse } from "../../../../lib/http";
import { requireUserId } from "../../../../lib/session";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json() as { itemId?: string };
    if (!body.itemId) throw new HttpError(400, "Missing item id");
    const connections = await disconnectPlaidItem(userId, body.itemId);
    return NextResponse.json({ connections });
  } catch (error) {
    return toErrorResponse(error);
  }
}
