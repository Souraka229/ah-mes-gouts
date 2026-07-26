/** Types de contenu des sections de la page d'accueil (contenu fixe). */

export type SectionKey =
  | "hero"
  | "gift_teaser"
  | "product_grid"
  | "storytelling"
  | "typo_band"
  | "signature_moment"
  | "footer";

export type HeroSectionContent = {
  titleLine1: string;
  titleLine2: string;
  sublinePrefix: string;
  sublineHighlight: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  menuBadgeLabel: string;
};

export type GiftTeaserSectionContent = {
  title: string;
  itemSlugs: string[];
};

export type ProductGridSectionContent = {
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  packsSectionTitle: string;
};

export type StorytellingSectionContent = {
  title: string;
  body: string;
  imageUrl: string;
};

export type TypoBandVariant = "scroll" | "rotate";

export type TypoBandSectionContent = {
  variant: TypoBandVariant;
  /** Texte principal (scroll ou message unique en rotation) */
  primaryText: string;
  /** Messages alternés si variant = rotate */
  rotateMessages: string[];
};

export type SignatureMomentSectionContent = {
  text: string;
};

export type FooterSectionContent = {
  phone: string;
  instagramHandle: string;
};

export type SectionContentMap = {
  hero: HeroSectionContent;
  gift_teaser: GiftTeaserSectionContent;
  product_grid: ProductGridSectionContent;
  storytelling: StorytellingSectionContent;
  typo_band: TypoBandSectionContent;
  signature_moment: SignatureMomentSectionContent;
  footer: FooterSectionContent;
};
