import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { GoogleMapsEmbed } from "@/components/shop/google-maps-embed";
import { JsonLd } from "@/components/seo/json-ld";
import { deliveryFaq, deliveryZoneSeoContent } from "@/lib/seo/delivery-zone-content";
import { deliveryZones } from "@/lib/delivery-zones";
import { formatPrice } from "@/lib/format";
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
} from "@/lib/seo/schemas";
import { createPageMetadata } from "@/lib/seo/metadata";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = createPageMetadata({
  title: "Zones de livraison glace Cotonou",
  description:
    "Livraison de glaces artisanales à Cadjehoun, Fidjrossè, Akpakpa, Calavi et tout Cotonou. Frais par zone, commande en ligne rapide.",
  path: "/zones-de-livraison",
});

const breadcrumbs = [
  { name: "Accueil", path: "/" },
  { name: "Zones de livraison", path: "/zones-de-livraison" },
];

export default function DeliveryZonesPage() {
  return (
    <>
      <JsonLd
        data={[
          buildBreadcrumbSchema(breadcrumbs),
          buildFaqSchema([...deliveryFaq]),
        ]}
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        <Breadcrumbs items={breadcrumbs} />

        <h1 className="font-display text-4xl font-semibold text-primary sm:text-5xl">
          Livraison de glaces à Cotonou et environs
        </h1>
        <p className="mt-4 font-body text-lg leading-relaxed text-muted-foreground">
          Grille officielle Destinations E → A : de{" "}
          <span className="font-semibold text-text">500 F</span> à{" "}
          <span className="font-semibold text-text">1 500 F</span>. Choisissez
          votre quartier au checkout — les frais s&apos;ajoutent
          automatiquement.
        </p>

        <div className="mt-10 space-y-8">
          {deliveryZoneSeoContent.map((section) => {
            const zone = deliveryZones.find((z) => z.id === section.zoneId);
            if (!zone) return null;

            return (
              <article
                key={section.zoneId}
                id={zone.id}
                className="rounded-2xl border border-border bg-card p-6 sm:p-8"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="font-display text-2xl font-semibold text-primary">
                    {section.headline}
                  </h2>
                  <span className="rounded-full bg-accent px-4 py-1 font-body text-sm font-semibold text-accent-foreground">
                    {formatPrice(zone.price)}
                  </span>
                </div>
                <p className="mt-4 font-body leading-relaxed text-muted-foreground">
                  {section.intro}
                </p>
                <h3 className="mt-5 font-display text-lg font-semibold text-primary">
                  Quartiers desservis
                </h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {section.neighborhoods.map((neighborhood) => (
                    <li
                      key={neighborhood}
                      className="rounded-full bg-muted px-3 py-1 font-body text-sm text-text"
                    >
                      {neighborhood}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 font-body text-sm text-muted-foreground">
                  Délai estimé : {section.deliveryTime}
                </p>
              </article>
            );
          })}
        </div>

        <section className="mt-14">
          <h2 className="font-display text-3xl font-semibold text-primary">
            Où nous trouver
          </h2>
          <p className="mt-2 font-body text-muted-foreground">
            Retrait sur place ou repère pour la livraison — Cotonou.
          </p>
          <div className="mt-6">
            <GoogleMapsEmbed />
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-3xl font-semibold text-primary">
            Questions fréquentes
          </h2>
          <dl className="mt-6 space-y-6">
            {deliveryFaq.map((faq) => (
              <div
                key={faq.question}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <dt className="font-display text-lg font-semibold text-primary">
                  {faq.question}
                </dt>
                <dd className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-12 text-center">
          <Link
            href="/catalogue"
            className={cn(
              buttonVariants(),
              "cursor-pointer bg-accent text-accent-foreground hover:bg-accent/90",
            )}
          >
            Commander une glace en ligne
          </Link>
        </div>
      </div>
    </>
  );
}
