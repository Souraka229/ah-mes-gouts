import { ORDER_PHONE } from "@/lib/business-info";

export interface PricingTier {
  id: string;
  name: string;
  minPrice: number;
  maxPrice: number;
  badge: string;
  benefits: string[];
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "bronze",
    name: "Pack Bronze",
    minPrice: 10000,
    maxPrice: 25000,
    badge: "🥉 Bronze",
    benefits: [
      "Carte de vœux personnalisée offerte",
      "1 Topping au choix offert",
      "Remise de 5% sur votre prochaine commande",
    ],
  },
  {
    id: "argent",
    name: "Pack Argent",
    minPrice: 26000,
    maxPrice: 50000,
    badge: "🥈 Argent",
    benefits: [
      "Livraison offerte à Cotonou",
      "Nappage & Décoration Spéciale personnalisée",
      "Mini coffret dégustation surprise inclus",
    ],
  },
  {
    id: "or",
    name: "Pack Or / Gourmand",
    minPrice: 51000,
    maxPrice: 85000,
    badge: "🥇 Or",
    benefits: [
      "Livraison VIP Express gratuite",
      "Coffret d'Entremets Prestige spécial inclus",
      "Bon d'achat cadeau VIP de 5 000 FCFA offert",
    ],
  },
  {
    id: "platine",
    name: "Pack Platine / Prestige",
    minPrice: 86000,
    maxPrice: 110000,
    badge: "👑 Platine / VIP",
    benefits: [
      "Service & Confection Sur-Mesure Prioritaire",
      "Packaging Écrin de Luxe + Bougies & Accessoires VIP",
      "Réduction de 15% permanente valable 3 mois",
      "Accès direct ligne VIP WhatsApp dédié",
    ],
  },
];

export function getTierForAmount(amount: number): PricingTier | null {
  return (
    PRICING_TIERS.find(
      (tier) => amount >= tier.minPrice && amount <= tier.maxPrice
    ) || null
  );
}

export interface BuildWhatsAppMessageParams {
  productName?: string;
  categoryName?: string;
  amount: number;
  customerName?: string;
  customerPhone?: string;
  fulfillmentType?: string;
  notes?: string;
}

export function generatePredefinedWhatsAppLink(
  params: BuildWhatsAppMessageParams
): string {
  const tier = getTierForAmount(params.amount);
  const cleanPhone = ORDER_PHONE.tel.replace(/\D/g, "");

  let message = `Bonjour Ah Mes Goûts ! 🍦✨\n\n`;
  message += `Je souhaite réserver/commander la formule suivante :\n`;
  if (params.productName) {
    message += `📌 *Produit / Formule* : ${params.productName}\n`;
  }
  if (params.categoryName) {
    message += `📁 *Catégorie* : ${params.categoryName}\n`;
  }
  message += `💰 *Montant choisi* : ${params.amount.toLocaleString()} FCFA\n`;

  if (tier) {
    message += `🎁 *Niveau* : ${tier.badge} (${tier.name})\n`;
    message += `✨ *Avantages inclus* :\n`;
    tier.benefits.forEach((b) => {
      message += `  • ${b}\n`;
    });
  }

  if (params.customerName) {
    message += `👤 *Client* : ${params.customerName}\n`;
  }
  if (params.customerPhone) {
    message += `📞 *Contact* : ${params.customerPhone}\n`;
  }
  if (params.fulfillmentType) {
    message += `🚚 *Mode* : ${
      params.fulfillmentType === "pickup"
        ? "Retrait en boutique"
        : "Livraison à domicile"
    }\n`;
  }

  if (params.notes) {
    message += `📝 *Note* : ${params.notes}\n`;
  }

  message += `\nMerci de me confirmer la prise en compte ! 🙏`;

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}
