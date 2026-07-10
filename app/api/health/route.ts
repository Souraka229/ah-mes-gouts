import { NextResponse } from "next/server";

import { runHealthCheck } from "@/lib/server/db-health";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await runHealthCheck();
    return NextResponse.json(
      {
        status: health.ok ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        ...health,
      },
      { status: health.ok ? 200 : 503 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health check failed";
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        ok: false,
        error: message,
      },
      { status: 503 },
    );
  }
}
