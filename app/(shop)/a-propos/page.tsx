import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, MapPin, Phone } from "lucide-react";

import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonVariants } from "@/components/ui/button";
import {
  BOUTIQUE_HOURS,
  BOUTIQUE_LOCATION,
  ORDER_PHONE,
} from "@/lib/business-info";
import {
  buildAboutFaq,
  CAKE_FORMATS,
  CLASSIC_FLAVOURS,
  CLASSIC_PRICE_PER_PART,
  getYearsOfCraft,
  SIGNATURE_RECIPES,
} from "@/lib/about-content";
import { formatPrice } from "@/lib/format";
import { LANDING_PHOTOS } from "@/lib/landing-data";
import { createPageMetadata } from "@/lib/seo/metadata";
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildOrganizationSchema,
} from "@/lib/seo/schemas";
import { BUSINESS, SITE_NAME, SITE_URL } from "@/lib/seo/site";
import { cn } from "@/lib/utils";

/** Contenu quasi statique : une régénération par jour suffit. */
export const revalidate = 86400;

export const metadata: Metadata = createPageMetadata({
  title: "La maison — pâtisserie à Fidjrossè",
  description:
    "Pâtisserie artisanale à Fidjrossè, Cotonou. Entremets glacés faits main, créations signatures Tropicana, Afrodisiak et Bananut, formats sur commande et livraison à Cotonou.",
  path: "/a-propos",
  ogImage: LANDING_PHOTOS.heroCoeurOr,
});

export default function AboutPage() {
  const years = getYearsOfCraft();
  const payments = BUSINESS.paymentAccepted.join(", ");

  const faqs = buildAboutFaq({
    siteName: SITE_NAME,
    address: BOUTIQUE_LOCATION.full,
    hours: BOUTIQUE_HOURS.label,
    days: BOUTIQUE_HOURS.daysLabel,
    phone: ORDER_PHONE.display,
    payments,
    years,
  });

  const breadcrumbs = [
    { name: "Accueil", path: "/" },
    { name: "La maison", path: "/a-propos" },
  ];

  return (
    <>
      <JsonLd
        data={[
          buildBreadcrumbSchema(breadcrumbs),
          buildOrganizationSchema(),
          buildFaqSchema(faqs),
          {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            "@id": `${SITE_URL}/a-propos#page`,
            name: `La maison — ${SITE_NAME}`,
            url: `${SITE_URL}/a-propos`,
            inLanguage: "fr-BJ",
            about: { "@id": `${SITE_URL}/#brand` },
          },
        ]}
      />

      <div className="relative overflow-hidden">
        <div
          className="blob blob-lg -left-40 -top-48 h-[34rem] w-[34rem] bg-muted opacity-70"
          aria-hidden
        />
        <div
          className="blob -right-32 top-40 h-80 w-80 bg-bluegray opacity-55"
          aria-hidden
        />

        <div className="relative z-1 mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <Breadcrumbs items={breadcrumbs} />

          {/* ── Ouverture ─────────────────────────────────────────── */}
          <header className="mt-6">
            <p className="font-body text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {BOUTIQUE_LOCATION.short} · {years} ans de maison
            </p>
            <h1 className="mt-4 font-display text-[clamp(2.1rem,6vw,3.25rem)] font-semibold leading-[1.05] tracking-tight text-balance text-primary">
              Une pâtisserie de Fidjrossè, entièrement faite à la main
            </h1>
            <p className="mt-6 font-body text-lg leading-relaxed text-muted-foreground">
              {SITE_NAME} est un atelier de pâtisserie installé à Fidjrossè, à
              Cotonou. Nous façonnons des entremets glacés en très petite série,
              du montage au glaçage, sans moule industriel et sans stock dormant.
            </p>
          </header>

          <figure className="shadow-lift relative mt-10 aspect-4/5 overflow-hidden rounded-[2rem] bg-photo-bg sm:aspect-16/11">
            <Image
              src={LANDING_PHOTOS.heroCoeurOr}
              alt={`Entremets cœur au glaçage ivoire et feuille d'or — ${SITE_NAME}, Cotonou`}
              fill
              priority
              sizes="(min-width: 768px) 48rem, 92vw"
              quality={85}
              className="object-cover"
            />
          </figure>

          {/* ── Histoire ──────────────────────────────────────────── */}
          <section className="mt-16">
            <h2 className="font-display text-[clamp(1.6rem,3.6vw,2.25rem)] font-semibold leading-tight text-balance text-primary">
              {years} ans de recherche, d&apos;erreurs et de perfectionnement
            </h2>
            <div className="mt-5 space-y-4 font-body text-base leading-relaxed text-muted-foreground">
              <p>
                La maison a commencé avec une conviction simple : une bonne
                texture ne s&apos;improvise pas. Elle se cherche, se rate, se
                recommence. {years} années de tests quotidiens ont donné une
                carte courte, où chaque recette a été gardée parce qu&apos;elle
                tenait — et beaucoup d&apos;autres abandonnées parce qu&apos;elles
                ne tenaient pas.
              </p>
              <p>
                Nous préparons le jour même. Rien ne dort au froid plus
                d&apos;une nuit, et ce qui n&apos;est pas vendu ne se retrouve
                pas au menu du lendemain. C&apos;est ce qui explique les petites
                séries et les quantités limitées : nous préférons manquer que
                servir un entremets qui a attendu.
              </p>
            </div>
          </section>

          {/* ── Signatures ────────────────────────────────────────── */}
          <section className="mt-16">
            <h2 className="font-display text-[clamp(1.6rem,3.6vw,2.25rem)] font-semibold leading-tight text-balance text-primary">
              Trois créations qui n&apos;existent qu&apos;ici
            </h2>
            <p className="mt-4 font-body text-base leading-relaxed text-muted-foreground">
              Elles marient des produits d&apos;ici — bissap, ananas, gingembre,
              arachide — à des techniques de pâtisserie française. Comptez 72 h,
              elles se montent à la commande.
            </p>

            <ul className="mt-8 space-y-4">
              {SIGNATURE_RECIPES.map((recipe) => (
                <li
                  key={recipe.name}
                  className="shadow-soft rounded-3xl bg-white p-6"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="font-display text-xl font-semibold text-primary">
                      {recipe.name}
                    </h3>
                    <p className="font-display text-lg font-semibold text-accent tabular-nums">
                      {formatPrice(recipe.pricePerPart)}
                      <span className="font-body text-xs text-muted-foreground">
                        {" "}
                        / part
                      </span>
                    </p>
                  </div>
                  <p className="mt-2 font-body text-base text-muted-foreground">
                    {recipe.composition}.
                  </p>
                  <p className="mt-1 font-body text-sm text-muted-foreground/80">
                    {recipe.note}.
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* ── Carte permanente ──────────────────────────────────── */}
          <section className="mt-16">
            <h2 className="font-display text-[clamp(1.6rem,3.6vw,2.25rem)] font-semibold leading-tight text-balance text-primary">
              La carte permanente
            </h2>
            <p className="mt-4 font-body text-base leading-relaxed text-muted-foreground">
              Dix parfums disponibles toute l&apos;année, à{" "}
              {formatPrice(CLASSIC_PRICE_PER_PART)} la part, quel que soit le
              format.
            </p>

            <ul className="mt-6 flex flex-wrap gap-2">
              {CLASSIC_FLAVOURS.map((flavour) => (
                <li
                  key={flavour}
                  className="rounded-full border border-border bg-white px-4 py-2 font-body text-sm text-primary"
                >
                  {flavour}
                </li>
              ))}
            </ul>

            <h3 className="mt-10 font-display text-xl font-semibold text-primary">
              Formats sur commande
            </h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse font-body text-sm">
                <tbody>
                  {CAKE_FORMATS.map((format) => (
                    <tr key={format.label} className="border-b border-border">
                      <td className="py-3 pr-4 text-primary">{format.label}</td>
                      <td className="py-3 text-right whitespace-nowrap text-muted-foreground tabular-nums">
                        {format.from
                          ? `à partir de ${formatPrice(format.from)}`
                          : "sur devis"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Infos pratiques ───────────────────────────────────── */}
          <section className="mt-16">
            <h2 className="font-display text-[clamp(1.6rem,3.6vw,2.25rem)] font-semibold leading-tight text-balance text-primary">
              Nous trouver
            </h2>

            <dl className="mt-6 space-y-5">
              <div className="flex gap-4">
                <MapPin
                  className="mt-0.5 size-5 shrink-0 text-secondary"
                  strokeWidth={1.7}
                  aria-hidden
                />
                <div>
                  <dt className="font-body text-sm font-semibold text-primary">
                    Atelier et boutique
                  </dt>
                  <dd className="font-body text-base text-muted-foreground">
                    {BOUTIQUE_LOCATION.full}
                  </dd>
                </div>
              </div>

              <div className="flex gap-4">
                <Clock
                  className="mt-0.5 size-5 shrink-0 text-secondary"
                  strokeWidth={1.7}
                  aria-hidden
                />
                <div>
                  <dt className="font-body text-sm font-semibold text-primary">
                    Horaires
                  </dt>
                  <dd className="font-body text-base text-muted-foreground">
                    {BOUTIQUE_HOURS.label} — {BOUTIQUE_HOURS.daysLabel}
                  </dd>
                </div>
              </div>

              <div className="flex gap-4">
                <Phone
                  className="mt-0.5 size-5 shrink-0 text-secondary"
                  strokeWidth={1.7}
                  aria-hidden
                />
                <div>
                  <dt className="font-body text-sm font-semibold text-primary">
                    Téléphone et WhatsApp
                  </dt>
                  <dd className="font-body text-base">
                    <a
                      href={`tel:${ORDER_PHONE.tel}`}
                      className="cursor-pointer text-muted-foreground underline-offset-4 transition-colors hover:text-secondary hover:underline"
                    >
                      {ORDER_PHONE.display}
                    </a>
                  </dd>
                </div>
              </div>
            </dl>

            <p className="mt-6 font-body text-base leading-relaxed text-muted-foreground">
              Paiement en ligne par {payments}, en FCFA. Livraison à Cotonou en
              trois tournées — 13h30-15h30, 15h30-17h30 et 17h30-19h30 — ou
              retrait en boutique sur le créneau de votre choix.
            </p>
          </section>

          {/* ── FAQ ───────────────────────────────────────────────── */}
          <section className="mt-16">
            <h2 className="font-display text-[clamp(1.6rem,3.6vw,2.25rem)] font-semibold leading-tight text-balance text-primary">
              Questions fréquentes
            </h2>

            <div className="mt-8 space-y-7">
              {faqs.map((faq) => (
                <article key={faq.question}>
                  <h3 className="font-display text-lg font-semibold text-primary">
                    {faq.question}
                  </h3>
                  <p className="mt-2 font-body text-base leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <div className="mt-16 border-t border-border pt-10">
            <Link
              href="/catalogue"
              className={cn(
                buttonVariants({ variant: "cta", size: "lg" }),
                "cursor-pointer gap-2 rounded-full px-8",
              )}
            >
              Voir le menu du jour
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
