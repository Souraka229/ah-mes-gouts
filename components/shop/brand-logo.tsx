import { cn } from "@/lib/utils";
import {
  ORIGIN_BRAND,
  SITE_NAME,
  SITE_NAME_WITH_CREDIT,
} from "@/lib/seo/site";

/** Chemin logo bitmap legacy (admin paramètres) */
export const BRAND_LOGO_PATH = "/brand/logo-amg.png";

type BrandLogoProps = {
  className?: string;
  /** Variante compacte : sans la ligne « By Ah Mes Goûts » */
  compact?: boolean;
  /** Variante claire sur fond sombre */
  variant?: "default" | "onDark";
  priority?: boolean;
};

export function BrandLogo({
  className,
  compact = false,
  variant = "default",
}: BrandLogoProps) {
  const onDark = variant === "onDark";

  return (
    <div className={cn("flex flex-col leading-none", className)}>
      <span
        className={cn(
          "font-display font-semibold tracking-[-0.02em]",
          onDark
            ? "text-[clamp(1.15rem,2.8vw,1.55rem)] text-bg drop-shadow-[0_1px_12px_rgba(0,0,0,0.25)]"
            : "text-[clamp(1rem,2.5vw,1.35rem)] text-primary",
        )}
      >
        {SITE_NAME}
      </span>
      {!compact && (
        <span
          className={cn(
            "mt-1 font-body text-[0.6rem] font-medium tracking-[0.16em] uppercase sm:text-[0.65rem]",
            onDark ? "text-white/60" : "text-muted-foreground",
          )}
        >
          By {ORIGIN_BRAND}
        </span>
      )}
      <span className="sr-only">{SITE_NAME_WITH_CREDIT}</span>
    </div>
  );
}
