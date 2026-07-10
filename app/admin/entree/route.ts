import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from "@/lib/server/admin-auth";
import { findAdminTokenEntry } from "@/lib/server/admin-tokens";

export const dynamic = "force-dynamic";

function safeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith("/admin")) return "/admin";
  if (value.startsWith("//")) return "/admin";
  return value;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  const redirectTo = safeRedirectPath(
    request.nextUrl.searchParams.get("redirect"),
  );

  if (!token) {
    return NextResponse.redirect(
      new URL("/?admin=token-missing", request.url),
    );
  }

  const entry = findAdminTokenEntry(token);
  if (!entry) {
    return NextResponse.redirect(
      new URL("/?admin=token-invalid", request.url),
    );
  }

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
