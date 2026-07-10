import { BRAND_LOGO_PATH } from "@/components/shop/brand-logo";
import { LANDING_COPY } from "@/lib/landing-data";
import { getProductImageUrl } from "@/lib/product-images";
import { SITE_NAME, SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";
import { INSTAGRAM_HANDLE } from "@/lib/social-links";
import type {
  PageSection,
  SiteContentStore,
  SiteSettings,
} from "@/types/site-content";

const now = () => new Date().toISOString();

export function createDefaultHomeSections(): PageSection[] {
  const t = now();
  return [
    {
      id: "home-hero",
      page: "home",
      sectionKey: "hero",
      isVisible: true,
      order: 0,
      updatedAt: t,
      content: {
        titleLine1: "L'instant qui",
        titleLine2: "fond",
        sublinePrefix: "Glaces & entremets artisanaux —",
        sublineHighlight: "Cotonou",
        imageUrl: getProductImageUrl("mango-passion"),
        ctaLabel: "La carte",
        ctaHref: "/catalogue",
        menuBadgeLabel: "Menu du jour actif",
      },
    },
    {
      id: "home-gift",
      page: "home",
      sectionKey: "gift_teaser",
      isVisible: true,
      order: 1,
      updatedAt: t,
      content: {
        title: "Et si c'était un cadeau ?",
        itemSlugs: ["nounours-beige", "bouquet-roses", "carte-cadeau"],
      },
    },
    {
      id: "home-grid",
      page: "home",
      sectionKey: "product_grid",
      isVisible: true,
      order: 2,
      updatedAt: t,
      content: {
        eyebrow: "Menu du jour",
        titleLine1: "Les créations",
        titleLine2: "du moment",
        packsSectionTitle: "Nos formules gourmandes",
      },
    },
    {
      id: "home-story",
      page: "home",
      sectionKey: "storytelling",
      isVisible: true,
      order: 3,
      updatedAt: t,
      content: {
        title: `Pourquoi ${SITE_NAME}`,
        body: LANDING_COPY.storyPlaceholder,
        imageUrl: getProductImageUrl("goyave-vanille"),
      },
    },
    {
      id: "home-typo",
      page: "home",
      sectionKey: "typo_band",
      isVisible: true,
      order: 4,
      updatedAt: t,
      content: {
        variant: "scroll",
        primaryText:
          "Ici, chaque bouchée fond avant que vous ne le décidiez",
        rotateMessages: [
          "Ici, chaque bouchée fond avant que vous ne le décidiez",
          "Des textures qui restent quand tout le reste a fondu",
          "Cotonou, une glace à la fois",
        ],
      },
    },
    {
      id: "home-signature",
      page: "home",
      sectionKey: "signature_moment",
      isVisible: true,
      order: 5,
      updatedAt: t,
      content: {
        text: "Une texture qui reste quand tout le reste a déjà fondu sur la langue",
      },
    },
    {
      id: "home-footer",
      page: "home",
      sectionKey: "footer",
      isVisible: true,
      order: 6,
      updatedAt: t,
      content: {
        phone: "+229 97 31 07 42",
        instagramHandle: INSTAGRAM_HANDLE,
      },
    },
  ];
}

export function createDefaultSiteSettings(): SiteSettings {
  return {
    siteName: SITE_NAME_WITH_CREDIT,
    logoUrl: BRAND_LOGO_PATH,
    faviconUrl: "/icon.png",
    brandColors: {
      bg: "#FAF7F5",
      primary: "#3B1F4D",
      secondary: "#F3C9CE",
      accent: "#C9A96E",
    },
    notificationTemplates: [
      {
        id: "order-confirmed",
        key: "order_confirmed",
        label: "Commande confirmée",
        body: "Bonjour {{prenom}}, votre commande {{numero_commande}} est confirmée. Merci !",
      },
      {
        id: "order-ready",
        key: "order_ready",
        label: "Commande prête",
        body: "Bonjour {{prenom}}, votre commande {{numero_commande}} est prête pour {{mode_livraison}}.",
      },
      {
        id: "order-delivered",
        key: "order_delivered",
        label: "Commande livrée",
        body: "Bonjour {{prenom}}, bonne dégustation ! Votre commande {{numero_commande}} a été livrée.",
      },
    ],
    updatedAt: now(),
  };
}

export function createDefaultSiteContentStore(): SiteContentStore {
  const sections = createDefaultHomeSections();
  return {
    published: structuredClone(sections),
    drafts: structuredClone(sections),
    history: [],
  };
}
