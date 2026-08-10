import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { GoogleMapsEmbed } from "@/components/shop/google-maps-embed";
import { JsonLd } from "@/components/seo/json-ld";
import {
  BOUTIQUE_HOURS,
  BOUTIQUE_LOCATION,
  ORDER_PHONE,
  WHATSAPP_PICKUP,
} from "@/lib/business-info";
import { BUSINESS, SITE_NAME, SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";
import { buildBreadcrumbSchema } from "@/lib/seo/schemas";
import { createPageMetadata } from "@/lib/seo/metadata";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = createPageMetadata({
  title: `Contact — ${SITE_NAME} Cotonou`,
  description: `Contactez ${SITE_NAME_WITH_CREDIT} à Fidjrosse, Cotonou. Téléphone, WhatsApp, itinéraire.`,
  path: "/contact",
});

const breadcrumbs = [
  { name: "Accueil", path: "/" },
  { name: "Contact", path: "/contact" },
];

export default function ContactPage() {
  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        <Breadcrumbs items={breadcrumbs} />

        <h1 className="font-display text-4xl font-semibold text-primary sm:text-5xl">
          Nous contacter
        </h1>
        <p className="mt-4 font-body text-lg text-muted-foreground">
          En boutique · Sur place — {BOUTIQUE_LOCATION.full}. Horaires{" "}
          {BOUTIQUE_HOURS.label} ({BOUTIQUE_HOURS.daysLabel.toLowerCase()}).
        </p>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <dt className="font-body text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Téléphone
            </dt>
            <dd className="mt-2 font-display text-xl text-primary">
              <a href={`tel:${ORDER_PHONE.tel}`} className="hover:underline">
                {ORDER_PHONE.display}
              </a>
            </dd>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <dt className="font-body text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              WhatsApp retrait
            </dt>
            <dd className="mt-2 font-display text-xl text-primary">
              <a
                href={WHATSAPP_PICKUP.waMe}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {WHATSAPP_PICKUP.display}
              </a>
            </dd>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <dt className="font-body text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Adresse
            </dt>
            <dd className="mt-2 font-body text-primary">
              {BOUTIQUE_LOCATION.full}
            </dd>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <dt className="font-body text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              E-mail
            </dt>
            <dd className="mt-2 font-body text-primary">
              <a href={`mailto:${BUSINESS.email}`} className="hover:underline">
                {BUSINESS.email}
              </a>
            </dd>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 sm:col-span-2">
            <dt className="font-body text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Infos
            </dt>
            <dd className="mt-2 font-body text-primary">
              <Link href="/infos" className="hover:underline">
                Règles, horaires & pénalités →
              </Link>
            </dd>
          </div>
        </dl>

        <div className="mt-10">
          <h2 className="font-display text-2xl font-semibold text-primary">
            La boutique
          </h2>
          <GoogleMapsEmbed className="mt-4" />
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/catalogue"
            className={cn(
              buttonVariants(),
              "cursor-pointer bg-accent text-accent-foreground hover:bg-accent/90",
            )}
          >
            Commander en ligne
          </Link>
        </div>
      </div>
    </>
  );
}
