import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

type ProductImagePlaceholderProps = {
  /** Texte alternatif du produit — jamais une image empruntée à un autre. */
  alt?: string;
  /** Vignette : icône seule, sans le libellé qui ne tiendrait pas. */
  compact?: boolean;
  className?: string;
};

/**
 * Visuel neutre pour un produit sans image.
 *
 * Règle métier : **une image ne doit jamais être attribuée à un mauvais
 * produit.** Un produit sans photo n'hérite donc ni de celle d'un autre
 * produit, ni d'une carte cadeau, ni d'une image au hasard — il affiche cet
 * emplacement, qui dit clairement ce qu'il est.
 */
export function ProductImagePlaceholder({
  alt,
  compact = false,
  className,
}: ProductImagePlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={alt ? `${alt} — image non disponible` : "Image non disponible"}
      className={cn(
        "flex flex-col items-center justify-center gap-2 bg-muted/50",
        className,
      )}
    >
      <ImageOff
        className={cn(
          "text-muted-foreground/60",
          compact ? "size-4" : "size-6",
        )}
        aria-hidden
      />
      {!compact && (
        <p className="px-3 text-center font-body text-[11px] leading-tight text-muted-foreground/80">
          Image non disponible
        </p>
      )}
    </div>
  );
}

/** Un produit a-t-il réellement un visuel exploitable ? */
export function hasProductImage(src: string | null | undefined): src is string {
  return typeof src === "string" && src.trim().length > 0;
}
