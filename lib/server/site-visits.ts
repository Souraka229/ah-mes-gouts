import { createHash, randomUUID } from "crypto";

import { addShopDays, getShopDateKey } from "@/lib/business-date";
import { getPrisma } from "@/lib/prisma";

export const VISITOR_COOKIE = "amg_vid";
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type VisitStats = {
  todayUnique: number;
  todayViews: number;
  weekUnique: number;
  weekViews: number;
  /**
   * `false` quand la mesure a échoué.
   *
   * Sans ce drapeau, une panne de base se serait affichée « 0 visiteur » — un
   * chiffre faux présenté comme une mesure. L'appelant peut alors écrire
   * « indisponible » au lieu de « 0 ».
   */
  ok: boolean;
};

function hashVisitorId(visitorId: string): string {
  return createHash("sha256").update(visitorId).digest("hex").slice(0, 32);
}

/**
 * Clé du jour BOUTIQUE.
 *
 * `toISOString()` découpait la journée en UTC : entre 00 h et 01 h à Cotonou,
 * les visites étaient comptées sur la veille.
 */
function dayKey(d = new Date()): string {
  return getShopDateKey(d);
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

/** Les n derniers jours boutique, du plus récent au plus ancien. */
function lastNDays(n: number): string[] {
  const today = dayKey();
  const days: string[] = [];
  for (let i = 0; i < n; i += 1) {
    days.push(addShopDays(today, -i));
  }
  return days;
}

export async function getVisitStats(): Promise<VisitStats> {
  const empty: VisitStats = {
    todayUnique: 0,
    todayViews: 0,
    weekUnique: 0,
    weekViews: 0,
    ok: false,
  };

  try {
    const prisma = getPrisma();
    const today = dayKey();
    const weekDays = lastNDays(7);

    // Agrégats en base : la version précédente chargeait toutes les lignes
    // puis les additionnait en JavaScript.
    const [todayAgg, weekAgg] = await Promise.all([
      prisma.siteVisitorDay.aggregate({
        where: { day: today },
        _count: { _all: true },
        _sum: { pageViews: true },
      }),
      prisma.siteVisitorDay.aggregate({
        where: { day: { in: weekDays } },
        _count: { _all: true },
        _sum: { pageViews: true },
      }),
    ]);

    return {
      todayUnique: todayAgg._count._all,
      todayViews: todayAgg._sum.pageViews ?? 0,
      weekUnique: weekAgg._count._all,
      weekViews: weekAgg._sum.pageViews ?? 0,
      ok: true,
    };
  } catch (err) {
    console.error("[site-visits] stats failed", err);
    return empty;
  }
}
