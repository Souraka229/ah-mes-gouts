import type { AdminRole } from "@/lib/admin-assistant/types";

export type AdminTokenEntry = {
  id: string;
  token: string;
  role: AdminRole;
  name: string;
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

export function findAdminTokenEntry(
  token: string | undefined,
): AdminTokenEntry | undefined {
  if (!token?.trim()) return undefined;
  return parseAdminAccessTokens().find((entry) => entry.token === token);
}
