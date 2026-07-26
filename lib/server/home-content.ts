import {
  LANDING_COPY,
  LANDING_IMAGES,
  menuPacks,
} from "@/lib/landing-data";
import { SITE_NAME } from "@/lib/seo/site";
import {
  getGiftProductsBySlugs,
  getMenuDuJourShowcaseForLanding,
  type MenuShowcaseItem,
} from "@/lib/server/shop-catalog";
import type {
  FooterSectionContent,
  HeroSectionContent,
  GiftTeaserSectionContent,
  ProductGridSectionContent,
  SignatureMomentSectionContent,
  StorytellingSectionContent,
  TypoBandSectionContent,
} from "@/types/site-content";
import type { Product } from "@/types/product";

export type HomePageContent = {
  hero: HeroSectionContent;
  giftTeaser: GiftTeaserSectionContent;
  productGrid: ProductGridSectionContent;
  storytelling: StorytellingSectionContent;
  typoBand: TypoBandSectionContent;
  signatureMoment: SignatureMomentSectionContent;
  footer: FooterSectionContent;
  visibleSectionKeys: Set<string>;
  menuShowcase: MenuShowcaseItem[];
  giftProducts: Product[];
};

/** Contenu fixe de l'accueil (plus d'édition CMS). */
const CONTENT = {
  hero: {
    titleLine1: SITE_NAME,
    titleLine2: "",
    sublinePrefix: "Entremets & fleurs artisanaux —",
    sublineHighlight: "Fidjrosse, Cotonou",
    imageUrl: LANDING_IMAGES.hero,
    ctaLabel: "Découvrir la carte",
    ctaHref: "/catalogue",
    menuBadgeLabel: "Menu du jour",
  },
  giftTeaser: {
    title: "Et si c'était un cadeau ?",
    itemSlugs: ["nounours-beige", "bouquet-roses", "carte-cadeau"],
  },
  productGrid: {
    eyebrow: "La carte",
    titleLine1: "Créations",
    titleLine2: "du moment",
    packsSectionTitle: "Formules",
  },
  storytelling: {
    title: `Pourquoi ${SITE_NAME}`,
    body: LANDING_COPY.storyPlaceholder,
    imageUrl: LANDING_IMAGES.goyaveVanille,
  },
  typoBand: {
    variant: "scroll" as const,
    primaryText: LANDING_COPY.typoBand,
    rotateMessages: [
      LANDING_COPY.typoBand,
      "Des textures qui restent quand tout le reste a fondu",
      "Cotonou, une création à la fois",
    ],
  },
  signatureMoment: { text: LANDING_COPY.signatureMoment },
  footer: {
    phone: "+229 01 97 31 07 42",
    instagramHandle: "@ahmesgouts",
  },
};

const VISIBLE_KEYS = new Set<string>([
  "hero",
  "gift_teaser",
  "product_grid",
  "storytelling",
  "typo_band",
  "signature_moment",
  "footer",
]);

export async function getHomePageContent(): Promise<HomePageContent> {
  const [menuShowcase, giftProducts] = await Promise.all([
    getMenuDuJourShowcaseForLanding(),
    getGiftProductsBySlugs(CONTENT.giftTeaser.itemSlugs),
  ]);

  return {
    hero: CONTENT.hero,
    giftTeaser: CONTENT.giftTeaser,
    productGrid: CONTENT.productGrid,
    storytelling: CONTENT.storytelling,
    typoBand: CONTENT.typoBand,
    signatureMoment: CONTENT.signatureMoment,
    footer: CONTENT.footer,
    visibleSectionKeys: VISIBLE_KEYS,
    menuShowcase,
    giftProducts,
  };
}

export { menuPacks };
export type { MenuShowcaseItem };
