/**
 * Catalogue de la maison — tarifs communiqués par la cheffe.
 *
 * Deux modèles de prix cohabitent, et il ne faut pas les confondre :
 *
 *  - Les entremets du menu du jour sont des PIÈCES vendues à l'unité
 *    (3 000 / 5 000 / 7 000 FCFA selon la recette). C'est ce que confirment
 *    les affiches : « FORÊT NOIRE … 5000 FCFA ».
 *
 *  - Les grands entremets sur commande sont vendus À LA PART, avec un nombre
 *    minimum de parts et 72 h de préparation pour certains.
 *
 * Ce fichier ne décrit que le second modèle, plus les nounours et les fleurs.
 * Le menu du jour reste piloté depuis le back-office.
 */

export type PartPricedCake = {
  slug: string;
  name: string;
  description: string;
  pricePerPart: number;
  /** Certaines recettes exigent un délai — null quand ce n'est pas le cas. */
  leadTimeHours: number | null;
};

/** Parfums de la carte permanente, tous au même tarif. */
export const CLASSIC_PART_PRICE = 3000;

export const CLASSIC_CAKES: PartPricedCake[] = [
  ["chocolat-vanille", "Chocolat Vanille"],
  ["chocolat-cappuccino", "Chocolat Cappuccino"],
  ["chocolat-baileys", "Chocolat Baileys"],
  ["chocolat-menthe", "Chocolat Menthe"],
  ["chocolat-framboise", "Chocolat Framboise"],
  ["mangue-vanille", "Mangue Vanille"],
  ["framboise-vanille", "Framboise Vanille"],
  ["vanille-cappuccino", "Vanille Cappuccino"],
].map(([slug, name]) => ({
  slug: `commande-${slug}`,
  name: name!,
  description: `Grand entremets ${name!.toLowerCase()}, monté à la commande.`,
  pricePerPart: CLASSIC_PART_PRICE,
  leadTimeHours: null,
}));

export const SIGNATURE_PART_PRICE = 3500;

/**
 * Créations signatures — recettes propres à la maison.
 *
 * Compositions telles que communiquées. Ce sont les seules descriptions
 * exactes dont nous disposons : ne pas les enjoliver, elles servent aussi de
 * source aux données structurées de la page « à propos ».
 */
export const SIGNATURE_CAKES: PartPricedCake[] = [
  {
    slug: "commande-tropicana",
    name: "Tropicana",
    description: "Mousse vanille mascarpone, insert bissap et ananas.",
    pricePerPart: SIGNATURE_PART_PRICE,
    leadTimeHours: 72,
  },
  {
    slug: "commande-afrodisiak",
    name: "Afrodisiak",
    description: "Mousse chocolat, crémeux gingembre.",
    pricePerPart: SIGNATURE_PART_PRICE,
    leadTimeHours: 72,
  },
  {
    slug: "commande-banoffee",
    name: "Banoffee",
    description:
      "Mousse chocolat, crémeux beurre d'arachide, banane flambée et caramélisée.",
    pricePerPart: SIGNATURE_PART_PRICE,
    leadTimeHours: 72,
  },
  {
    slug: "commande-mojito",
    name: "Mojito",
    description: "Mousse vanille, insert menthe-citron.",
    pricePerPart: SIGNATURE_PART_PRICE,
    leadTimeHours: null,
  },
  {
    slug: "commande-tiramisu",
    name: "Tiramisu",
    description: "Mousse tiramisu, insert crémeux cappuccino.",
    pricePerPart: SIGNATURE_PART_PRICE,
    leadTimeHours: null,
  },
  {
    slug: "commande-foret-noire",
    name: "Forêt-Noire",
    description: "Mousse chocolat et vanille, insert compotée de cerise.",
    pricePerPart: SIGNATURE_PART_PRICE,
    leadTimeHours: null,
  },
  {
    slug: "commande-vanille-myrtille",
    name: "Vanille Myrtille",
    description: "Mousse vanille mascarpone, insert gelée de myrtille.",
    pricePerPart: SIGNATURE_PART_PRICE,
    leadTimeHours: null,
  },
];

/**
 * Nombres de parts proposés.
 *
 * L'association exacte entre chaque recette et son minimum de parts n'a pas
 * été communiquée : elle n'est donc PAS inventée ici. La fiche produit
 * indique la fourchette et renvoie vers la boutique pour confirmation.
 */
export const AVAILABLE_PART_COUNTS = [6, 10, 12] as const;

export type SizedProduct = {
  slug: string;
  name: string;
  description: string;
  price: number;
};

/** Nounours en peluche, tarif par taille. */
export const NOUNOURS: SizedProduct[] = [
  [20, 10000],
  [25, 15000],
  [30, 25000],
  [80, 35000],
  [90, 40000],
  [100, 45000],
  [120, 50000],
  [130, 70000],
  [140, 90000],
].map(([cm, price]) => ({
  slug: `nounours-${cm}cm`,
  name: `Nounours ${cm} cm`,
  description: `Nounours en peluche, ${cm} cm.`,
  price: price!,
}));

/** Bouquets de roses fraîches. */
export const BOUQUETS: SizedProduct[] = [
  {
    slug: "rose-unite",
    name: "Rose à l'unité",
    description: "Une rose fraîche, sans emballage.",
    price: 3500,
  },
  {
    slug: "bouquet-1-rose",
    name: "Bouquet 1 rose",
    description: "Une rose parfumée, gypsophile et emballage.",
    price: 5000,
  },
  {
    slug: "bouquet-2-roses",
    name: "Bouquet 2 roses",
    description: "Deux roses parfumées et gypsophile.",
    price: 10000,
  },
  {
    slug: "bouquet-3-roses",
    name: "Bouquet 3 roses",
    description: "Trois roses parfumées, gypsophile et carte.",
    price: 12000,
  },
  ...[
    [5, 20000],
    [7, 25000],
    [9, 33000],
    [10, 35000],
    [12, 42000],
    [15, 50000],
    [20, 70000],
  ].map(([count, price]) => ({
    slug: `bouquet-${count}-roses`,
    name: `Bouquet ${count} roses`,
    description: `${count} roses parfumées, gypsophile, carte et emballage. Sacoche offerte.`,
    price: price!,
  })),
];

/**
 * Supplément chocolats pour un duo roses + chocolats.
 *
 * Le tarif dépend de la quantité (3 000 F pour quelques chocolats, jusqu'à
 * 10 000 F pour un paquet complet). Le produit porte le prix d'entrée ; la
 * cliente précise la quantité à la commande.
 */
export const DUO_CHOCOLAT: SizedProduct = {
  slug: "supplement-chocolats",
  name: "Supplément chocolats",
  description:
    "À ajouter à un bouquet. De quelques chocolats (3 000 F) au paquet complet (10 000 F) — précisez la quantité souhaitée en commentaire.",
  price: 3000,
};
