import type { Metadata } from "next";

import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, TWITTER_HANDLE } from "@/lib/seo/site";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  ogType?: "website" | "product";
  noIndex?: boolean;
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function buildPageTitle(pageTitle: string): string {
  const suffix = ` | ${SITE_NAME}`;
  const maxPageLength = 60 - suffix.length;
  return truncate(pageTitle, maxPageLength);
}

export function buildFullTitle(pageTitle: string): string {
  return `${buildPageTitle(pageTitle)} | ${SITE_NAME}`;
}

export function buildPageDescription(description: string): string {
  return truncate(description, 160);
}

export function createPageMetadata({
  title,
  description,
  path,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  noIndex = false,
}: PageMetadataInput): Metadata {
  const canonicalPath = path.startsWith("/") ? path : `/${path}`;
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const pageTitle = buildPageTitle(title);
  const fullTitle = buildFullTitle(title);
  const pageDescription = buildPageDescription(description);
  const imageUrl = ogImage.startsWith("http")
    ? ogImage
    : `${SITE_URL}${ogImage}`;

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      type: ogType === "product" ? "website" : ogType,
      locale: "fr_BJ",
      url: canonicalUrl,
      siteName: SITE_NAME,
      title: fullTitle,
      description: pageDescription,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${title} — ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: pageDescription,
      images: [imageUrl],
      creator: TWITTER_HANDLE,
    },
  };
}

export function hasCatalogueFilterParams(
  params: Record<string, string | string[] | undefined>,
): boolean {
  const filterKeys = [
    "promotions",
    "search",
    "prix",
    "disponible",
    "nouveautes",
    "min",
    "max",
  ];
  return filterKeys.some((key) => params[key] !== undefined);
}
