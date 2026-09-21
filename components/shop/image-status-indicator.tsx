"use client";

import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ImageOff } from "lucide-react";

import { isReferenceVisual } from "@/lib/product-images";

/**
 * Provenance d'un visuel produit.
 *
 * - `photo`     : vraie photo du produit (shoot boutique ou upload admin).
 * - `reference` : visuel indicatif temporaire — non contractuel.
 * - `none`      : aucune image. On n'affirme **rien** : c'est l'emplacement
 *                 neutre (`ProductImagePlaceholder`) qui parle.
 *
 * Règle : ne jamais annoncer « photo réelle » sans image. L'ancienne version
 * affichait « ✓ Photo réelle du produit » pour tout ce qui n'était pas un
 * placeholder nounours — y compris les produits sans aucun visuel.
 */
export type ImageOrigin = "photo" | "reference" | "none";

export function getImageOrigin(imageUrl: string | undefined): ImageOrigin {
  const value = imageUrl?.trim() ?? "";
  if (value.length === 0) return "none";
  if (isReferenceVisual(value)) return "reference";
  return "photo";
}

const ORIGIN_STYLE: Record<
  Exclude<ImageOrigin, "photo">,
  { label: string; className: string; icon: typeof AlertTriangle }
> = {
  reference: {
    label: "Visuel indicatif",
    className: "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-50",
    icon: AlertTriangle,
  },
  none: {
    label: "Aucune photo",
    className: "border-border bg-muted text-muted-foreground hover:bg-muted",
    icon: ImageOff,
  },
};

/**
 * État du visuel d'un produit.
 *
 * Une **vraie photo ne s'annonce pas** : « Photo réelle du produit » n'apprend
 * rien au client et encombre la fiche. Seuls les cas qui demandent une
 * explication s'affichent — un visuel de référence (non contractuel) ou
 * l'absence de photo. La vraie photo devient prioritaire dès qu'elle existe :
 * le badge disparaît tout seul, sans action manuelle.
 */
export function PlaceholderWarningBadge({ imageUrl }: { imageUrl: string }) {
  const origin = getImageOrigin(imageUrl);
  if (origin === "photo") return null;

  const style = ORIGIN_STYLE[origin];
  const Icon = style.icon;

  return (
    <div className="mt-2 flex items-center gap-2">
      <Badge variant="outline" className={style.className}>
        <Icon className="mr-1 size-3.5" />
        {style.label}
      </Badge>
      {origin === "reference" && (
        <span className="font-body text-xs text-muted-foreground">
          Photos non contractuelles — la vraie photo remplacera automatiquement ce visuel.
        </span>
      )}
      {origin === "none" && (
        <span className="font-body text-xs text-muted-foreground">
          Ajoutez une photo depuis le back-office.
        </span>
      )}
    </div>
  );
}
