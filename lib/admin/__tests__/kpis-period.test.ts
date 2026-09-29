import { describe, expect, it } from "vitest";

import { buildAdminKpis } from "@/lib/admin/kpis";
import { shopDateTimeToUtc } from "@/lib/business-date";
import type { OrderStatus, SavedOrder } from "@/types/order";

/**
 * Ces tests verrouillent deux corrections de calcul qui rendaient les KPI du
 * cockpit faux, et qui étaient invisibles à l'œil parce qu'ils affichaient un
 * chiffre plausible.
 */

/** Instant UTC correspondant à une heure locale Cotonou (UTC+1). */
function at(dateKey: string, timeHHmm: string): Date {
  return shopDateTimeToUtc(dateKey, timeHHmm);
}

function order(
  id: string,
  status: OrderStatus,
  total: number,
  scheduledSlotStart: Date,
  createdAt: Date = scheduledSlotStart,
  extra: Partial<SavedOrder> = {},
): SavedOrder {
  return {
    id,
    createdAt: createdAt.toISOString(),
    status,
    mode: "delivery",
    fulfillmentType: "delivery",
    zoneId: null,
    zoneName: null,
    scheduledSlotStart: scheduledSlotStart.toISOString(),
    deliveryFee: 0,
    client: { name: "Client", phone: "+2290197310742" },
    isGift: false,
    gift: null,
    paymentMethod: "mtn_momo",
    items: [{ name: "Entremets", quantity: 1, unitPrice: total, supplements: [] }],
    total,
    ...extra,
  } as unknown as SavedOrder;
}

describe("KPI — une commande due aujourd'hui compte, même pour un créneau à venir", () => {
  it("inclut dans le CA une commande payée à 10 h pour un créneau à 18 h", () => {
    const now = at("2026-09-28", "10:00");
    const orders = [
      order("o1", "paiement_confirme", 15_000, at("2026-09-28", "18:00")),
    ];

    const kpis = buildAdminKpis(orders, { now, period: "today" });

    // Avant correction, la borne haute valait `now` : cette commande disparaissait
    // du CA et des compteurs alors que le Kanban l'affichait.
    expect(kpis.ordersToday).toBe(1);
    expect(kpis.revenueToday).toBe(15_000);
    expect(kpis.nouvelles).toBe(1);
  });

  it("compte une commande de fin de soirée dans la bonne journée boutique", () => {
    // 22 h 30 à Cotonou = 21 h 30 UTC : même journée des deux côtés.
    const now = at("2026-09-28", "23:00");
    const orders = [
      order("late", "paiement_confirme", 9_000, at("2026-09-28", "22:30")),
    ];

    const kpis = buildAdminKpis(orders, { now, period: "today" });

    expect(kpis.revenueToday).toBe(9_000);
  });

  it("rattache à la journée boutique la commande passée après minuit local", () => {
    // 00 h 30 à Cotonou le 28 = 23 h 30 UTC le 27. Le jour boutique reste le 28.
    const now = at("2026-09-28", "09:00");
    const orders = [
      order("midnight", "paiement_confirme", 7_000, at("2026-09-28", "00:30")),
    ];

    const kpis = buildAdminKpis(orders, { now, period: "today" });

    expect(kpis.revenueToday).toBe(7_000);
  });

  it("exclut toujours les commandes dont le paiement n'est pas confirmé", () => {
    const now = at("2026-09-28", "10:00");
    const orders = [
      order("unpaid", "recue", 99_000, at("2026-09-28", "18:00")),
      order("paid", "paiement_confirme", 5_000, at("2026-09-28", "18:00")),
    ];

    const kpis = buildAdminKpis(orders, { now, period: "today" });

    expect(kpis.revenueToday).toBe(5_000);
    expect(kpis.ordersToday).toBe(1);
  });
});

describe("KPI — « vs hier » compare la même portion de journée", () => {
  it("ne compare pas une journée en cours à une journée complète", () => {
    // Il est 10 h. Aujourd'hui : 1 commande (10 000 F).
    // Hier : 3 commandes — une avant 10 h (4 000 F), deux après (30 000 F).
    const now = at("2026-09-28", "10:00");
    const orders = [
      order("today-1", "paiement_confirme", 10_000, at("2026-09-28", "12:00")),
      order("y-early", "paiement_confirme", 4_000, at("2026-09-27", "09:00")),
      order("y-late1", "paiement_confirme", 20_000, at("2026-09-27", "15:00")),
      order("y-late2", "paiement_confirme", 10_000, at("2026-09-27", "19:00")),
    ];

    const kpis = buildAdminKpis(orders, { now, period: "today" });

    // Avant correction, on comparait 10 000 F à 34 000 F (journée complète),
    // ce qui affichait une chute de −24 000 F dès le matin.
    expect(kpis.comparedToYesterday.revenueDelta).toBe(10_000 - 4_000);
    expect(kpis.comparedToYesterday.ordersDelta).toBe(1 - 1);
  });

  it("affiche un delta positif quand la journée est effectivement en avance", () => {
    const now = at("2026-09-28", "10:00");
    const orders = [
      order("t1", "paiement_confirme", 8_000, at("2026-09-28", "11:00")),
      order("t2", "paiement_confirme", 8_000, at("2026-09-28", "12:00")),
      order("y1", "paiement_confirme", 5_000, at("2026-09-27", "09:30")),
    ];

    const kpis = buildAdminKpis(orders, { now, period: "today" });

    expect(kpis.comparedToYesterday.revenueDelta).toBe(11_000);
    expect(kpis.comparedToYesterday.ordersDelta).toBe(1);
  });
});

describe("KPI — libellé de date dans le fuseau boutique", () => {
  it("affiche la bonne date juste après minuit à Cotonou", () => {
    // 23 h 30 UTC le 27 = 00 h 30 le 28 à Cotonou.
    const now = at("2026-09-28", "00:30");
    const kpis = buildAdminKpis([], { now, period: "today" });

    // Sans `timeZone`, le serveur en UTC aurait affiché « dimanche 27 septembre ».
    expect(kpis.dateLabel).toContain("28");
    expect(kpis.dateLabel).toContain("septembre");
  });
});

describe("KPI — moyennes et partage ne divisent jamais par zéro", () => {
  it("renvoie un panier moyen inconnu (null), pas 0 F, quand rien n'est vendu", () => {
    const now = at("2026-09-28", "10:00");
    const kpis = buildAdminKpis([], { now, period: "today" });

    // « 0 F » laisserait croire à des ventes à zéro franc ; sans commande, la
    // valeur est inconnue.
    expect(kpis.avgTicket).toBeNull();
    expect(Number.isNaN(kpis.boutiqueShare)).toBe(false);
    expect(Number.isNaN(kpis.giftShare)).toBe(false);
  });

  it("calcule un panier moyen dès qu'une commande active existe", () => {
    const now = at("2026-09-28", "10:00");
    const orders = [
      order("a", "paiement_confirme", 10_000, at("2026-09-28", "12:00")),
      order("b", "preparation", 20_000, at("2026-09-28", "13:00")),
    ];

    const kpis = buildAdminKpis(orders, { now, period: "today" });

    expect(kpis.avgTicket).toBe(15_000);
  });
});
