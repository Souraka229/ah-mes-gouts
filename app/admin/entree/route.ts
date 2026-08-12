import { createHash } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  buildAdminSessionCookie,
  issueAdminSession,
} from "@/lib/server/admin-session";
import { findAdminTokenEntry } from "@/lib/server/admin-tokens";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { alertSecurity, notifyOps } from "@/lib/notifications/ops-alerts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith("/admin")) return "/admin";
  if (value.startsWith("//")) return "/admin";
  return value;
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/**
 * Échange du lien magique contre une session.
 *
 * Le token de ADMIN_ACCESS_TOKENS n'est plus jamais stocké en cookie : il est
 * consommé ici une seule fois et échangé contre un JWT signé, court et
 * révocable. La redirection immédiate purge le token de la barre d'adresse.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = await checkRateLimit(
    `admin:entree:${ip}`,
    8,
    15 * 60_000,
  );

  if (!allowed) {
    notifyOps(alertSecurity(
        `Trop de tentatives sur le lien magique admin. Bloqué ${retryAfterSec}s.`,
      ),
    );
    return NextResponse.redirect(new URL("/?admin=rate-limited", request.url));
  }

  const token = request.nextUrl.searchParams.get("token")?.trim();
  const redirectTo = safeRedirectPath(
    request.nextUrl.searchParams.get("redirect"),
  );

  if (!token) {
    return NextResponse.redirect(new URL("/?admin=token-missing", request.url));
  }

  const entry = findAdminTokenEntry(token);
  if (!entry) {
    notifyOps(alertSecurity("Token admin invalide présenté sur /admin/entree."),
    );
    return NextResponse.redirect(new URL("/?admin=token-invalid", request.url));
  }

  let jwt: string;
  let expiresAt: Date;
  try {
    ({ jwt, expiresAt } = await issueAdminSession({
      role: entry.role,
      name: entry.name,
      userAgent: request.headers.get("user-agent"),
      ipHash: hashIp(ip),
    }));
  } catch (error) {
    // ADMIN_SESSION_SECRET absent ou base injoignable : on refuse plutôt que
    // de retomber sur l'ancien cookie non signé.
    console.error("[admin/entree] session non émise:", error);
    return NextResponse.redirect(
      new URL("/?admin=session-indisponible", request.url),
    );
  }

  const response = NextResponse.redirect(new URL(redirectTo, request.url));

  // `sameSite: lax` et non `strict` : le lien magique arrive depuis WhatsApp
  // ou un mail, donc d'un autre site. En `strict`, le cookie ne partirait pas
  // sur cette première navigation et la session paraîtrait perdue aussitôt
  // créée. `lax` continue de bloquer les POST inter-sites.
  response.cookies.set({ ...buildAdminSessionCookie(jwt), expires: expiresAt });

  // Le token magique ne doit fuir ni par le Referer, ni par un cache partagé.
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store, private");

  return response;
}
