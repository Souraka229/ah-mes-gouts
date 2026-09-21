import { deliveryZones, getZonePriceLabel } from "@/lib/delivery-zones";
import { SITE_NAME } from "@/lib/seo/site";

export type DeliveryZoneSeo = {
  zoneId: string;
  headline: string;
  intro: string;
  /** Quartiers desservis, dans l'ordre de la grille officielle. */
  neighborhoods: string[];
  deliveryTime: string;
};

/**
 * Les quartiers ne sont **pas** recopiés ici : ils sont lus dans la grille
 * (`lib/delivery-zones.ts`). Une liste dupliquée finit toujours par mentir —
 * celle-ci avait déjà gardé Vodjè en Destinations D après son changement de
 * palier.
 */
function areasOf(zoneId: string): string[] {
  return deliveryZones.find((z) => z.id === zoneId)?.areas.map((a) => a.name) ?? [];
}

export const deliveryZoneSeoContent: DeliveryZoneSeo[] = [
  {
    zoneId: "zone-e",
    headline: "Destinations E",
    intro: `Livraison locale autour de la boutique ${SITE_NAME} : Fidjrossè, Calvaire, Akogbato et environs immédiats.`,
    neighborhoods: areasOf("zone-e"),
    deliveryTime: "30 à 50 minutes",
  },
  {
    zoneId: "zone-d",
    headline: "Destinations D",
    intro:
      "Agla, Cadjèhoun, Haie Vive et la Direction Générale MTN — livraison soignée à tarif préférentiel.",
    neighborhoods: areasOf("zone-d"),
    deliveryTime: "35 à 60 minutes",
  },
  {
    zoneId: "zone-c",
    headline: "Destinations C",
    intro:
      "Le cœur de Cotonou : St Michel, Jéricho, Zongo, Gbégamey, Vodjè, Fidjrossè Station Ewell et les artères voisines.",
    neighborhoods: areasOf("zone-c"),
    deliveryTime: "40 à 70 minutes",
  },
  {
    zoneId: "zone-b",
    headline: "Destinations B",
    intro:
      "Le palier le plus large : Akpakpa, Ste Cécile, Ganhi, Tokpa, Sacré Cœur, Habitat, Campus Abomey-Calavi, Calavi Bidossessi et tout le centre élargi.",
    neighborhoods: areasOf("zone-b"),
    deliveryTime: "45 à 75 minutes",
  },
  {
    zoneId: "zone-a",
    headline: "Destinations A",
    intro:
      "Cococodji, Kpota, Arconville, Le Bélier, Finagon et la périphérie étendue de Cotonou.",
    neighborhoods: areasOf("zone-a"),
    deliveryTime: "55 à 90 minutes",
  },
  {
    zoneId: "zone-hors-cotonou",
    headline: "Hors Cotonou",
    intro:
      "Porto-Novo, Ouidah, Allada, Sèmè-Podji, Godomey, Calavi et les communes voisines. Le tarif dépend de la distance : il est indiqué pour chaque lieu au moment du choix.",
    neighborhoods: areasOf("zone-hors-cotonou"),
    deliveryTime: "1 h 30 à 3 h, sur créneau réservé",
  },
];

export const deliveryFaq = [
  {
    question: "Quels quartiers sont desservis ?",
    answer: `Nous livrons selon la grille officielle Destinations E → A, plus Hors Cotonou. Exemples : Fidjrossè, Agla, Tokpa, Vodjè, Segbèya, Calavi, Porto-Novo… Voir la liste complète sur cette page. Frais : de 500 F à 4 000 F selon la destination.`,
  },
  {
    question: "Quel est le délai de livraison ?",
    answer:
      "Selon la zone, généralement entre 30 et 90 minutes pendant les horaires d'ouverture (13h–19h). Hors Cotonou, la livraison se fait sur créneau réservé.",
  },
  {
    question: "Quels moyens de paiement acceptez-vous ?",
    answer: "MTN MoMo, Moov Money, Celtiis Cash et cartes Visa/Mastercard.",
  },
  {
    question: "Puis-je commander depuis Calavi ?",
    answer:
      "Oui — Calavi Bidossessi et Tankpè sont à 1 000 F, Kpota, Arconville et Cococodji à 1 500 F. Le tarif exact s'affiche dès que vous choisissez votre quartier au checkout.",
  },
] as const;

export { getZonePriceLabel };
