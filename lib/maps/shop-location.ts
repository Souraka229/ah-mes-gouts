import { BUSINESS } from "@/lib/seo/site";

/** Coordonnées boutique — Cotonou (centre-ville approximatif). */
export const SHOP_COORDS = {
  lat: BUSINESS.geo.latitude,
  lng: BUSINESS.geo.longitude,
} as const;

export const SHOP_MAP_LABEL = "Gift & ENTREMETS — Cotonou";

/** Embed Google Maps (aucune clé API JS requise). */
export function getGoogleMapsEmbedUrl(): string {
  const { lat, lng } = SHOP_COORDS;
  const q = encodeURIComponent(`${SHOP_MAP_LABEL} ${lat},${lng}`);
  return `https://maps.google.com/maps?q=${q}&z=14&hl=fr&output=embed`;
}

/** Lien itinéraire (ouvre l'app Maps sur mobile). */
export function getGoogleMapsDirectionsUrl(): string {
  const { lat, lng } = SHOP_COORDS;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}
