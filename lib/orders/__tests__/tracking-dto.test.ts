import { describe, expect, it } from "vitest";

import { toPublicTrackingOrder } from "@/lib/orders/tracking-dto";
import type { SavedOrder } from "@/types/order";

const baseOrder: SavedOrder = {
  id: "GE-ABCDEFGHJK",
  createdAt: "2026-08-12T10:00:00.000Z",
  status: "paiement_confirme",
  mode: "delivery",
  fulfillmentType: "delivery",
  zoneId: "fidjrosse",
  deliveryZoneId: "fidjrosse",
  zoneName: "Fidjrosse",
  scheduledSlotStart: "2026-08-12T15:00:00.000Z",
  scheduledSlotEnd: "2026-08-12T15:30:00.000Z",
  deliveryFee: 1000,
  client: {
    firstName: "Amina",
    lastName: "Dossou",
    phone: "+22997000111",
    address: "Rue 12, Fidjrosse",
    landmark: "Face pharmacie",
    message: "",
  },
  isGift: false,
  gift: null,
  paymentMethod: "mtn_momo",
  items: [
    { name: "Tiramisu", quantity: 1, unitPrice: 5000, supplements: [] },
  ],
  subtotal: 5000,
  total: 6000,
  trackingToken: "SECRET-TOKEN-NE-DOIT-PAS-FUIR",
};

describe("toPublicTrackingOrder", () => {
  it("ne renvoie jamais le jeton de suivi", () => {
    const dto = toPublicTrackingOrder(baseOrder);
    expect(JSON.stringify(dto)).not.toContain("SECRET-TOKEN-NE-DOIT-PAS-FUIR");
  });

  it("ne renvoie jamais l'adresse exacte — seulement la zone", () => {
    const dto = toPublicTrackingOrder(baseOrder);
    const serialized = JSON.stringify(dto);
    expect(serialized).not.toContain("Rue 12");
    expect(serialized).not.toContain("Face pharmacie");
    expect(dto.zoneName).toBe("Fidjrosse");
  });

  it("masque le téléphone en ne laissant que les 4 derniers chiffres", () => {
    const dto = toPublicTrackingOrder(baseOrder);
    expect(dto.client?.phone).toBe("••• •• •• 0111");
    expect(JSON.stringify(dto)).not.toContain("+22997000111");
  });

  it("réduit le nom de famille à une initiale", () => {
    const dto = toPublicTrackingOrder(baseOrder);
    expect(dto.client?.lastName).toBe("D.");
    expect(JSON.stringify(dto)).not.toContain("Dossou");
  });

  it("efface totalement l'expéditeur sur un cadeau anonyme", () => {
    // C'est la promesse produit : la destinataire ne doit jamais pouvoir
    // remonter à l'expéditeur.
    const dto = toPublicTrackingOrder({
      ...baseOrder,
      isGift: true,
      gift: {
        recipientName: "Chloé",
        recipientPhone: "+22997000222",
        recipientAddress: "Haie Vive",
        recipientLandmark: "",
        giftMessage: "Joyeux anniversaire",
        senderVisible: false,
      },
    });

    expect(dto.isAnonymousGift).toBe(true);
    expect(dto.client).toBeNull();

    const serialized = JSON.stringify(dto);
    expect(serialized).not.toContain("Amina");
    expect(serialized).not.toContain("Dossou");
    expect(serialized).not.toContain("22997000111");
  });

  it("conserve l'expéditeur sur un cadeau signé", () => {
    const dto = toPublicTrackingOrder({
      ...baseOrder,
      isGift: true,
      gift: {
        recipientName: "Chloé",
        recipientPhone: "+22997000222",
        recipientAddress: "Haie Vive",
        recipientLandmark: "",
        giftMessage: "Joyeux anniversaire",
        senderVisible: true,
      },
    });

    expect(dto.isAnonymousGift).toBe(false);
    expect(dto.client?.firstName).toBe("Amina");
  });
});
