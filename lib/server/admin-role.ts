import type { AdminRole } from "@/lib/admin-assistant/types";
import type { NextRequest } from "next/server";

import {
  getAdminContextAsync,
  getAdminContextFromRequest,
  isAdminAuthorized,
} from "@/lib/server/admin-auth";

export async function getAdminRoleAsync(): Promise<AdminRole | null> {
  const context = await getAdminContextAsync();
  return context?.role ?? null;
}

export function getAdminRoleFromRequest(
  request: NextRequest,
): AdminRole | null {
  const context = getAdminContextFromRequest(request);
  return context?.role ?? null;
}

export async function isAdministratorAsync(): Promise<boolean> {
  return (await getAdminRoleAsync()) === "administrateur";
}

export function isAdministratorFromRequest(request: NextRequest): boolean {
  return getAdminRoleFromRequest(request) === "administrateur";
}

export async function getAdminDisplayNameAsync(): Promise<string> {
  const context = await getAdminContextAsync();
  return context?.name ?? "Administrateur";
}

/** Compat dev local — ne pas utiliser pour l'auth token. */
export function getAdminRole(): AdminRole | null {
  if (!isAdminAuthorized()) return null;
  return process.env.ADMIN_DEV_ROLE === "employe" ? "employe" : "administrateur";
}

/** Compat dev local — ne pas utiliser pour l'auth token. */
export function isAdministrator(): boolean {
  return getAdminRole() === "administrateur";
}

/** Compat dev local — ne pas utiliser pour l'auth token. */
export function getAdminDisplayName(): string {
  return process.env.ADMIN_DEV_NAME ?? "Administrateur";
}
