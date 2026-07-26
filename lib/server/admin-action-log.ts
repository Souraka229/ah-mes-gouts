import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";

import { getPrisma } from "@/lib/prisma";

export type AdminActionSource = "manual" | "ai_assistant" | "driver";

export type AdminActionLogEntry = {
  id: string;
  createdAt: string;
  adminName: string;
  source: AdminActionSource;
  action: string;
  summary: string;
  details?: Record<string, unknown>;
};

declare global {
  var __amgAdminActionLog: AdminActionLogEntry[] | undefined;
}

const MAX_ENTRIES = 200;

function toEntry(row: {
  id: string;
  createdAt: Date;
  adminName: string;
  source: string;
  action: string;
  summary: string;
  details: Prisma.JsonValue;
}): AdminActionLogEntry {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    adminName: row.adminName,
    source: row.source as AdminActionSource,
    action: row.action,
    summary: row.summary,
    details:
      row.details && typeof row.details === "object" && !Array.isArray(row.details)
        ? (row.details as Record<string, unknown>)
        : undefined,
  };
}

export async function getAdminActionLog(): Promise<AdminActionLogEntry[]> {
  if (globalThis.__amgAdminActionLog) {
    return globalThis.__amgAdminActionLog;
  }

  const prisma = getPrisma();
  const rows = await prisma.adminActionLog.findMany({
    orderBy: { createdAt: "desc" },
    take: MAX_ENTRIES,
  });
  const log = rows.map(toEntry);
  globalThis.__amgAdminActionLog = log;
  return log;
}

export async function appendAdminActionLog(
  entry: Omit<AdminActionLogEntry, "id" | "createdAt">,
): Promise<AdminActionLogEntry> {
  const full: AdminActionLogEntry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  };

  const prisma = getPrisma();
  await prisma.adminActionLog.create({
    data: {
      id: full.id,
      createdAt: new Date(full.createdAt),
      adminName: full.adminName,
      source: full.source,
      action: full.action,
      summary: full.summary,
      details: full.details as Prisma.InputJsonValue | undefined,
    },
  });

  const log = await getAdminActionLog();
  const next = [full, ...log.filter((e) => e.id !== full.id)].slice(0, MAX_ENTRIES);
  globalThis.__amgAdminActionLog = next;
  return full;
}
