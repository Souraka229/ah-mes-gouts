import Image from "next/image";

import {
  hasProductImage,
  ProductImagePlaceholder,
} from "@/components/shop/product-image-placeholder";
import { cn } from "@/lib/utils";

type ProductImageFrameProps = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  overlay?: React.ReactNode;
  badges?: React.ReactNode;
};

/**
 * Cadre produit sans couture : fond identique à --color-bg (#FAF7F5).
 * Ne pas changer --color-bg sans reshooter le catalogue (photos réelles calées dessus).
 * Texte et prix toujours en overlay HTML, jamais dans l'image.
 *
 * **L'image remplit le cadre (`object-cover`), elle n'y est pas contenue.**
 * Le catalogue n'a pas un format unique : les entremets sont en 4:5, les
 * compositions de roses et les nounours en carré, deux cartes en paysage. Avec
 * `contain`, ces dernières n'occupaient que le tiers du cadre et le produit
 * paraissait plus petit que ses voisins — une grille irrégulière, pour rien.
 * `cover` met toutes les cartes à la même échelle. Ce qu'il rogne est du fond
 * de photo, jamais le sujet.
 *
 * Un produit sans image affiche l'emplacement neutre : jamais la photo d'un
 * autre produit, jamais une carte cadeau par défaut.
 */
export function ProductImageFrame({
  src,
  alt,
  sizes,
  priority = false,
  className,
  imageClassName,
  overlay,
  badges,
}: ProductImageFrameProps) {
  if (!hasProductImage(src)) {
    return (
      <div className={cn("relative overflow-hidden bg-bg", className)}>
        <ProductImagePlaceholder alt={alt} className="absolute inset-0" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-bg", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={75}
        unoptimized={src.endsWith(".svg")}
        className={cn(
          "object-cover object-center transition-transform duration-[250ms] motion-reduce:transition-none",
          imageClassName,
        )}
      />
      {badges}
      {overlay && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg from-35% via-bg/75 via-60% to-transparent px-4 pt-20 pb-4">
          <div className="pointer-events-auto">{overlay}</div>
        </div>
      )}
    </div>
  );
}
