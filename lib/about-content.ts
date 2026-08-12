import {
  AVAILABLE_PART_COUNTS,
  BOUQUETS,
  CLASSIC_CAKES,
  CLASSIC_PART_PRICE,
  NOUNOURS,
  SIGNATURE_CAKES,
  SIGNATURE_PART_PRICE,
} from "@/lib/constants/catalogue-maison";

/**
 * Contenu de la page « à propos ».
 *
 * Les tarifs et compositions ne sont PAS redéclarés ici : ils viennent de
 * catalogue-maison.ts, la même source que les produits injectés en base. La
 * page, le schema.org FAQ et le catalogue ne peuvent donc pas diverger.
 *
 * Les faits pratiques (téléphone, horaires, adresse) viennent de
 * business-info.ts, pour la même raison.
 */

/**
 * Année de création. La maison entre dans sa 10ᵉ année en 2026.
 * Calculée plutôt qu'écrite en dur : le texte ne vieillit pas.
 */
export const FOUNDED_YEAR = 2016;

export function getYearsOfCraft(now = new Date()): number {
  return Math.max(1, now.getFullYear() - FOUNDED_YEAR);
}

export {
  AVAILABLE_PART_COUNTS,
  BOUQUETS,
  CLASSIC_CAKES,
  CLASSIC_PART_PRICE,
  NOUNOURS,
  SIGNATURE_CAKES,
  SIGNATURE_PART_PRICE,
};

/** Fourchette des bouquets, pour l'annoncer sans lister les onze références. */
export function getBouquetRange(): { min: number; max: number } {
  const prices = BOUQUETS.map((b) => b.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function getNounoursRange(): { min: number; max: number } {
  const prices = NOUNOURS.map((n) => n.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export type AboutFaq = { question: string; answer: string };

const fcfa = (value: number) =>
  `${value.toLocaleString("fr-FR").replace(/ | /g, " ")} FCFA`;

/**
 * FAQ au format extractible : chaque réponse est autonome, porte l'entité, le
 * lieu et le fait. C'est l'unité qu'un modèle génératif reprend telle quelle.
 */
export function buildAboutFaq(input: {
  siteName: string;
  address: string;
  hours: string;
  days: string;
  phone: string;
  payments: string;
  years: number;
}): AboutFaq[] {
  const bouquets = getBouquetRange();
  const nounours = getNounoursRange();
  const parts = AVAILABLE_PART_COUNTS.join(", ");

  return [
    {
      question: `Qui est ${input.siteName} ?`,
      answer: `${input.siteName} est une pâtisserie artisanale de Cotonou, au Bénin, spécialisée dans les entremets. La maison entre dans sa ${input.years}ᵉ année et façonne ses créations à la main dans son atelier de Fidjrossè.`,
    },
    {
      question: `Où se trouve ${input.siteName} à Cotonou ?`,
      answer: `L'atelier et la boutique se trouvent à ${input.address}. La boutique est ouverte de ${input.hours}, ${input.days.toLowerCase()}.`,
    },
    {
      question: "Quelles sont les créations signatures de la maison ?",
      answer: `Sept recettes signatures : ${SIGNATURE_CAKES.map((c) => c.name).join(", ")}. Le Tropicana associe une mousse vanille mascarpone à un insert bissap et ananas ; l'Afrodisiak une mousse chocolat à un crémeux gingembre ; le Banoffee une mousse chocolat à un crémeux beurre d'arachide et une banane flambée caramélisée. Elles sont à ${fcfa(SIGNATURE_PART_PRICE)} la part.`,
    },
    {
      question: "Combien coûte un entremets à Cotonou ?",
      answer: `Les grands entremets sont vendus à la part : ${fcfa(CLASSIC_PART_PRICE)} pour les parfums de la carte permanente, ${fcfa(SIGNATURE_PART_PRICE)} pour les créations signatures. Ils se commandent à partir de ${parts} parts selon la recette. Les entremets individuels du menu du jour vont de 3 000 à 7 000 FCFA la pièce.`,
    },
    {
      question: "Comment commander un entremets ?",
      answer: `La commande se fait en ligne, sur le site. On choisit une création du menu du jour, un créneau de retrait ou de livraison, puis on paie par Mobile Money ou par carte. Pour un grand entremets à la part, comptez 72 heures pour le Tropicana, l'Afrodisiak et le Banoffee, et passez par le ${input.phone}.`,
    },
    {
      question: "Quels moyens de paiement sont acceptés ?",
      answer: `${input.payments}. Le paiement se fait en ligne, en FCFA, et la commande est confirmée dès qu'il est validé.`,
    },
    {
      question: `${input.siteName} livre-t-il à Cotonou ?`,
      answer:
        "Oui. La livraison couvre Cotonou et ses environs, en trois tournées quotidiennes : 13h30-15h30, 15h30-17h30 et 17h30-19h30. Le retrait en boutique à Fidjrossè reste possible sur tous les créneaux d'ouverture.",
    },
    {
      question: `${input.siteName} vend-il autre chose que des gâteaux ?`,
      answer: `Oui. La maison propose des bouquets de roses fraîches, de ${fcfa(bouquets.min)} pour une rose à l'unité à ${fcfa(bouquets.max)} pour un bouquet de vingt roses, ainsi que des nounours en peluche de ${fcfa(nounours.min)} à ${fcfa(nounours.max)} selon la taille, de 20 à 140 cm. Un supplément chocolats peut être ajouté à tout bouquet.`,
    },
    {
      question: "Peut-on offrir un entremets à quelqu'un ?",
      answer:
        "Oui. Chaque commande peut partir en cadeau, avec un message manuscrit et une livraison au créneau choisi. L'expéditeur peut rester anonyme pour le destinataire s'il le souhaite.",
    },
  ];
}
