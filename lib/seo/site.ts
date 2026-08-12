import {
  BOUTIQUE_HOURS,
  BOUTIQUE_LOCATION,
  ORDER_PHONE,
} from "@/lib/business-info";
import { DEFAULT_OG_IMAGE_PATH } from "@/lib/product-images";

/** Nom commercial de la boutique */
export const SITE_NAME = "Gift & ENTREMETS";

/** Marque d'origine (crédit) */
export const ORIGIN_BRAND = "Ah Mes Goûts";

/** Nom complet avec crédit maison mère */
export const SITE_NAME_WITH_CREDIT = `${SITE_NAME} By ${ORIGIN_BRAND}`;

/**
 * Domaine canonique. Un repli silencieux sur un mauvais domaine casserait tous
 * les canonicals, l'OG et le sitemap sans le moindre signal — on échoue fort.
 */
function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL est obligatoire en production (canonicals, OG, sitemap).",
    );
  }
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

export const SITE_LOCALE = "fr_BJ";

/**
 * Jours d'ouverture — source unique, alignée sur BOUTIQUE_HOURS.
 * « Tous les jours sauf le lundi » : le lundi est volontairement absent.
 */
export const OPENING_DAYS = [
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const BUSINESS = {
  name: SITE_NAME,
  legalName: SITE_NAME_WITH_CREDIT,
  // Téléphone et horaires viennent de business-info.ts — jamais recopiés.
  // Trois jeux d'horaires et deux numéros différents coexistaient auparavant,
  // dont un numéro incomplet publié dans le JSON-LD lu par Google.
  phone: ORDER_PHONE.tel,
  email: "contact@giftentremets.com",
  streetAddress: BOUTIQUE_LOCATION.full,
  addressLocality: "Cotonou",
  addressRegion: "Littoral",
  addressCountry: "BJ",
  geo: {
    latitude: 6.3654,
    longitude: 2.4183,
  },
  opens: BOUTIQUE_HOURS.open,
  closes: BOUTIQUE_HOURS.close,
  openingDays: OPENING_DAYS,
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
