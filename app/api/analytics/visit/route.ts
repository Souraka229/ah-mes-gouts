import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  ensureVisitorId,
  recordSiteVisit,
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE,
} from "@/lib/server/site-visits";

export const dynamic = "force-dynamic";

/**
 * Beacon boutique — cookie anonyme amg_vid + compteur unique / jour.
 * Ne bloque jamais la navigation (erreurs avalées).
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = checkRateLimit(`analytics:visit:${ip}`, 60, 60_000);
  if (!allowed) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${VISITOR_COOKIE}=([^;]*)`));
  const existing = match?.[1] ? decodeURIComponent(match[1]) : undefined;
  const visitorId = ensureVisitorId(existing);

  void recordSiteVisit(visitorId);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: VISITOR_COOKIE,
    value: visitorId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: VISITOR_COOKIE_MAX_AGE,
  });
  return response;
}
