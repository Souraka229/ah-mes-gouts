import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_HOURS,
  verifyAdminSession,
} from "@/lib/server/admin-session";
import {
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

export const ADMIN_SESSION_MAX_AGE_SECONDS = ADMIN_SESSION_TTL_HOURS * 3600;

/**
 * Contexte admin pour les routes API et pages serveur.
 *
 * Vérification complète : signature + existence + révocation + expiration en
 * base. C'est le contrôle qui fait autorité — le middleware ne valide que la
 * signature, faute de pouvoir interroger Postgres depuis l'Edge.
 */
export async function getAdminContextAsync(): Promise<AdminContext | null> {
  const cookieStore = await cookies();
  const claims = await verifyAdminSession(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (claims) return { role: claims.role, name: claims.name };

  if (isDevAdminOpen()) {
    return {
      role:
        process.env.ADMIN_DEV_ROLE === "employe" ? "employe" : "administrateur",
      name: process.env.ADMIN_DEV_NAME ?? "Administrateur",
    };
  }

  return null;
}

/** @deprecated Bypass dev uniquement — ne jamais utiliser pour autoriser une action. */
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
): Promise<AdminContext | null> {
  return getAdminContextFromRequest(request);
}
