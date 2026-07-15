"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Heart, MessageCircle } from "lucide-react";

import {
  CLIENT_TESTIMONIALS,
  SLOGAN_PASSION,
  SLOGAN_SOCIAL,
} from "@/lib/business-info";
import { cn } from "@/lib/utils";

import { MaskLine, Reveal } from "@/components/shop/landing/reveal";
import { NightDaySection } from "@/components/shop/landing/night-day-section";

/** Avis — retours WhatsApp réels, traités en objet de marque. */
export function RadicalSocialProofSection() {
  return (
    <NightDaySection
      tone="bluegray"
      ariaLabel="Retours clients"
      innerClassName="py-[13vh] lg:py-[15vh]"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(243,201,206,0.4) 0%, transparent 40%), radial-gradient(circle at 88% 72%, rgba(201,169,110,0.14) 0%, transparent 42%)",
        }}
        aria-hidden
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
            <Heart className="size-3.5 fill-secondary text-secondary" aria-hidden />
            Vos retours
          </p>
          <h2 className="mt-3 font-display text-primary">
            <MaskLine>
              <span
                className="block font-light italic leading-[1.02]"
                style={{ fontSize: "clamp(1.9rem, 4.4vw, 3.25rem)" }}
              >
                Notre plus belle
              </span>
            </MaskLine>
            <MaskLine delay={0.08}>
              <span
                className="block font-black uppercase leading-[0.9]"
                style={{ fontSize: "clamp(1.7rem, 4vw, 2.75rem)" }}
              >
                récompense
              </span>
            </MaskLine>
          </h2>
        </div>
        <Link
          href="/catalogue"
          className="group inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-accent px-6 py-3 font-body text-sm font-semibold text-text transition-shadow duration-500 hover:shadow-[0_18px_40px_-12px_rgba(201,169,110,0.7)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:self-auto"
        >
          Voir la carte
          <ArrowUpRight className="size-4 transition-transform duration-500 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        </Link>
      </div>

      <div className="relative mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <ul className="space-y-5">
          {CLIENT_TESTIMONIALS.map((t, i) => (
            <li key={t.id}>
              <Reveal direction="up" delay={i * 0.08}>
                <div
                  className={cn(
                    "rounded-[2px] border border-accent/25 bg-white/70 p-5 backdrop-blur-sm",
                    i === 1 && "lg:ml-10",
                  )}
                >
                  <div className="mb-3 flex items-center gap-2 font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <MessageCircle className="size-3.5 text-success" aria-hidden />
                    WhatsApp · {t.productHint}
                  </div>
                  <div className="space-y-2.5">
                    <p className="max-w-[88%] rounded-2xl rounded-tl-sm bg-success/15 px-4 py-2.5 font-body text-sm text-text">
                      {t.quote}
                    </p>
                    <p className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 font-body text-sm text-bg">
                      {t.reply}
                    </p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>

        {/* Le flyer comme pièce encadrée */}
        <Reveal direction="left" delay={0.12}>
          <figure className="relative">
            <div className="relative rounded-[2px] border border-accent/30 p-2">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1px] sm:aspect-[3/4]">
                <Image
                  src="/images/brand/flyer-retours-formats.png"
                  alt="Entremets en cœur et en carré — retours clients"
                  fill
                  sizes="(max-width: 1024px) 90vw, 420px"
                  className="object-cover object-top"
                />
                <div
                  className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-16"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(59,31,77,0.95), rgba(59,31,77,0.55) 55%, transparent)",
                  }}
                >
                  <p className="font-display text-xl font-semibold italic text-bg">
                    En cœur · En carré
                  </p>
                  <p className="mt-1 font-body text-sm text-bg/80">
                    {SLOGAN_PASSION}
                  </p>
                </div>
              </div>
            </div>
          </figure>
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <p className="relative mt-10 text-center font-display text-lg font-light italic text-primary/70">
          {SLOGAN_SOCIAL}
        </p>
      </Reveal>
    </NightDaySection>
  );
}
