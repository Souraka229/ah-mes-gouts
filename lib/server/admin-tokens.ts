import type { AdminRole } from "@/lib/admin/types";

export type AdminTokenEntry = {
  id: string;
  token: string;
  role: AdminRole;
  name: string;
  /** ISO — si dépassé, le token est refusé */
  expiresAt?: string;
  /** ISO — révocation individuelle sans toucher aux autres */
  revokedAt?: string;
};

export function parseAdminAccessTokens(): AdminTokenEntry[] {
  const raw = process.env.ADMIN_ACCESS_TOKENS;
  if (!raw?.trim()) return [];

  try {
    const parsed = JSON.parse(raw) as AdminTokenEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry) =>
        typeof entry.token === "string" &&
        entry.token.length >= 16 &&
        (entry.role === "administrateur" || entry.role === "employe") &&
        typeof entry.name === "string" &&
        entry.name.trim().length > 0,
    );
  } catch {
    return [];
  }
}

function isTokenUsable(entry: AdminTokenEntry, now = new Date()): boolean {
  if (entry.revokedAt) {
    const revoked = new Date(entry.revokedAt);
    if (!Number.isNaN(revoked.getTime()) && revoked.getTime() <= now.getTime()) {
      return false;
    }
  }
  if (entry.expiresAt) {
    const expires = new Date(entry.expiresAt);
    if (!Number.isNaN(expires.getTime()) && expires.getTime() <= now.getTime()) {
      return false;
    }
  }
  return true;
}

export function findAdminTokenEntry(
  token: string | undefined,
): AdminTokenEntry | undefined {
  if (!token?.trim()) return undefined;
  const entry = parseAdminAccessTokens().find((e) => e.token === token);
  if (!entry || !isTokenUsable(entry)) return undefined;
  return entry;
}
