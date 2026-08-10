import type { OrderStatus, SavedOrder } from "@/types/order";
import type { Product } from "@/types/product";

export type AdminAlertTone = "urgent" | "action" | "info";

export type AdminAlert = {
  id: string;
  tone: AdminAlertTone;
  title: string;
  detail: string;
  href: string;
};

export type AdminKpiPeriod = "today" | "week" | "month" | "all";

export const KPI_PERIOD_LABELS: Record<AdminKpiPeriod, string> = {
  today: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois-ci",
  all: "Depuis la création",
};

export type AdminKpis = {
  dateLabel: string;
  /** Libellé de comparaison ("vs hier", "vs semaine dernière"…) — null si pas de comparaison (période "all"). */
  comparisonLabel: string | null;
  ordersToday: number;
  revenueToday: number;
  avgTicket: number;
  nouvelles: number;
  preparation: number;
  pretes: number;
  enCours: number;
  livrees: number;
  annulees: number;
  boutiqueShare: number;
  giftShare: number;
  attentionCount: number;
  comparedToYesterday: {
    ordersDelta: number;
    revenueDelta: number;
  };
  recentOrders: SavedOrder[];
  alerts: AdminAlert[];
  pipeline: {
    status: OrderStatus;
    label: string;
    count: number;
    tone: string;
    href: string;
  }[];
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Lundi 00:00 de la semaine de d (ISO — lundi = premier jour). */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 = dimanche
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  return x;
}

function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function inRange(
  iso: string | null | undefined,
  start: Date,
  end: Date,
): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

/** Bornes [début, fin[ de la période sélectionnée + [début, fin[ de la période précédente équivalente. */
function getPeriodRange(
  period: AdminKpiPeriod,
  now: Date,
): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const end = new Date(now.getTime() + 1);

  if (period === "week") {
    const start = startOfWeek(now);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 7);
    return { start, end, prevStart, prevEnd: start };
  }
  if (period === "month") {
    const start = startOfMonth(now);
    const prevStart = new Date(start);
    prevStart.setMonth(prevStart.getMonth() - 1);
    return { start, end, prevStart, prevEnd: start };
  }
  if (period === "all") {
    const start = new Date(0);
    return { start, end, prevStart: new Date(0), prevEnd: new Date(0) };
  }

  // "today" (défaut)
  const start = startOfDay(now);
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - 1);
  return { start, end, prevStart, prevEnd: start };
}

function sumTotals(orders: SavedOrder[]): number {
  return orders.reduce((acc, o) => acc + o.total, 0);
}

function countStatus(orders: SavedOrder[], statuses: OrderStatus[]): number {
  return orders.filter((o) => statuses.includes(o.status)).length;
}

function minutesSince(iso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
}

/** Seuil : commande en prépa trop longtemps (minutes). */
const PREP_STALE_MINUTES = 45;
/** Seuil : paiement / réception sans avance (minutes). */
const NEW_STALE_MINUTES = 20;

export type BuildAdminKpisOptions = {
  menuProducts?: Product[];
  now?: Date;
  /** Fenêtre analysée — défaut "today". */
  period?: AdminKpiPeriod;
};

const COMPARISON_LABELS: Record<AdminKpiPeriod, string | null> = {
  today: "vs hier",
  week: "vs semaine dernière",
  month: "vs mois dernier",
  all: null,
};

/** KPIs + alertes de la période sélectionnée — logique hors UI. */
export function buildAdminKpis(
  orders: SavedOrder[],
  options: BuildAdminKpisOptions = {},
): AdminKpis {
  const now = options.now ?? new Date();
  const period = options.period ?? "today";
  const { start, end, prevStart, prevEnd } = getPeriodRange(period, now);

  // "recue" = paiement pas confirmé (en cours ou échoué) — exclu de tout, dès la source.
  // Règle : si le paiement ne passe pas, la commande ne doit ni compter ni remonter.
  const ordersToday = orders.filter(
    (o) =>
      o.status !== "recue" &&
      inRange(o.scheduledSlotStart ?? o.createdAt, start, end),
  );
  const ordersYesterday = orders.filter(
    (o) =>
      o.status !== "recue" &&
      inRange(o.scheduledSlotStart ?? o.createdAt, prevStart, prevEnd),
  );

  const activeToday = ordersToday.filter((o) => o.status !== "annulee");
  const revenueToday = sumTotals(activeToday);
  const revenueYesterday = sumTotals(
    ordersYesterday.filter((o) => o.status !== "annulee"),
  );

  const nouvelles = countStatus(ordersToday, ["paiement_confirme"]);
  const preparation = countStatus(ordersToday, ["preparation"]);
  const pretes = countStatus(ordersToday, ["prete"]);
  const enCours = countStatus(ordersToday, ["en_livraison"]);
  const livrees = countStatus(ordersToday, ["livree"]);
  const annulees = countStatus(ordersToday, ["annulee"]);

  const boutiqueCount = ordersToday.filter(
    (o) => (o.fulfillmentType ?? o.mode) !== "delivery",
  ).length;
  const giftCount = ordersToday.filter((o) => o.isGift).length;
  const totalForShare = ordersToday.length || 1;

  const alerts: AdminAlert[] = [];

  if (nouvelles > 0) {
    alerts.push({
      id: "nouvelles",
      tone: "action",
      title: `${nouvelles} commande${nouvelles > 1 ? "s" : ""} à traiter`,
      detail: "Nouvelles / paiement confirmé — avance le statut.",
      href: "/admin/commandes?tab=nouvelles",
    });
  }

  const staleNew = ordersToday.filter(
    (o) =>
      o.status === "paiement_confirme" &&
      minutesSince(o.createdAt, now) >= NEW_STALE_MINUTES,
  );
  if (staleNew.length > 0) {
    alerts.push({
      id: "stale-new",
      tone: "urgent",
      title: `${staleNew.length} en attente depuis +${NEW_STALE_MINUTES} min`,
      detail: "Paiement ou prise en charge trop longue.",
      href: "/admin/commandes?tab=nouvelles",
    });
  }

  const stalePrep = ordersToday.filter(
    (o) =>
      o.status === "preparation" &&
      minutesSince(o.createdAt, now) >= PREP_STALE_MINUTES,
  );
  if (stalePrep.length > 0) {
    alerts.push({
      id: "stale-prep",
      tone: "urgent",
      title: `${stalePrep.length} en préparation trop longue`,
      detail: `Dépassé ${PREP_STALE_MINUTES} min — vérifier le fournil.`,
      href: "/admin/commandes?tab=preparation",
    });
  }

  if (pretes > 0) {
    alerts.push({
      id: "pretes",
      tone: "action",
      title: `${pretes} prête${pretes > 1 ? "s" : ""} à sortir`,
      detail: "Remise client ou départ livreur.",
      href: "/admin/commandes?tab=livraison",
    });
  }

  const lowStock = (options.menuProducts ?? []).filter(
    (p) => p.stockRemaining > 0 && p.stockRemaining <= p.stockMinimum,
  );
  if (lowStock.length > 0) {
    const names = lowStock
      .slice(0, 2)
      .map((p) => p.name)
      .join(", ");
    alerts.push({
      id: "low-stock",
      tone: "info",
      title: `Stock bas — menu du jour`,
      detail:
        lowStock.length === 1
          ? `${names} sous le minimum.`
          : `${names} (+${lowStock.length - 2 > 0 ? lowStock.length - 2 : 0})`,
      href: "/admin/menus",
    });
  }

  const exhausted = (options.menuProducts ?? []).filter(
    (p) => p.stockRemaining <= 0,
  );
  if (exhausted.length > 0) {
    alerts.push({
      id: "exhausted",
      tone: "urgent",
      title: `${exhausted.length} produit${exhausted.length > 1 ? "s" : ""} épuisé${exhausted.length > 1 ? "s" : ""}`,
      detail: "Retirer du menu (86) pour éviter les commandes impossibles.",
      href: "/admin/menus",
    });
  }

  return {
    dateLabel:
      period === "today"
        ? now.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })
        : KPI_PERIOD_LABELS[period],
    comparisonLabel: COMPARISON_LABELS[period],
    ordersToday: ordersToday.length,
    revenueToday,
    avgTicket:
      activeToday.length > 0
        ? Math.round(revenueToday / activeToday.length)
        : 0,
    nouvelles,
    preparation,
    pretes,
    enCours,
    livrees,
    annulees,
    boutiqueShare: Math.round((boutiqueCount / totalForShare) * 100),
    giftShare: Math.round((giftCount / totalForShare) * 100),
    attentionCount: alerts.filter((a) => a.tone !== "info").length,
    comparedToYesterday: {
      ordersDelta: ordersToday.length - ordersYesterday.length,
      revenueDelta: revenueToday - revenueYesterday,
    },
    recentOrders: ordersToday.slice(0, 8),
    alerts,
    pipeline: [
      {
        status: "paiement_confirme",
        label: "Nouvelles",
        count: nouvelles,
        tone: "bg-primary text-primary-foreground",
        href: "/admin/commandes?tab=nouvelles",
      },
      {
        status: "preparation",
        label: "Préparation",
        count: preparation,
        tone: "bg-ops text-white",
        href: "/admin/commandes?tab=preparation",
      },
      {
        status: "prete",
        label: "Prêtes",
        count: pretes,
        tone: "bg-accent text-accent-foreground",
        href: "/admin/commandes?tab=livraison",
      },
      {
        status: "en_livraison",
        label: "En cours",
        count: enCours,
        tone: "bg-ops/15 text-ops",
        href: "/admin/commandes?tab=livraison",
      },
      {
        status: "livree",
        label: "Terminées",
        count: livrees,
        tone: "bg-success/20 text-success",
        href: "/admin/commandes?tab=livraison",
      },
    ],
  };
}
