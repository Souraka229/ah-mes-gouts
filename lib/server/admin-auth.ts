import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import type { AdminRole } from "@/lib/admin-assistant/types";
import { findAdminTokenEntry } from "@/lib/server/admin-tokens";

export const ADMIN_SESSION_COOKIE = "amg_admin_session";

export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type AdminContext = {
  role: AdminRole;
  name: string;
};

export function isDevAdminOpen(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ADMIN_DEV_OPEN === "true"
  );
}

function getDevAdminContext(): AdminContext {
  return {
    role:
      process.env.ADMIN_DEV_ROLE === "employe" ? "employe" : "administrateur",
    name: process.env.ADMIN_DEV_NAME ?? "Administrateur",
  };
}

function resolveAdminContext(token: string | undefined): AdminContext | null {
  const entry = findAdminTokenEntry(token);
  if (!entry) return null;
  return { role: entry.role, name: entry.name };
}

export function getAdminContextFromRequest(
  request: NextRequest,
): AdminContext | null {
  const fromToken = resolveAdminContext(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (fromToken) return fromToken;
  if (isDevAdminOpen()) return getDevAdminContext();
  return null;
}

export async function getAdminContextAsync(): Promise<AdminContext | null> {
  const cookieStore = await cookies();
  const fromToken = resolveAdminContext(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (fromToken) return fromToken;
  if (isDevAdminOpen()) return getDevAdminContext();
  return null;
}

/** @deprecated Préférer getAdminContextFromRequest dans le middleware. */
export function isAdminAuthorized(): boolean {
  return isDevAdminOpen();
}

export function isAdminAuthorizedFromRequest(request: NextRequest): boolean {
  return getAdminContextFromRequest(request) !== null;
}

export async function isAdminAuthorizedAsync(): Promise<boolean> {
  return (await getAdminContextAsync()) !== null;
}

export function buildAdminEntryUrl(
  baseUrl: string,
  token: string,
  redirectTo = "/admin",
): string {
  const url = new URL("/admin/entree", baseUrl);
  url.searchParams.set("token", token);
  if (redirectTo !== "/admin") {
    url.searchParams.set("redirect", redirectTo);
  }
  return url.toString();
}
