/**
 * Infos métier extraites des affiches opérationnelles & flyers.
 * Ne contient PAS les détails de paiement (laissés tels quels dans le checkout).
 */

export const BOUTIQUE_HOURS = {
  label: "13h – 19h",
  open: "13:00",
  close: "19:00",
  daysLabel: "Tous les jours sauf le lundi",
} as const;

export const ORDER_PHONE = {
  display: "+229 01 97 31 07 42",
  /** Format local flyer : 0197310742 */
  tel: "+22997310742",
} as const;

/**
 * WhatsApp obligatoire pour le retrait en boutique — c'est le même numéro
 * que le téléphone (ORDER_PHONE), dérivé pour ne jamais désynchroniser les deux.
 */
export const WHATSAPP_PICKUP = {
  display: ORDER_PHONE.display,
  tel: ORDER_PHONE.tel,
  waMe: `https://wa.me/${ORDER_PHONE.tel.replace(/\D/g, "")}`,
} as const;

export const BOUTIQUE_LOCATION = {
  short: "Fidjrosse, Cotonou",
  full: "Fidjrosse fin pavée, face à Yatt & Co — Cotonou",
  landmark: "Face à Yatt & Co",
} as const;

export const SLOGAN =
  "L'exigence du détail, le goût de l'excellence";

export const SLOGAN_SOCIAL =
  "Votre satisfaction, notre plus belle récompense";

export const SLOGAN_PASSION =
  "Des saveurs qui touchent le cœur, créées avec passion rien que pour vous !";

/** Formats entremets — flyers Gifts & Entremets */
export const PRODUCT_SHAPES = {
  coeur: { id: "coeur", label: "En cœur", short: "Cœur" },
  carre: { id: "carre", label: "En carré", short: "Carré" },
} as const;

export type ProductShapeId = keyof typeof PRODUCT_SHAPES;

/** Mapping slug → format (cœur / carré) */
export const PRODUCT_SHAPE_BY_SLUG: Partial<Record<string, ProductShapeId>> = {
  "caramel-baileys": "coeur",
  "vanilla-caramel": "coeur",
  "mango-passion": "coeur",
  "goyave-vanille": "coeur",
  tiramisu: "coeur",
  "caramel-cappuccino": "carre",
  "nutella-caramel": "carre",
  "foret-blanche": "carre",
  "mousse-chocolat": "carre",
  speculoos: "carre",
};

export const BRAND_VALUES = [
  {
    id: "jour-meme",
    title: "Préparé le jour même",
    detail: "Rien ne dort au frigo plus d'une nuit.",
  },
  {
    id: "main",
    title: "Fait à la main",
    detail: "Pas de moule industriel, juste nos mains et nos couteaux.",
  },
  {
    id: "livraison",
    title: "Livraison à Cotonou",
    detail: "En moto, en direct, encore frais à l'arrivée.",
  },
  {
    id: "retrait",
    title: "Retrait à Fidjrosse",
    detail: "Passez le récupérer, ou faites-vous livrer, comme vous voulez.",
  },
] as const;

export const CLIENT_TESTIMONIALS = [
  {
    id: "aime",
    quote: "Sincèrement j'ai aimé",
    reply: "Ravie de l'apprendre",
    productHint: "Vanille Myrtille",
  },
  {
    id: "pepite",
    quote: "Une pépite",
    reply: "Merci pour votre confiance",
    productHint: "Kinder Bueno",
  },
  {
    id: "tuerie",
    quote: "C'est une tuerie",
    reply: "À très bientôt gourmand·e",
    productHint: "Caramel Baileys",
  },
] as const;

export const ORDER_STEPS = [
  {
    title: "Je consulte le menu",
    detail: "Disponible la veille",
  },
  {
    title: "Je fais mon choix",
    detail: "Sur le catalogue en ligne",
  },
  {
    title: "Je choisis mon créneau",
    detail: "En boutique · Sur place",
  },
  {
    title: "Je renseigne mes infos",
    detail: "Téléphone / WhatsApp obligatoire",
  },
  {
    title: "Je paie et confirme",
    detail: "Selon les moyens proposés au checkout",
  },
] as const;

export const ORGANIZATION_RULES = [
  "Les commandes sont traitées selon l'ordre des paiements validés.",
  "1ʳᵉ commande confirmée = 1ʳᵉ priorité de préparation.",
  "Les précommandes sont prioritaires.",
  "Commandez tôt pour être servi en priorité.",
  "La précommande reste ouverte jusqu'à la limite de capacité du jour.",
] as const;

export const PICKUP_RULES = [
  "Toute commande doit être récupérée le jour prévu.",
  "Aucun report sans frais.",
  "Aucun stockage gratuit.",
  "La qualité du produit n'est plus garantie après la date prévue.",
  "Le numéro WhatsApp ayant passé la commande est obligatoire pour le retrait en boutique.",
] as const;

export const LATE_PENALTIES = [
  {
    type: "Parts / entremets individuels",
    amount: 1000,
    label: "1 000 F / jour",
  },
  {
    type: "Gâteaux d'anniversaire",
    amount: 2000,
    label: "2 000 F / jour",
  },
] as const;

export const CHECKOUT_NOTICES = {
  sameDay:
    "Votre commande doit être récupérée le jour du créneau choisi. Aucun stockage gratuit.",
  whatsapp:
    "Indiquez le numéro WhatsApp utilisé pour la commande — il sera demandé au retrait en boutique.",
  menuEve: "Le menu du jour est disponible la veille.",
} as const;
