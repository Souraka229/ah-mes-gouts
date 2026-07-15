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

function areasOf(zoneId: string): string[] {
  return deliveryZones.find((z) => z.id === zoneId)?.areas ?? [];
}

export const deliveryZoneSeoContent: DeliveryZoneSeo[] = [
  {
    zoneId: "zone-e",
    headline: "Destinations E — 500 F",
    intro: `Livraison locale autour de la boutique ${SITE_NAME} : Fidjrossè centre, Calvaire, Akogbato et environs immédiats.`,
    neighborhoods: areasOf("zone-e"),
    deliveryTime: "30 à 50 minutes",
  },
  {
    zoneId: "zone-d",
    headline: "Destinations D — 700 F",
    intro:
      "Agla, Cadjèhoun, Haie Vive, Vodjè et quartiers voisins — livraison soignée à tarif préférentiel.",
    neighborhoods: areasOf("zone-d"),
    deliveryTime: "35 à 60 minutes",
  },
  {
    zoneId: "zone-c",
    headline: "Destinations C — 800 F",
    intro:
      "Centre-ville et artères majeures : Ganhi, Tokpa, St Michel, Jéricho, Zogbo et alentours.",
    neighborhoods: areasOf("zone-c"),
    deliveryTime: "40 à 70 minutes",
  },
  {
    zoneId: "zone-b",
    headline: "Destinations B — 1 000 F",
    intro:
      "Segbèya, Habitat, Place Lénine, Campus Abomey-Calavi, Fidjrossè Club des Rois et secteurs intermédiaires.",
    neighborhoods: areasOf("zone-b"),
    deliveryTime: "45 à 75 minutes",
  },
  {
    zoneId: "zone-a",
    headline: "Destinations A — 1 500 F",
    intro:
      "Calavi (Bidossessi, Tankpè, Kpota…), Zone des Ambassades, Cococodji et périphérie étendue.",
    neighborhoods: areasOf("zone-a"),
    deliveryTime: "55 à 90 minutes",
  },
];

export const deliveryFaq = [
  {
    question: "Quels quartiers sont desservis ?",
    answer: `Nous livrons selon la grille officielle Destinations E → A. Exemples : Fidjrossè, Agla, Cadjèhoun, Tokpa, Segbèya, Calavi… Voir la liste complète sur cette page. Frais : 500 F à 1 500 F selon la destination.`,
  },
  {
    question: "Quel est le délai de livraison ?",
    answer:
      "Selon la zone, généralement entre 30 et 90 minutes pendant les horaires d'ouverture (13h–19h).",
  },
  {
    question: "Quels moyens de paiement acceptez-vous ?",
    answer:
      "MTN MoMo, Moov Money, Celtiis Cash et cartes Visa/Mastercard.",
  },
  {
    question: "Puis-je commander depuis Calavi ?",
    answer: `Oui — Calavi Bidossessi, Tankpè, Kpota, Arconville, etc. sont en Destinations A (${formatPrice(1500)}).`,
  },
] as const;

export function getZonePriceLabel(zoneId: string): string {
  const zone = deliveryZones.find((item) => item.id === zoneId);
  return zone ? formatPrice(zone.price) : "";
}
