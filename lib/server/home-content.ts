import { getPublishedSections, getSectionByKey } from "@/lib/server/site-content-repository";
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
  PageSection,
} from "@/types/site-content";
import type { Product } from "@/types/product";

export type HomePageContent = {
  sections: PageSection[];
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

const DEFAULTS = {
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

export async function getHomePageContent(): Promise<HomePageContent> {
  const sections = await getPublishedSections("home");
  const visibleSectionKeys = new Set(
    sections.filter((s) => s.isVisible).map((s) => s.sectionKey),
  );

  const giftTeaser =
    getSectionByKey(sections, "gift_teaser")?.content ?? DEFAULTS.giftTeaser;

  const [menuShowcase, giftProducts] = await Promise.all([
    getMenuDuJourShowcaseForLanding(),
    getGiftProductsBySlugs(giftTeaser.itemSlugs),
  ]);

  return {
    sections,
    hero: getSectionByKey(sections, "hero")?.content ?? DEFAULTS.hero,
    giftTeaser,
    productGrid:
      getSectionByKey(sections, "product_grid")?.content ?? DEFAULTS.productGrid,
    storytelling:
      getSectionByKey(sections, "storytelling")?.content ?? DEFAULTS.storytelling,
    typoBand:
      getSectionByKey(sections, "typo_band")?.content ?? DEFAULTS.typoBand,
    signatureMoment:
      getSectionByKey(sections, "signature_moment")?.content ??
      DEFAULTS.signatureMoment,
    footer: getSectionByKey(sections, "footer")?.content ?? DEFAULTS.footer,
    visibleSectionKeys,
    menuShowcase,
    giftProducts,
  };
}

export { menuPacks };
export type { MenuShowcaseItem };
