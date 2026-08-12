/**
 * Contenu de la page « à propos ».
 *
 * Séparé du composant pour deux raisons : le schema.org FAQ est construit à
 * partir des mêmes objets que le rendu — impossible que la page dise une chose
 * et les données structurées une autre — et la cheffe peut corriger un prix
 * sans toucher au JSX.
 *
 * Les faits pratiques (téléphone, horaires, adresse) ne sont PAS dupliqués
 * ici : ils viennent de business-info.ts, source unique.
 */

/** Année de création — sert à calculer l'ancienneté sans la réécrire chaque année. */
export const FOUNDED_YEAR = 2021;

export function getYearsOfCraft(now = new Date()): number {
  return Math.max(1, now.getFullYear() - FOUNDED_YEAR);
}

/**
 * Créations signatures — recettes propres à la maison.
 *
 * Ce sont les entrées les plus précieuses de la page : des noms qui
 * n'existent nulle part ailleurs, associés à une composition précise. C'est
 * exactement ce qu'un moteur génératif peut citer sans se tromper.
 */
export const SIGNATURE_RECIPES = [
  {
    name: "Tropicana",
    composition: "Mousse coco, insert bissap, ananas",
    note: "À commander 72 h à l'avance",
    pricePerPart: 3500,
  },
  {
    name: "Afrodisiak",
    composition: "Mousse chocolat, crémeux gingembre, confit d'ananas",
    note: "À commander 72 h à l'avance",
    pricePerPart: 3500,
  },
  {
    name: "Bananut",
    composition:
      "Mousse chocolat, crémeux beurre d'arachide, banane flambée caramélisée",
    note: "À commander 72 h à l'avance",
    pricePerPart: 3500,
  },
] as const;

/** Parfums de la carte permanente, tous au même tarif par part. */
export const CLASSIC_FLAVOURS = [
  "Chocolat vanille",
  "Chocolat caramel",
  "Chocolat café",
  "Chocolat baileys",
  "Chocolat menthe",
  "Chocolat mangue",
  "Chocolat framboise",
  "Mangue vanille",
  "Framboise vanille",
  "Framboise menthe",
] as const;

export const CLASSIC_PRICE_PER_PART = 2500;

/** Formats d'entremets sur commande. */
export const CAKE_FORMATS = [
  { label: "Entremets 10 parts", from: 25000 },
  { label: "Entremets 12 parts", from: 30000 },
  { label: "Entremets 20 parts", from: null },
  { label: "Moule à forme spéciale", from: 20000 },
  { label: "Gâteau d'enfant", from: null },
] as const;

export type AboutFaq = { question: string; answer: string };

/**
 * FAQ au format extractible : chaque réponse est autonome, porte l'entité, le
 * lieu et le fait. C'est l'unité qu'un modèle reprend telle quelle.
 * Les valeurs variables sont injectées à la construction (voir la page).
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
  return [
    {
      question: `Qui est ${input.siteName} ?`,
      answer: `${input.siteName} est une pâtisserie artisanale de Cotonou, au Bénin, spécialisée dans les entremets glacés. La maison façonne ses créations à la main depuis ${input.years} ans, en très petite série, dans son atelier de Fidjrossè.`,
    },
    {
      question: `Où se trouve ${input.siteName} à Cotonou ?`,
      answer: `L'atelier et la boutique se trouvent à ${input.address}. La boutique est ouverte de ${input.hours}, ${input.days.toLowerCase()}.`,
    },
    {
      question: "Quelles sont les créations signatures de la maison ?",
      answer:
        "Trois recettes n'existent que chez Gift & ENTREMETS : le Tropicana, mousse coco avec un insert bissap et ananas ; l'Afrodisiak, mousse chocolat, crémeux gingembre et confit d'ananas ; et le Bananut, mousse chocolat, crémeux beurre d'arachide et banane flambée caramélisée. Ces trois créations se commandent 72 heures à l'avance.",
    },
    {
      question: "Combien coûte un entremets à Cotonou ?",
      answer: `Un entremets de 10 parts démarre à 25 000 FCFA, un 12 parts à 30 000 FCFA, et un moule à forme spéciale à 20 000 FCFA. Les parfums de la carte permanente sont à ${CLASSIC_PRICE_PER_PART} FCFA la part, les créations signatures à 3 500 FCFA la part.`,
    },
    {
      question: "Comment commander un entremets ?",
      answer: `La commande se fait en ligne, sur le site. On choisit une création du menu du jour, un créneau de retrait ou de livraison, puis on paie par Mobile Money ou par carte. Pour un gâteau sur mesure ou une création signature, il faut compter 72 heures et passer par le ${input.phone}.`,
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
      question: "Peut-on offrir un entremets à quelqu'un ?",
      answer:
        "Oui. Chaque commande peut partir en cadeau, avec un message manuscrit et une livraison au créneau choisi. L'expéditeur peut rester anonyme pour le destinataire s'il le souhaite.",
    },
  ];
}
