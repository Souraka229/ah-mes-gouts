import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Clock3,
  Phone,
  Store,
  MessageCircle,
} from "lucide-react";

import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonVariants } from "@/components/ui/button";
import {
  BOUTIQUE_HOURS,
  CHECKOUT_NOTICES,
  LATE_PENALTIES,
  ORDER_PHONE,
  ORDER_STEPS,
  ORGANIZATION_RULES,
  PICKUP_RULES,
  SLOGAN,
  WHATSAPP_PICKUP,
} from "@/lib/business-info";
import { PICKUP_ADDRESS } from "@/lib/delivery/constants";
import { createPageMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbSchema } from "@/lib/seo/schemas";
import { SITE_NAME } from "@/lib/seo/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = createPageMetadata({
  title: `Infos & règles — ${SITE_NAME}`,
  description:
    "Comment commander, horaires boutique, règles de retrait sur place et informations importantes.",
  path: "/infos",
});

const breadcrumbs = [
  { name: "Accueil", path: "/" },
  { name: "Infos", path: "/infos" },
];

export default function InfosPage() {
  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <Breadcrumbs items={breadcrumbs} />

        <h1 className="font-display text-4xl font-semibold text-primary sm:text-5xl">
          Infos importantes
        </h1>
        <p className="mt-3 font-body text-muted-foreground">{SLOGAN}</p>

        <section className="mt-10 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-primary">
            <Store className="size-5" aria-hidden />
            <h2 className="font-display text-2xl font-semibold">Boutique</h2>
          </div>
          <ul className="mt-4 space-y-2 font-body text-sm text-text">
            <li className="flex items-start gap-2">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              <span>
                Horaires : <strong>{BOUTIQUE_HOURS.label}</strong> (
                {BOUTIQUE_HOURS.daysLabel})
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Store className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              <span>{PICKUP_ADDRESS}</span>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              <a
                href={`tel:${ORDER_PHONE.tel}`}
                className="cursor-pointer hover:text-primary hover:underline"
              >
                {ORDER_PHONE.display}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MessageCircle
                className="mt-0.5 size-4 shrink-0 text-accent"
                aria-hidden
              />
              <span>
                WhatsApp retrait :{" "}
                <a
                  href={WHATSAPP_PICKUP.waMe}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer font-medium hover:text-primary hover:underline"
                >
                  {WHATSAPP_PICKUP.display}
                </a>
              </span>
            </li>
          </ul>
          <p className="mt-4 font-body text-sm text-muted-foreground">
            Modes : <strong>sur place</strong>, <strong>à emporter</strong> ou{" "}
            <strong>livraison</strong> à Cotonou.
          </p>
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl font-semibold text-primary">
            Comment commander
          </h2>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            {CHECKOUT_NOTICES.menuEve}
          </p>
          <ol className="mt-6 space-y-4">
            {ORDER_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-body text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <div>
                  <p className="font-display text-lg font-semibold text-primary">
                    {step.title}
                  </p>
                  <p className="font-body text-sm text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl font-semibold text-primary">
            Organisation
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 font-body text-sm text-text">
            {ORGANIZATION_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-secondary bg-secondary/20 p-6">
          <div className="flex items-center gap-2 text-primary">
            <AlertTriangle className="size-5" aria-hidden />
            <h2 className="font-display text-2xl font-semibold">
              Retrait le jour prévu
            </h2>
          </div>
          <ul className="mt-4 list-disc space-y-2 pl-5 font-body text-sm text-text">
            {PICKUP_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>

          <h3 className="mt-6 font-display text-lg font-semibold text-primary">
            Pénalités de retard
          </h3>
          <ul className="mt-3 space-y-2 font-body text-sm text-text">
            {LATE_PENALTIES.map((item) => (
              <li
                key={item.type}
                className="flex justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3"
              >
                <span>{item.type}</span>
                <span className="font-semibold whitespace-nowrap">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/catalogue"
            className={cn(
              buttonVariants(),
              "min-h-11 cursor-pointer bg-accent text-text hover:bg-accent/90",
            )}
          >
            Voir la carte
          </Link>
          <Link
            href="/checkout"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "min-h-11 cursor-pointer",
            )}
          >
            Commander
          </Link>
        </div>
      </div>
    </>
  );
}
