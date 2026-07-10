import { deliveryZones } from "@/lib/delivery-zones";
import { formatPrice } from "@/lib/format";
import { SITE_NAME } from "@/lib/seo/site";

export type DeliveryZoneSeo = {
  zoneId: string;
  headline: string;
  intro: string;
  neighborhoods: string[];
  deliveryTime: string;
};

export const deliveryZoneSeoContent: DeliveryZoneSeo[] = [
  {
    zoneId: "zone-e",
    headline: "Livraison de glaces à Fidjrossè et bord de mer",
    intro:
      "Commandez vos glaces artisanales avec livraison rapide vers Fidjrossè et les quartiers côtiers de Cotonou. Idéal pour une pause gourmande à domicile après une journée à la plage.",
    neighborhoods: ["Fidjrossè", "Bord de mer", "Jonquet", "Les Cocotiers (littoral)"],
    deliveryTime: "45 à 75 minutes",
  },
  {
    zoneId: "zone-d",
    headline: "Glace livraison Agla, Godomey et Akogbato",
    intro:
      `${SITE_NAME} dessert Agla, Godomey et Akogbato avec des créations glacées premium. Commandez en ligne et recevez vos desserts frais directement chez vous.`,
    neighborhoods: ["Agla", "Godomey", "Akogbato", "Vekky", "Ouando"],
    deliveryTime: "50 à 80 minutes",
  },
  {
    zoneId: "zone-c",
    headline: "Livraison glace Akpakpa, Tokpa et St Michel",
    intro:
      "Zone C : livraison de glaces à Akpakpa, Guinkomey, Tokpa et St Michel. Parfait pour les soirées entre amis ou les commandes bureau à Cotonou.",
    neighborhoods: [
      "Akpakpa",
      "Guinkomey",
      "Tokpa",
      "St Michel",
      "Jéricho",
    ],
    deliveryTime: "40 à 70 minutes",
  },
  {
    zoneId: "zone-b",
    headline: "Glace livraison Cadjehoun, Haie Vive et Cocotiers",
    intro:
      "Notre zone premium couvre Cadjehoun, Haie Vive et les Cocotiers. Glacier haut de gamme avec livraison soignée dans les quartiers centraux de Cotonou.",
    neighborhoods: [
      "Cadjehoun",
      "Haie Vive",
      "Cocotiers",
      "Ganhi",
      "Plateau",
    ],
    deliveryTime: "35 à 60 minutes",
  },
  {
    zoneId: "zone-a",
    headline: "Livraison glace Abomey-Calavi et zones périphériques",
    intro:
      "Nous livrons jusqu'à Abomey-Calavi et les secteurs périphériques de Cotonou. Commandez vos glaces en ligne depuis Calavi, Akpakpa éloigné ou les environs.",
    neighborhoods: [
      "Abomey-Calavi",
      "Calavi centre",
      "Akpakpa (éloigné)",
      "Togba",
      "Kpanroun",
    ],
    deliveryTime: "60 à 90 minutes",
  },
];

export const deliveryFaq = [
  {
    question: "Quels quartiers de Cotonou sont desservis ?",
    answer: `Nous livrons dans tout Cotonou et environs : ${deliveryZones.flatMap((z) => z.areas).join(", ")}. Consultez notre grille tarifaire par zone pour connaître les frais exacts.`,
  },
  {
    question: "Quel est le délai de livraison des glaces ?",
    answer:
      "Le délai varie selon la zone, généralement entre 35 et 90 minutes. Vous recevez une confirmation par SMS après validation du paiement.",
  },
  {
    question: "Quels moyens de paiement acceptez-vous ?",
    answer:
      "Nous acceptons MTN MoMo, Moov Money, Celtiis Cash et les cartes bancaires Visa/Mastercard via notre plateforme sécurisée.",
  },
  {
    question: "Puis-je commander des glaces en ligne depuis Calavi ?",
    answer:
      "Oui, Abomey-Calavi et Calavi sont couverts (zone A). Commandez sur notre catalogue en ligne et choisissez la livraison à l'étape checkout.",
  },
] as const;

export function getZonePriceLabel(zoneId: string): string {
  const zone = deliveryZones.find((item) => item.id === zoneId);
  return zone ? formatPrice(zone.price) : "";
}
