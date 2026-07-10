import Link from "next/link";
import { MapPin, Navigation } from "lucide-react";

import {
  getGoogleMapsDirectionsUrl,
  getGoogleMapsEmbedUrl,
  SHOP_MAP_LABEL,
} from "@/lib/maps/shop-location";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GoogleMapsEmbedProps = {
  title?: string;
  className?: string;
  showDirections?: boolean;
};

/**
 * Carte boutique via iframe Google Maps Embed (pas de clé API JS).
 */
export function GoogleMapsEmbed({
  title = SHOP_MAP_LABEL,
  className,
  showDirections = true,
}: GoogleMapsEmbedProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
        <iframe
          title={title}
          src={getGoogleMapsEmbedUrl()}
          className="aspect-[16/10] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      {showDirections && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-2 font-body text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0 text-accent" aria-hidden />
            Cotonou, Bénin
          </p>
          <Link
            href={getGoogleMapsDirectionsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "cursor-pointer gap-2",
            )}
          >
            <Navigation className="size-4" aria-hidden />
            Itinéraire
          </Link>
        </div>
      )}
    </div>
  );
}
