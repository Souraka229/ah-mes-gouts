import { SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";

type OptimizeImageOptions = {
  width: number;
  height?: number;
  quality?: number;
};

/**
 * Applique des transformations Cloudinary (f_auto = AVIF/WebP) ou optimise Unsplash.
 */
export function optimizeImageUrl(
  src: string,
  { width, height, quality = 80 }: OptimizeImageOptions,
): string {
  if (src.includes("res.cloudinary.com")) {
    const transform = [
      "f_auto",
      "q_auto",
      `w_${width}`,
      height ? `h_${height}` : null,
      height ? "c_fill" : null,
    ]
      .filter(Boolean)
      .join(",");

    return src.replace("/upload/", `/upload/${transform}/`);
  }

  try {
    const url = new URL(src);
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "crop");
    url.searchParams.set("w", String(width));
    if (height) url.searchParams.set("h", String(height));
    url.searchParams.set("q", String(quality));
    return url.toString();
  } catch {
    return src;
  }
}

export function getOgImageUrl(imageUrl: string): string {
  return optimizeImageUrl(imageUrl, { width: 1200, height: 630 });
}

export function getProductImageUrl(imageUrl: string, width = 800): string {
  return optimizeImageUrl(imageUrl, { width });
}

export function getProductAltText(productName: string, context?: string): string {
  const base = `${productName} — glace artisanale premium`;
  return context ? `${base}, ${context}` : `${base} par ${SITE_NAME_WITH_CREDIT} à Cotonou`;
}
