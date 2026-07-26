/**
 * Auth admin compatible Edge Middleware — pas de next/headers.
 * Les helpers async (cookies()) restent dans admin-auth.ts (Node runtime).
 */
import type { NextRequest } from "next/server";

import type { AdminRole } from "@/lib/admin/types";
import { findAdminTokenEntry } from "@/lib/server/admin-tokens";

export const ADMIN_SESSION_COOKIE = "amg_admin_session";

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

export function isAdminAuthorizedFromRequest(request: NextRequest): boolean {
  return getAdminContextFromRequest(request) !== null;
}

export function getAdminRoleFromRequest(
  request: NextRequest,
): AdminRole | null {
  return getAdminContextFromRequest(request)?.role ?? null;
}

export function isAdministratorFromRequest(request: NextRequest): boolean {
  return getAdminRoleFromRequest(request) === "administrateur";
}
