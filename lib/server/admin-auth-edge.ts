/**
 * Auth admin compatible Edge Middleware.
 *
 * Ne dépend que de `jose` (WebCrypto) : aucun module Node, aucun accès base.
 * Les helpers async avec révocation vivent dans admin-auth.ts (runtime Node).
 */
import type { NextRequest } from "next/server";

import type { AdminRole } from "@/lib/admin/types";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminJwt,
} from "@/lib/server/admin-session";

export { ADMIN_SESSION_COOKIE };

export type AdminContext = {
  role: AdminRole;
  name: string;
};

/**
 * Bypass développement local uniquement. Verrouillé sur NODE_ENV
 * — impossible à activer en production, même avec la variable d'environnement.
 */
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

/**
 * Contexte admin déduit de la session signée.
 *
 * Vérifie la signature seule : le middleware Edge ne peut pas interroger
 * Postgres. Une session révoquée reste acceptée ici au plus jusqu'à
 * l'expiration du JWT (12 h), mais toute action réelle passe par les routes
 * API, qui vérifient la révocation via verifyAdminSession().
 */
export async function getAdminContextFromRequest(
  request: NextRequest,
): Promise<AdminContext | null> {
  const claims = await verifyAdminJwt(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (claims) return { role: claims.role, name: claims.name };
  if (isDevAdminOpen()) return getDevAdminContext();
  return null;
}

export async function isAdminAuthorizedFromRequest(
  request: NextRequest,
): Promise<boolean> {
  return (await getAdminContextFromRequest(request)) !== null;
}

export async function getAdminRoleFromRequest(
  request: NextRequest,
): Promise<AdminRole | null> {
  return (await getAdminContextFromRequest(request))?.role ?? null;
}

export async function isAdministratorFromRequest(
  request: NextRequest,
): Promise<boolean> {
  return (await getAdminRoleFromRequest(request)) === "administrateur";
}
