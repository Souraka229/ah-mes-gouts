import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  getAdminContextAsync,
} from "@/lib/server/admin-auth";
import { findAdminTokenEntry } from "@/lib/server/admin-tokens";
import {
  formatSecurityAlert,
  notifyTelegramSafe,
} from "@/lib/notifications/telegram";
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
  const { allowed, retryAfterSec } = checkRateLimit(
    `admin:auth:${ip}`,
    8,
    15 * 60_000,
  );

  if (!allowed) {
    notifyTelegramSafe(
      formatSecurityAlert(
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
    const fails = checkRateLimit(`admin:auth:fail:${ip}`, 5, 15 * 60_000);
    if (!fails.allowed) {
      notifyTelegramSafe(
        formatSecurityAlert(
          "Plusieurs tokens admin invalides — possible tentative d'intrusion.",
        ),
      );
    }
    return NextResponse.json({ error: "Token invalide." }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    role: entry.role,
    name: entry.name,
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: entry.token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
