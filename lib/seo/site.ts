import { DEFAULT_OG_IMAGE_PATH } from "@/lib/product-images";

/** Nom commercial de la boutique */
export const SITE_NAME = "Gift & ENTREMETS";

/** Marque d'origine (crédit) */
export const ORIGIN_BRAND = "Ah Mes Goûts";

/** Nom complet avec crédit maison mère */
export const SITE_NAME_WITH_CREDIT = `${SITE_NAME} By ${ORIGIN_BRAND}`;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "https://ahmesgouts.bj";

export const SITE_LOCALE = "fr_BJ";

export const BUSINESS = {
  name: SITE_NAME,
  legalName: SITE_NAME_WITH_CREDIT,
  phone: "+22997310742",
  email: "contact@ahmesgouts.bj",
  streetAddress: "Cotonou",
  addressLocality: "Cotonou",
  addressRegion: "Littoral",
  addressCountry: "BJ",
  geo: {
    latitude: 6.3654,
    longitude: 2.4183,
  },
  openingHours: [
    "Mo-Fr 10:00-20:00",
    "Sa 11:00-22:00",
    "Su 12:00-18:00",
  ],
  paymentAccepted: [
    "MTN MoMo",
    "Moov Money",
    "Celtiis Cash",
    "Visa",
    "Mastercard",
  ],
  priceRange: "$$",
  servesCuisine: "Glaces artisanales et entremets premium",
} as const;

export const DEFAULT_OG_IMAGE = `${SITE_URL}${DEFAULT_OG_IMAGE_PATH}`;

export const TWITTER_HANDLE = "@ahmesgouts";
