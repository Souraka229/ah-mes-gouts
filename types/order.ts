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

/**
 * Un lieu livré et **son** tarif.
 *
 * Le prix vit ici, pas sur la zone : la grille réelle mélange les tarifs au
 * sein d'un même palier, et « Hors Cotonou » va de 2 000 à 4 000 F.
 */
export type DeliveryAreaOption = {
  name: string;
  price: number;
};

export type DeliveryZone = {
  id: string;
  code: string;
  name: string;
  areas: DeliveryAreaOption[];
};

export type CheckoutStep = "commande" | "payment";

export type ScheduledSlotSelection = {
  start: string;
  end: string;
  slotKey: string;
};

/**
 * Snapshot d'un complément choisi, figé à la commande.
 *
 * Tout est recopié — libellé, prix unitaire, règle de facturation, message,
 * occasion. Passer une carte de 1 500 à 2 000 F ne réécrit donc jamais une
 * commande déjà passée, et désactiver une option ne la fait pas disparaître de
 * l'historique.
 */
export type OrderItemOptionSnapshot = {
  /** Référence de traçabilité, sans contrainte : l'option peut avoir disparu. */
  optionId?: string | null;
  groupName: string;
  optionName: string;
  pricingType: "fixed" | "per_unit";
  /** Prix d'une unité au moment de la commande. */
  unitPrice: number;
  quantity: number;
  /** Ce qui a réellement été facturé pour cette option. */
  totalPrice: number;
  /** Texte écrit par la cliente (« Joyeux anniversaire maman… »). */
  customMessage?: string | null;
  /** Catégorie d'occasion retenue (« Anniversaire »). */
  messageCategory?: string | null;
  /** Occasion libre, quand « Autre » a été choisi. */
  customOccasion?: string | null;
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
    /**
     * Snapshot de la variante choisie, figé à la commande.
     * Le libellé et le prix ne bougent plus, même si la variante change ensuite.
     */
    variantId?: string;
    variantLabel?: string;
    /**
     * Compléments choisis, figés. Absent sur les commandes antérieures au
     * système d'options — et sur les lignes qui n'en portent aucun.
     */
    options?: OrderItemOptionSnapshot[];
    /**
     * @deprecated Ancien champ taille nounours. Remplacé par `variantCode`
     * dans le panier et `variantLabel` dans la commande.
     */
    sizeCm?: number;
  }[];
  subtotal: number;
  total: number;
  paymentReference?: string | null;
  /** Jeton de suivi opaque — remis une seule fois, jamais exposé publiquement. */
  trackingToken?: string | null;
  driverId?: string | null;
  driverName?: string | null;
  driverStartedAt?: string | null;
  driverDeliveredAt?: string | null;
};

/**
 * Ce que le navigateur a le droit d'envoyer pour une option : un identifiant de
 * choix, une quantité, un message, une occasion. **Jamais un prix.**
 */
export type OrderItemOptionRequest = {
  optionId: string;
  quantity?: number;
  message?: string;
  occasionCategorySlug?: string;
  customOccasion?: string;
};

/**
 * Charge utile envoyée à `/api/orders` — volontairement **distincte** de
 * `SavedOrder`.
 *
 * `SavedOrder` décrit ce qui est *persisté* : les options y sont des snapshots
 * figés (libellé, prix, total). Ce que le navigateur propose n'a rien de tout
 * cela — il ne connaît que des identifiants. Confondre les deux laissait croire
 * qu'un client pouvait envoyer un prix ; les séparer rend la règle lisible.
 */
export type NewOrderRequestItem = Omit<SavedOrder["items"][number], "options"> & {
  supplements: string[];
  options?: OrderItemOptionRequest[];
};

export type NewOrderRequest = Omit<SavedOrder, "items"> & {
  items: NewOrderRequestItem[];
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
