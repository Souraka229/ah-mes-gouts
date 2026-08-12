import { createHash } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  getAdminContextAsync,
} from "@/lib/server/admin-auth";
import {
  ADMIN_SESSION_COOKIE,
  issueAdminSession,
  revokeAdminSession,
  verifyAdminSession,
} from "@/lib/server/admin-session";
import { findAdminTokenEntry } from "@/lib/server/admin-tokens";
import { alertSecurity, notifyOps } from "@/lib/notifications/ops-alerts";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getAdminContextAsync();
  if (!context) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    role: context.role,
    name: context.name,
  });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = await checkRateLimit(
    `admin:auth:${ip}`,
    8,
    15 * 60_000,
  );

  if (!allowed) {
    notifyOps(alertSecurity(
        `Trop de tentatives de connexion admin (IP hashée côté serveur). Bloqué ${retryAfterSec}s.`,
      ),
    );
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      },
    );
  }

  let body: { token?: string };
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const token = body.token?.trim();
  const entry = findAdminTokenEntry(token);
  if (!entry) {
    const fails = await checkRateLimit(`admin:auth:fail:${ip}`, 5, 15 * 60_000);
    if (!fails.allowed) {
      notifyOps(alertSecurity(
          "Plusieurs tokens admin invalides — possible tentative d'intrusion.",
        ),
      );
    }
    return NextResponse.json({ error: "Token invalide." }, { status: 401 });
  }

  // Le token n'est jamais stocké en cookie : il est échangé contre une
  // session signée et révocable.
  let jwt: string;
  let expiresAt: Date;
  try {
    ({ jwt, expiresAt } = await issueAdminSession({
      role: entry.role,
      name: entry.name,
      userAgent: request.headers.get("user-agent"),
      ipHash: createHash("sha256").update(ip).digest("hex").slice(0, 32),
    }));
  } catch (error) {
    console.error("[admin/auth] session non émise:", error);
    return NextResponse.json(
      { error: "Session indisponible. Contactez l'administrateur." },
      { status: 503 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    role: entry.role,
    name: entry.name,
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: jwt,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store, private");

  return response;
}

/** Déconnexion — révoque la session en base, pas seulement le cookie. */
export async function DELETE() {
  const cookieStore = await cookies();
  const claims = await verifyAdminSession(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );

  if (claims) {
    await revokeAdminSession(claims.sid);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
