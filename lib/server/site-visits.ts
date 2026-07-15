import { createHash, randomUUID } from "crypto";

import { getPrisma } from "@/lib/prisma";

export const VISITOR_COOKIE = "amg_vid";
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type VisitStats = {
  todayUnique: number;
  todayViews: number;
  weekUnique: number;
  weekViews: number;
};

function hashVisitorId(visitorId: string): string {
  return createHash("sha256").update(visitorId).digest("hex").slice(0, 32);
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function ensureVisitorId(existing: string | undefined): string {
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
  return randomUUID();
}

/** Enregistre une page vue. Dégrade silencieusement si DB indisponible. */
export async function recordSiteVisit(visitorId: string): Promise<void> {
  try {
    const prisma = getPrisma();
    const day = dayKey();
    const visitorHash = hashVisitorId(visitorId);
    const now = new Date();

    await prisma.siteVisitorDay.upsert({
      where: { day_visitorHash: { day, visitorHash } },
      create: {
        id: randomUUID(),
        day,
        visitorHash,
        pageViews: 1,
        firstSeenAt: now,
        lastSeenAt: now,
      },
      update: {
        pageViews: { increment: 1 },
        lastSeenAt: now,
      },
    });
  } catch (err) {
    console.error("[site-visits] record failed", err);
  }
}

function lastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push(dayKey(d));
  }
  return days;
}

export async function getVisitStats(): Promise<VisitStats> {
  const empty: VisitStats = {
    todayUnique: 0,
    todayViews: 0,
    weekUnique: 0,
    weekViews: 0,
  };

  try {
    const prisma = getPrisma();
    const today = dayKey();
    const weekDays = lastNDays(7);

    const [todayRows, weekRows] = await Promise.all([
      prisma.siteVisitorDay.findMany({ where: { day: today } }),
      prisma.siteVisitorDay.findMany({ where: { day: { in: weekDays } } }),
    ]);

    return {
      todayUnique: todayRows.length,
      todayViews: todayRows.reduce((acc, r) => acc + r.pageViews, 0),
      weekUnique: weekRows.length,
      weekViews: weekRows.reduce((acc, r) => acc + r.pageViews, 0),
    };
  } catch (err) {
    console.error("[site-visits] stats failed", err);
    return empty;
  }
}
