import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { findAdminTokenEntry } from "@/lib/server/admin-tokens";
import {
  ADMIN_SESSION_COOKIE,
  getAdminContextFromRequest,
  isDevAdminOpen,
  type AdminContext,
} from "@/lib/server/admin-auth-edge";

export {
  ADMIN_SESSION_COOKIE,
  getAdminContextFromRequest,
  isAdminAuthorizedFromRequest,
  isDevAdminOpen,
  type AdminContext,
} from "@/lib/server/admin-auth-edge";

export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function getAdminContextAsync(): Promise<AdminContext | null> {
  const cookieStore = await cookies();
  const entry = findAdminTokenEntry(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (entry) return { role: entry.role, name: entry.name };
  if (isDevAdminOpen()) {
    return {
      role:
        process.env.ADMIN_DEV_ROLE === "employe" ? "employe" : "administrateur",
      name: process.env.ADMIN_DEV_NAME ?? "Administrateur",
    };
  }
  return null;
}

/** @deprecated Préférer getAdminContextFromRequest dans le middleware. */
export function isAdminAuthorized(): boolean {
  return isDevAdminOpen();
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

/** Re-export pour compat — préférer admin-auth-edge dans le middleware. */
export function resolveAdminFromRequest(
  request: NextRequest,
): AdminContext | null {
  return getAdminContextFromRequest(request);
}
