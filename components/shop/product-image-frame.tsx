import Image from "next/image";

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
 * Texte et prix toujours en overlay HTML, jamais dans l'image.
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
  return (
    <div className={cn("relative overflow-hidden bg-bg", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={src.endsWith(".svg")}
        className={cn(
          "object-contain object-center transition-transform duration-[250ms] motion-reduce:transition-none",
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
