import { NextResponse } from "next/server";
import { integrationConfig } from "../../lib/integrations/config";
import { listPlaidConnections } from "../../lib/integrations/plaid-store";
import { toErrorResponse } from "../../lib/http";
import { requireUserId } from "../../lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await requireUserId();
    const config = integrationConfig();
    const connections = config.plaid.configured ? await listPlaidConnections(userId) : [];
    return NextResponse.json({ ...config, connections });
  } catch (error) {
    return toErrorResponse(error);
  }
}
