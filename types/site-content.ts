/** Modèle générique de section de page — équivalent Prisma PageSection. */

export type SitePageId = "home" | "catalogue" | "livraison" | "contact";

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

export type PageSection<K extends SectionKey = SectionKey> = {
  id: string;
  page: SitePageId;
  sectionKey: K;
  isVisible: boolean;
  order: number;
  content: SectionContentMap[K];
  updatedAt: string;
};

export type PageSectionDraft = PageSection;

export type SectionVersionSnapshot = {
  id: string;
  sectionId: string;
  sectionKey: SectionKey;
  page: SitePageId;
  content: SectionContentMap[SectionKey];
  publishedAt: string;
  publishedBy: string;
};

export type SiteContentStore = {
  published: PageSection[];
  drafts: PageSectionDraft[];
  history: SectionVersionSnapshot[];
};

export type BrandColors = {
  bg: string;
  primary: string;
  secondary: string;
  accent: string;
};

export type NotificationTemplate = {
  id: string;
  key: string;
  label: string;
  body: string;
};

export type SiteSettings = {
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
  brandColors: BrandColors;
  notificationTemplates: NotificationTemplate[];
  updatedAt: string;
};

export type PublishedPageContent = {
  page: SitePageId;
  sections: PageSection[];
};
