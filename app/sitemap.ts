import type { MetadataRoute } from "next";

import { getIndexableShopProducts } from "@/lib/server/shop-catalog";
import { SITE_URL } from "@/lib/seo/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/catalogue`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/zones-de-livraison`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
  ];

  let products: Awaited<ReturnType<typeof getIndexableShopProducts>> = [];
  try {
    products = await getIndexableShopProducts();
  } catch {
    products = [];
  }

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/produit/${product.slug}`,
    lastModified: new Date(product.updatedAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...productPages];
}
