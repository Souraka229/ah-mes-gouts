import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE,
  ensureVisitorId,
  recordSiteVisit,
} from "@/lib/server/site-visits";

export const dynamic = "force-dynamic";

/**
 * Enregistre une page vue de la boutique.
 *
 * Cette route avait été supprimée, laissant `recordSiteVisit` sans aucun
 * appelant : la carte « Visiteurs » du cockpit affichait donc 0 en permanence,
 * présenté comme une mesure alors que plus rien n'était compté.
 *
 * Elle est volontairement légère et sans authentification — c'est un beacon
 * public. L'identifiant visiteur est un UUID opaque, stocké haché en base.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = await checkRateLimit(
    `analytics:visit:${ip}`,
    120,
    60_000,
  );
  if (!allowed) {
    // Un beacon n'a pas à faire échouer l'affichage : on répond sans bruit.
    return new NextResponse(null, {
      status: 204,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  const existing = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${VISITOR_COOKIE}=`))
    ?.slice(VISITOR_COOKIE.length + 1);

  const visitorId = ensureVisitorId(existing);

  // Best-effort : une mesure qui échoue ne doit pas gêner la navigation.
  await recordSiteVisit(visitorId);

  const response = new NextResponse(null, { status: 204 });

  if (visitorId !== existing) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: VISITOR_COOKIE_MAX_AGE,
    });
  }

  return response;
}
