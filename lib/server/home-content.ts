import { LANDING_IMAGES } from "@/lib/landing-data";
import { SITE_NAME } from "@/lib/seo/site";
import {
  getMenuDuJourShowcaseForLanding,
  type MenuShowcaseItem,
} from "@/lib/server/shop-catalog";
import type {
  FooterSectionContent,
  HeroSectionContent,
} from "@/types/site-content";

export type HomePageContent = {
  hero: HeroSectionContent;
  footer: FooterSectionContent;
  menuShowcase: MenuShowcaseItem[];
};

const HERO: HeroSectionContent = {
  titleLine1: SITE_NAME,
  titleLine2: "",
  sublinePrefix: "Entremets artisanaux —",
  sublineHighlight: "Fidjrosse, Cotonou",
  imageUrl: LANDING_IMAGES.hero,
  ctaLabel: "Voir la carte",
  ctaHref: "/catalogue",
  menuBadgeLabel: "Menu du jour",
};

const FOOTER: FooterSectionContent = {
  phone: "+229 01 97 31 07 42",
  instagramHandle: "@ahmesgouts",
};

export async function getHomePageContent(): Promise<HomePageContent> {
  const menuShowcase = await getMenuDuJourShowcaseForLanding();

  return {
    hero: HERO,
    footer: FOOTER,
    menuShowcase,
  };
}

export type { MenuShowcaseItem };
