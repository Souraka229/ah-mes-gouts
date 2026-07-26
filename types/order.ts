export type OrderStatus =
  | "recue"
  | "paiement_confirme"
  | "preparation"
  | "prete"
  | "en_livraison"
  | "livree"
  | "annulee";

export type ReceptionMode = "delivery" | "pickup" | "dinein";

export type PaymentMethod =
  | "mtn_momo"
  | "moov_money"
  | "celtiis_cash"
  | "card";

/** Coordonnées expéditeur / facturation */
export type ClientInfo = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  landmark: string;
  message: string;
};

export type GiftDetails = {
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientLandmark: string;
  giftMessage: string;
  senderVisible: boolean;
};

export type DeliveryZone = {
  id: string;
  code: string;
  name: string;
  price: number;
  areas: string[];
};

export type CheckoutStep = "commande" | "payment";

export type ScheduledSlotSelection = {
  start: string;
  end: string;
  slotKey: string;
};

export type SavedOrder = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  mode: ReceptionMode;
  fulfillmentType?: ReceptionMode;
  zoneId: string | null;
  deliveryZoneId?: string | null;
  zoneName: string | null;
  scheduledSlotStart?: string | null;
  scheduledSlotEnd?: string | null;
  deliveryFee: number;
  client: ClientInfo;
  isGift: boolean;
  gift: GiftDetails | null;
  paymentMethod: PaymentMethod;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    supplements: string[];
    /** Slug catalogue — utilisé côté serveur pour recalculer prix/stock. */
    slug?: string;
  }[];
  subtotal: number;
  total: number;
  paymentReference?: string | null;
  driverId?: string | null;
  driverName?: string | null;
  driverStartedAt?: string | null;
  driverDeliveredAt?: string | null;
};

/** Réponse API publique de suivi — jamais de fuite expéditeur si cadeau anonyme */
export type PublicTrackingOrder = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  mode: ReceptionMode;
  zoneName: string | null;
  scheduledSlotStart?: string | null;
  scheduledSlotEnd?: string | null;
  fulfillmentSummary?: string | null;
  deliveryFee: number;
  isGift: boolean;
  isAnonymousGift: boolean;
  giftMessage: string | null;
  recipientName: string | null;
  client: {
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
  paymentMethod: PaymentMethod;
  items: SavedOrder["items"];
  subtotal: number;
  total: number;
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  recue: "Reçue",
  paiement_confirme: "Paiement confirmé",
  preparation: "Préparation",
  prete: "Prête",
  en_livraison: "En livraison",
  livree: "Livrée",
  annulee: "Annulée",
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "recue",
  "paiement_confirme",
  "preparation",
  "prete",
  "en_livraison",
  "livree",
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  mtn_momo: "MTN MoMo",
  moov_money: "Moov Money",
  celtiis_cash: "Celtiis Cash",
  card: "Carte bancaire",
};

/** Libellés des 3 modes de réception — Sur place ≠ À emporter ≠ Livraison. */
export const RECEPTION_MODE_LABELS: Record<ReceptionMode, string> = {
  delivery: "Livraison",
  pickup: "À emporter",
  dinein: "Sur place",
};

/** Verbe d'action associé à chaque mode (pour titres/CTA). */
export const RECEPTION_MODE_TAGLINES: Record<ReceptionMode, string> = {
  delivery: "Livré à votre adresse",
  pickup: "À récupérer en boutique",
  dinein: "À déguster sur place",
};
