import type { SavedOrder } from "@/types/order";

function slotToday(hour: number, minute: number, durationMin = 30): {
  start: string;
  end: string;
} {
  const start = new Date();
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMin);
  return { start: start.toISOString(), end: end.toISOString() };
}

function slotTomorrow(hour: number, minute: number, durationMin = 30): {
  start: string;
  end: string;
} {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMin);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function buildDemoOrders(): SavedOrder[] {
  const s1 = slotToday(14, 0);
  const s2 = slotToday(16, 30);
  const s3 = slotToday(18, 0);
  const s4 = slotTomorrow(11, 0);
  const s5 = slotToday(15, 0);

  return [
    {
      id: "AMG-DEMO-001",
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      status: "preparation",
      mode: "delivery",
      fulfillmentType: "delivery",
      zoneId: "53105f7d-f259-4bdc-a5fc-6ce0f1890ebc",
      deliveryZoneId: "53105f7d-f259-4bdc-a5fc-6ce0f1890ebc",
      zoneName: "Cadjehoun & Haie Vive",
      scheduledSlotStart: s1.start,
      scheduledSlotEnd: s1.end,
      deliveryFee: 1000,
      client: {
        firstName: "Aïcha",
        lastName: "Mensah",
        phone: "+229 97 00 00 01",
        address: "Rue 704, Haie Vive",
        landmark: "Face à la pharmacie",
        message: "",
      },
      isGift: false,
      gift: null,
      paymentMethod: "mtn_momo",
      items: [
        {
          name: "Mango Passion",
          quantity: 2,
          unitPrice: 5000,
          supplements: ["Chantilly"],
        },
        {
          name: "Carte cadeau",
          quantity: 1,
          unitPrice: 500,
          supplements: [],
        },
      ],
      subtotal: 10500,
      total: 11500,
    },
    {
      id: "AMG-DEMO-002",
      createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
      status: "paiement_confirme",
      mode: "delivery",
      fulfillmentType: "delivery",
      zoneId: "8ce1cf57-7d53-4de4-be58-34afb1c862f9",
      deliveryZoneId: "8ce1cf57-7d53-4de4-be58-34afb1c862f9",
      zoneName: "Fidjrossè & bord de mer",
      scheduledSlotStart: s2.start,
      scheduledSlotEnd: s2.end,
      deliveryFee: 500,
      client: {
        firstName: "Koffi",
        lastName: "Agbessi",
        phone: "+229 96 00 00 02",
        address: "Bord de mer, Fidjrossè",
        landmark: "Immeuble bleu",
        message: "Sonner 2 fois",
      },
      isGift: true,
      gift: {
        recipientName: "Mireille",
        recipientPhone: "+229 95 00 00 03",
        recipientAddress: "Godomey",
        recipientLandmark: "",
        giftMessage: "Joyeux anniversaire ma douce !",
        senderVisible: true,
      },
      paymentMethod: "moov_money",
      items: [
        {
          name: "Vanilla Caramel",
          quantity: 1,
          unitPrice: 4500,
          supplements: [],
        },
        {
          name: "Nounours beige",
          quantity: 1,
          unitPrice: 10000,
          supplements: [],
        },
      ],
      subtotal: 8000,
      total: 8500,
    },
    {
      id: "AMG-DEMO-003",
      createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
      status: "prete",
      mode: "pickup",
      fulfillmentType: "pickup",
      zoneId: null,
      deliveryZoneId: null,
      zoneName: null,
      scheduledSlotStart: s3.start,
      scheduledSlotEnd: s3.end,
      deliveryFee: 0,
      client: {
        firstName: "Fatou",
        lastName: "Diallo",
        phone: "+229 94 00 00 04",
        address: "",
        landmark: "",
        message: "",
      },
      isGift: false,
      gift: null,
      paymentMethod: "celtiis_cash",
      items: [
        {
          name: "Goyave Vanille",
          quantity: 3,
          unitPrice: 5000,
          supplements: ["Coulis passion"],
        },
      ],
      subtotal: 15000,
      total: 15000,
    },
    {
      id: "AMG-DEMO-004",
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
      status: "recue",
      mode: "delivery",
      fulfillmentType: "delivery",
      zoneId: "4f6a47c6-84a3-449f-b29b-c73a8ac81750",
      deliveryZoneId: "4f6a47c6-84a3-449f-b29b-c73a8ac81750",
      zoneName: "Guinkomey & Tokpa",
      scheduledSlotStart: s5.start,
      scheduledSlotEnd: s5.end,
      deliveryFee: 800,
      client: {
        firstName: "Yves",
        lastName: "Houenou",
        phone: "+229 93 00 00 05",
        address: "Tokpa, Cotonou",
        landmark: "Près du marché",
        message: "",
      },
      isGift: false,
      gift: null,
      paymentMethod: "mtn_momo",
      items: [
        {
          name: "Mousse Chocolat",
          quantity: 2,
          unitPrice: 2500,
          supplements: [],
        },
        {
          name: "Bouquet de roses",
          quantity: 1,
          unitPrice: 8000,
          supplements: [],
        },
      ],
      subtotal: 13000,
      total: 13800,
    },
    {
      id: "AMG-DEMO-005",
      createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      status: "livree",
      mode: "delivery",
      fulfillmentType: "delivery",
      zoneId: "e9d6071a-c473-405e-9ef4-0294ffbb293a",
      deliveryZoneId: "e9d6071a-c473-405e-9ef4-0294ffbb293a",
      zoneName: "Abomey-Calavi & périphérie",
      scheduledSlotStart: s4.start,
      scheduledSlotEnd: s4.end,
      deliveryFee: 1500,
      client: {
        firstName: "Chloé",
        lastName: "Boco",
        phone: "+229 92 00 00 06",
        address: "Calavi centre",
        landmark: "",
        message: "",
      },
      isGift: false,
      gift: null,
      paymentMethod: "card",
      items: [
        {
          name: "Forêt Blanche",
          quantity: 1,
          unitPrice: 4200,
          supplements: [],
        },
      ],
      subtotal: 4200,
      total: 5700,
    },
    {
      id: "AMG-DEMO-006",
      createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
      status: "en_livraison",
      mode: "delivery",
      fulfillmentType: "delivery",
      zoneId: "020e8077-80e9-47fa-9e4a-1721ff22c162",
      deliveryZoneId: "020e8077-80e9-47fa-9e4a-1721ff22c162",
      zoneName: "Agla & Godomey",
      scheduledSlotStart: s2.start,
      scheduledSlotEnd: s2.end,
      deliveryFee: 700,
      client: {
        firstName: "Marc",
        lastName: "Sènou",
        phone: "+229 91 00 00 07",
        address: "Godomey",
        landmark: "Station Total",
        message: "",
      },
      isGift: false,
      gift: null,
      paymentMethod: "mtn_momo",
      items: [
        {
          name: "Caramel Cappuccino",
          quantity: 1,
          unitPrice: 5000,
          supplements: ["Speculoos"],
        },
      ],
      subtotal: 5000,
      total: 5700,
    },
  ];
}
