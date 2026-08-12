import { getProductImageUrl, LANDING_EXTRA_IMAGES, LANDING_POSTER_IMAGES } from "@/lib/product-images";

/**
 * Photos de la landing — shootings maison, optimisés en WebP.
 * Régénérer avec : node scripts/import-landing-photos.mjs
 */
export const LANDING_PHOTOS = {
  heroCoeurOr: "/images/landing/hero-coeur-or.webp",
  nuitDoree: "/images/landing/gateau-nuit-doree.webp",
  fruitsRouges: "/images/landing/entremets-fruits-rouges.webp",
  surMesure: "/images/landing/gateau-sur-mesure.webp",
  coffretRoses: "/images/landing/coffret-roses.webp",
} as const;

/** Ambiance de la page d'accueil — utilisée quand aucun produit n'est publié. */
export const LANDING_AMBIANCE = [
  LANDING_PHOTOS.fruitsRouges,
  LANDING_PHOTOS.nuitDoree,
  LANDING_PHOTOS.coffretRoses,
  LANDING_PHOTOS.surMesure,
] as const;

/**
 * Signatures de la maison — vitrine éditoriale, pas le menu du jour.
 *
 * Volontairement statique : ces six pastilles racontent le savoir-faire et
 * restent identiques d'un jour à l'autre. Ce qui est réellement commandable
 * aujourd'hui vit dans la section « menu du jour », qui n'apparaît qu'une fois
 * le menu planifié et publié.
 */
export const LANDING_SIGNATURES = [
  { id: "coeur-or", name: "Cœur Ivoire", image: LANDING_PHOTOS.heroCoeurOr },
  {
    id: "fruits-rouges",
    name: "Rose des Bois",
    image: LANDING_PHOTOS.fruitsRouges,
  },
  { id: "nuit-doree", name: "Nuit Dorée", image: LANDING_PHOTOS.nuitDoree },
  {
    id: "sur-mesure",
    name: "Éclat Sur Mesure",
    image: LANDING_PHOTOS.surMesure,
  },
  {
    id: "coffret",
    name: "Attention Particulière",
    image: LANDING_PHOTOS.coffretRoses,
  },
  {
    id: "coeur-or-2",
    name: "Vanille Feuille d'Or",
    image: LANDING_PHOTOS.heroCoeurOr,
  },
] as const;

/** Visuels landing — photos réelles client WebP (+ import Gift) */
export const LANDING_IMAGES = {
  hero: LANDING_PHOTOS.heroCoeurOr,
  goyaveVanille: getProductImageUrl("goyave-vanille"),
  tiramisuPoster: LANDING_POSTER_IMAGES.tiramisuPoster,
  nutella: getProductImageUrl("nutella-caramel"),
  oreos: getProductImageUrl("caramel-baileys"),
  leCafe: LANDING_EXTRA_IMAGES.leCafe,
  manguePassion: getProductImageUrl("mango-passion"),
  caramelCappuccino: getProductImageUrl("caramel-cappuccino"),
  foretBlanche: getProductImageUrl("foret-blanche"),
  tiramisuRose: getProductImageUrl("tiramisu"),
  chocolatMenthe: LANDING_EXTRA_IMAGES.chocolatMenthe,
  chocolatCappuccino: getProductImageUrl("speculoos"),
  corbeille: "/images/produits/gift/la-corbeille-a-fruits-11.20.44.webp",
} as const;

export const MENU_DU_JOUR_CATALOGUE_HREF = "/catalogue#menu-du-jour";

export type ShowcaseProduct = {
  id: string;
  name: string;
  keyword: string;
  price: number;
  image: string;
  slug: string;
};

export const triptyqueItems = [
  {
    id: "ingredients",
    label: "Ingrédients frais",
    image: LANDING_POSTER_IMAGES.nutellaPoster,
  },
  {
    id: "preparation",
    label: "Préparation artisanale",
    image: LANDING_IMAGES.leCafe,
  },
  {
    id: "packaging",
    label: "Finition soignée",
    image: LANDING_IMAGES.foretBlanche,
  },
] as const;

export const footerNavLinks = [
  { href: "/catalogue", label: "Carte" },
  { href: "/infos", label: "Infos" },
  { href: "/#contact", label: "Boutique" },
  { href: "#", label: "CGV" },
  { href: "/contact", label: "Contact" },
] as const;

export const LANDING_COPY = {
  typoBand: "Ici, chaque bouchée fond avant que vous ne le décidiez",
  signatureMoment:
    "Une texture qui reste quand tout le reste a déjà fondu sur la langue",
  storyPlaceholder:
    "Gift & ENTREMETS est né à Cotonou d'une passion pour les textures qui fondent au bon moment — ni trop vite, ni trop tard. Nous créons des glaces et entremets artisanaux en mariant fruits tropicaux du Bénin et classiques gourmands, avec des ingrédients choisis et une finition soignée à chaque commande. Chaque recette est pensée pour éveiller les sens dès la première bouchée. Une maison signée Ah Mes Goûts.",
} as const;

export type MenuPack = {
  id: string;
  name: string;
  includes: string[];
  packPrice: number;
  unitTotalPrice: number;
  badgeLabel?: "Pack" | "Formule";
};

export const menuPacks: MenuPack[] = [
  {
    id: "pack-duo",
    name: "Pack Duo",
    includes: ["2 glaces au choix", "1 boisson maison"],
    packPrice: 8000,
    unitTotalPrice: 10000,
  },
  {
    id: "pack-famille",
    name: "Pack Famille",
    includes: [
      "4 entremets au choix",
      "4 couverts dorés",
      "Sur place en boutique",
    ],
    packPrice: 18000,
    unitTotalPrice: 22000,
  },
  {
    id: "pack-gourmand",
    name: "Formule Gourmande",
    includes: [
      "1 glace signature",
      "1 pâtisserie du jour",
      "Carte cadeau message personnalisé",
    ],
    packPrice: 9500,
    unitTotalPrice: 11500,
    badgeLabel: "Formule",
  },
];
