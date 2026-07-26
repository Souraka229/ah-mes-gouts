import Link from "next/link";
import { Clock, MapPin, Truck } from "lucide-react";

import {
  BOUTIQUE_HOURS,
  BOUTIQUE_LOCATION,
  ORDER_PHONE,
} from "@/lib/business-info";

const items = [
  {
    icon: Clock,
    title: BOUTIQUE_HOURS.label,
    detail: `${BOUTIQUE_HOURS.daysLabel} · commande en ligne`,
  },
  {
    icon: MapPin,
    title: BOUTIQUE_LOCATION.short,
    detail: BOUTIQUE_LOCATION.landmark,
  },
  {
    icon: Truck,
    title: "Livraison Cotonou",
    detail: "Zones A à E · dès 500 F",
  },
] as const;

/** Bandeau confiance — 3 infos, zéro animation. */
export function LandingTrustBar() {
  return (
    <section
      className="bg-muted py-10 sm:py-12"
      aria-label="Informations pratiques"
    >
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-3 sm:px-6">
        {items.map(({ icon: Icon, title, detail }) => (
          <div key={title} className="flex gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg text-primary">
              <Icon className="size-5" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <p className="font-body text-sm font-semibold text-text">{title}</p>
              <p className="mt-0.5 font-body text-sm text-muted-foreground">
                {detail}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-7xl px-4 text-center font-body text-sm text-muted-foreground sm:px-6">
        Une question ?{" "}
        <a
          href={`tel:${ORDER_PHONE.tel}`}
          className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline"
        >
          {ORDER_PHONE.display}
        </a>
        {" · "}
        <Link
          href="/contact"
          className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline"
        >
          Contact
        </Link>
      </p>
    </section>
  );
}
