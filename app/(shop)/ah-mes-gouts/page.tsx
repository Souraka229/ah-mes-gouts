import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { getYearsOfCraft } from "@/lib/about-content";
import { buildBrandFaqs } from "@/lib/brand-content";
import { LANDING_PHOTOS } from "@/lib/landing-data";
import { createPageMetadata } from "@/lib/seo/metadata";
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildOrganizationSchema,
  buildParentBrandSchema,
} from "@/lib/seo/schemas";
import { ORIGIN_BRAND, SITE_NAME, SITE_URL } from "@/lib/seo/site";
import { cn } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = createPageMetadata({
  title: `${ORIGIN_BRAND} — Maison pâtissière artisanale à Cotonou`,
  description: `${ORIGIN_BRAND} : ${getYearsOfCraft()} ans de pâtisserie artisanale à Fidjrossè, Cotonou. ${SITE_NAME} est la boutique en ligne officielle — entremets, fleurs et livraison.`,
  path: "/ah-mes-gouts",
  ogImage: LANDING_PHOTOS.heroCoeurOr,
});

export default function AhMesGoutsPage() {
  const years = getYearsOfCraft();
  const faqs = buildBrandFaqs();

  const breadcrumbs = [
    { name: "Accueil", path: "/" },
    { name: ORIGIN_BRAND, path: "/ah-mes-gouts" },
  ];

  return (
    <>
      <JsonLd
        data={[
          buildParentBrandSchema(),
          buildOrganizationSchema(),
          buildBreadcrumbSchema(breadcrumbs),
          buildFaqSchema(faqs),
          {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            "@id": `${SITE_URL}/ah-mes-gouts#page`,
            name: `${ORIGIN_BRAND} — Maison pâtissière`,
            url: `${SITE_URL}/ah-mes-gouts`,
            inLanguage: "fr-BJ",
            about: { "@id": `${SITE_URL}/#parent-brand` },
            mainEntity: { "@id": `${SITE_URL}/#parent-brand` },
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

          <header className="mt-6">
            <p className="font-body text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Maison pâtissière · Cotonou · {years}ᵉ année
            </p>
            <h1 className="mt-4 font-display text-[clamp(2.4rem,7vw,3.75rem)] font-semibold leading-[1.02] tracking-tight text-balance text-primary">
              {ORIGIN_BRAND}
            </h1>
            <p className="mt-3 font-display text-[clamp(1.15rem,3vw,1.5rem)] font-medium text-secondary">
              {SITE_NAME}
            </p>
            <p className="mt-2 font-body text-sm uppercase tracking-[0.18em] text-muted-foreground">
              La boutique en ligne officielle de la maison
            </p>
            <p className="mt-6 font-body text-lg leading-relaxed text-muted-foreground">
              {ORIGIN_BRAND} est née à Fidjrossè d&apos;une obsession pour la
              texture — celle qui fond au bon moment, ni trop vite ni trop tard.
              {SITE_NAME} en est la vitrine digitale : le menu du jour, les
              entremets sur commande, les bouquets et les cadeaux, livrés à
              Cotonou ou retirés en boutique.
            </p>
          </header>

          <figure className="shadow-lift relative mt-10 aspect-4/5 overflow-hidden rounded-[2rem] bg-photo-bg sm:aspect-16/11">
            <Image
              src={LANDING_PHOTOS.heroCoeurOr}
              alt={`Entremets signature — ${ORIGIN_BRAND}, maison pâtissière à Cotonou`}
              fill
              priority
              sizes="(min-width: 768px) 48rem, 92vw"
              quality={85}
              className="object-cover"
            />
          </figure>

          <section className="mt-16">
            <h2 className="font-display text-[clamp(1.6rem,3.6vw,2.25rem)] font-semibold leading-tight text-balance text-primary">
              Deux noms, une seule exigence
            </h2>
            <div className="mt-6 space-y-4 font-body text-base leading-relaxed text-muted-foreground">
              <p>
                <strong className="font-semibold text-primary">{ORIGIN_BRAND}</strong>{" "}
                désigne la maison — l&apos;atelier, la recherche, les recettes,
                les {years} années de perfectionnement. C&apos;est le nom que
                portent l&apos;Instagram, la réputation et le savoir-faire.
              </p>
              <p>
                <strong className="font-semibold text-primary">{SITE_NAME}</strong>{" "}
                est la ligne commerciale en ligne : catalogue, commande,
                paiement Mobile Money, livraison et suivi en temps réel. Tout ce
                que vous commandez sur ce site est préparé par la maison{" "}
                {ORIGIN_BRAND}.
              </p>
            </div>
          </section>

          <section className="mt-16 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Menu du jour",
                body: "Entremets en pièces, préparés chaque matin en petite série.",
              },
              {
                title: "Sur commande",
                body: "Grands entremets à la part, signatures et classiques.",
              },
              {
                title: "Fleurs & cadeaux",
                body: "Roses, bouquets, nounours — disponibles en permanence.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="shadow-soft rounded-3xl bg-white p-6"
              >
                <Sparkles
                  className="size-5 text-accent"
                  strokeWidth={1.6}
                  aria-hidden
                />
                <h3 className="mt-3 font-display text-lg font-semibold text-primary">
                  {item.title}
                </h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </article>
            ))}
          </section>

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

          <div className="mt-16 flex flex-col gap-4 border-t border-border pt-10 sm:flex-row">
            <Link
              href="/catalogue"
              className={cn(
                buttonVariants({ variant: "cta", size: "lg" }),
                "cursor-pointer gap-2 rounded-full px-8",
              )}
            >
              Commander sur {SITE_NAME}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/a-propos"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "cursor-pointer rounded-full px-8",
              )}
            >
              Découvrir l&apos;atelier
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
