import { formatPrice } from "@/lib/format";
import type { ReceptionMode } from "@/types/order";

/**
 * Alertes opérationnelles — destinées à l'équipe boutique, jamais à la cliente.
 *
 * Cette couche est volontairement indépendante du canal de diffusion. Telegram
 * a été retiré ; le canal cible est la notification push (Web Push), pas encore
 * branchée. En attendant, les alertes partent dans les logs serveur, où elles
 * restent consultables depuis Vercel.
 *
 * Pour brancher Web Push, il suffira d'ajouter un transport dans `TRANSPORTS` :
 * aucun site d'appel n'a à changer.
 */

export type OpsAlertKind =
  | "new_order"
  | "payment_recovered"
  | "payment_stuck"
  | "delivery_wave_full"
  | "security"
  | "stock_low"
  | "daily_summary";

export type OpsAlert = {
  kind: OpsAlertKind;
  /** Ligne unique lisible telle quelle dans une notification. */
  title: string;
  /** Détail optionnel — corps de la notification. */
  body?: string;
  /** Cible à ouvrir au clic sur la notification (chemin interne). */
  url?: string;
  /** Données structurées, utiles au débogage et aux futurs transports. */
  data?: Record<string, unknown>;
};

type OpsTransport = (alert: OpsAlert) => void | Promise<void>;

/**
 * Transport par défaut : log structuré. Une alerte n'est jamais silencieuse,
 * même sans canal configuré.
 */
const logTransport: OpsTransport = (alert) => {
  console.warn(
    `[ops:${alert.kind}] ${alert.title}${alert.body ? ` — ${alert.body}` : ""}`,
    alert.data ?? {},
  );
};

/**
 * Transports actifs. Ajouter ici le transport Web Push une fois les clés VAPID
 * et les abonnements en place — voir docs/notifications-push.md.
 */
const TRANSPORTS: OpsTransport[] = [logTransport];

/**
 * Envoie une alerte à l'équipe. Ne bloque jamais l'appelant et n'échoue jamais :
 * une notification ratée ne doit pas faire échouer une commande ou un paiement.
 */
export function notifyOps(alert: OpsAlert): void {
  for (const transport of TRANSPORTS) {
    try {
      void Promise.resolve(transport(alert)).catch((error) => {
        console.error("[ops] transport en échec:", error);
      });
    } catch (error) {
      console.error("[ops] transport en échec:", error);
    }
  }
}

// ─── Constructeurs d'alertes ────────────────────────────────────────────────

const MODE_LABELS: Record<ReceptionMode, string> = {
  delivery: "Livraison",
  pickup: "Retrait",
  dinein: "Sur place",
};

export function alertNewOrder(input: {
  orderId: string;
  total: number;
  mode: ReceptionMode;
  clientName: string;
}): OpsAlert {
  return {
    kind: "new_order",
    title: `Nouvelle commande — ${formatPrice(input.total)}`,
    body: `${MODE_LABELS[input.mode]} · ${input.clientName || "Client"} · ${input.orderId}`,
    url: "/admin/commandes",
    data: input,
  };
}

export function alertSecurity(detail: string): OpsAlert {
  return {
    kind: "security",
    title: "Alerte sécurité",
    body: detail,
    url: "/admin/parametres/journal",
  };
}

export function alertPaymentRecovered(input: {
  orderId: string;
  amount: number;
}): OpsAlert {
  return {
    kind: "payment_recovered",
    title: `Paiement rattrapé — ${formatPrice(input.amount)}`,
    body: `Commande ${input.orderId} confirmée par réconciliation, pas par le webhook. À préparer.`,
    url: "/admin/commandes",
    data: input,
  };
}

export function alertPaymentStuck(count: number): OpsAlert {
  return {
    kind: "payment_stuck",
    title: `${count} paiement(s) sans réponse depuis 2 h`,
    body: "À vérifier sur le tableau de bord FeexPay.",
    url: "/admin/commandes",
    data: { count },
  };
}

export function alertDeliveryWaveFull(input: {
  capacity: number;
  dayLabel: string;
  slotLabel: string;
}): OpsAlert {
  return {
    kind: "delivery_wave_full",
    title: `Vague de livraison complète — ${input.capacity} commandes`,
    body: `${input.dayLabel}, entre ${input.slotLabel}. La tournée peut être constituée et assignée.`,
    url: "/admin/commandes",
    data: input,
  };
}

export function alertStockLow(input: {
  productName: string;
  remaining: number;
}): OpsAlert {
  return {
    kind: "stock_low",
    title: `Stock bas — ${input.productName}`,
    body: `${input.remaining} restant(s).`,
    url: "/admin/produits",
    data: input,
  };
}

export function alertDailySummary(input: {
  orders: number;
  revenue: number;
  dayLabel: string;
}): OpsAlert {
  return {
    kind: "daily_summary",
    title: `Journée du ${input.dayLabel}`,
    body: `${input.orders} commande(s) · ${formatPrice(input.revenue)}`,
    url: "/admin",
    data: input,
  };
}
