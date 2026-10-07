import { SITE_URL } from "@/lib/seo/site";

export function catalogUrl(): string {
  return `${SITE_URL}/catalogue`;
}

export function checkoutUrl(): string {
  return `${SITE_URL}/checkout`;
}

export function productUrl(slug: string): string {
  return `${SITE_URL}/produit/${encodeURIComponent(slug)}`;
}

export function deliveryZonesUrl(): string {
  return `${SITE_URL}/zones-de-livraison`;
}

export function trackingUrl(orderId: string, trackingToken?: string | null): string {
  if (trackingToken?.trim()) {
    return `${SITE_URL}/suivi/${orderId}?t=${trackingToken.trim()}`;
  }
  return `${SITE_URL}/suivi/${orderId}`;
}
