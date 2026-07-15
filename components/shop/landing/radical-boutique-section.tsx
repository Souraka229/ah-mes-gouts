"use client";

import Link from "next/link";
import { ArrowUpRight, Clock, MapPin, MessageCircle } from "lucide-react";

import {
  BOUTIQUE_HOURS,
  BOUTIQUE_LOCATION,
  ORDER_STEPS,
  WHATSAPP_PICKUP,
} from "@/lib/business-info";

import { GoldRibbon } from "@/components/shop/landing/gold-ribbon";
import { MaskLine, Reveal } from "@/components/shop/landing/reveal";
import { NightDaySection } from "@/components/shop/landing/night-day-section";

/** En boutique · Sur place — l'expérience physique à Cotonou. */
export function RadicalBoutiqueSection() {
  return (
    <NightDaySection
      tone="violet"
      id="boutique"
      ariaLabel="En boutique · Sur place"
      innerClassName="py-[15vh] lg:py-[18vh]"
    >
      {/* Fuite froide bleu nuit — rappel du second froid */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-[40%]"
        style={{
          background:
            "linear-gradient(260deg, rgba(31,43,77,0.6), transparent 72%)",
        }}
        aria-hidden
      />

      <div className="relative grid grid-cols-1 gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        {/* ── La plaque — adresse, horaires, retrait ── */}
        <div>
          <p className="flex items-center gap-3 font-body text-[11px] font-semibold uppercase tracking-[0.34em] text-secondary">
            <span className="h-px w-8 bg-accent" aria-hidden />
            L’expérience
          </p>
          <h2 className="mt-5 font-display text-bg">
            <MaskLine>
              <span
                className="block font-light italic leading-[0.98]"
                style={{ fontSize: "clamp(2.2rem, 5.5vw, 4.25rem)" }}
              >
                En boutique.
              </span>
            </MaskLine>
            <MaskLine delay={0.08}>
              <span
                className="block font-black uppercase leading-[0.88] tracking-[-0.01em]"
                style={{ fontSize: "clamp(1.9rem, 5vw, 3.75rem)" }}
              >
                Sur place.
              </span>
            </MaskLine>
          </h2>

          <Reveal delay={0.12}>
            <p className="mt-6 max-w-md font-body text-base leading-relaxed text-bg/70">
              On vous accueille à Fidjrosse. Récupérez votre pièce, ou
              installez-vous pour la déguster — comme dans une maison.
            </p>
          </Reveal>

          <div className="mt-9 space-y-5">
            <InfoRow icon={MapPin} label="L’adresse">
              {BOUTIQUE_LOCATION.full}
            </InfoRow>
            <InfoRow icon={Clock} label="Les horaires">
              {BOUTIQUE_HOURS.daysLabel} · {BOUTIQUE_HOURS.label}
            </InfoRow>
            <InfoRow icon={MessageCircle} label="Le retrait">
              WhatsApp obligatoire —{" "}
              <a
                href={WHATSAPP_PICKUP.waMe}
                className="text-bg underline decoration-accent/60 underline-offset-4 transition-colors hover:decoration-accent"
              >
                {WHATSAPP_PICKUP.display}
              </a>
            </InfoRow>
          </div>

          <Reveal delay={0.2}>
            <Link
              href="/infos"
              className="group mt-9 inline-flex min-h-12 items-center gap-2.5 rounded-full bg-accent px-7 py-3 font-body text-sm font-semibold text-text transition-shadow duration-500 hover:shadow-[0_18px_40px_-12px_rgba(201,169,110,0.7)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              Nous trouver
              <ArrowUpRight className="size-4 transition-transform duration-500 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </Link>
          </Reveal>
        </div>

        {/* ── Le parcours — timeline numérotée, le ruban la longe ── */}
        <div className="relative lg:pl-10">
          <GoldRibbon className="pointer-events-none absolute left-0 top-0 hidden h-full w-10 lg:block" />
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.3em] text-accent">
            Le parcours
          </p>
          <ol className="mt-6">
            {ORDER_STEPS.map((step, i) => (
              <li key={step.title}>
                <Reveal direction="left" delay={i * 0.07}>
                  <div className="flex gap-5 border-b border-bg/10 py-5">
                    <span className="font-display text-2xl font-light italic text-accent/80 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-semibold text-bg sm:text-2xl">
                        {step.title}
                      </h3>
                      <p className="mt-1 font-body text-sm text-bg/60">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </NightDaySection>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 border-t border-bg/10 pt-4">
      <Icon className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.5} aria-hidden />
      <div>
        <p className="font-body text-[10px] font-semibold uppercase tracking-[0.24em] text-bg/45">
          {label}
        </p>
        <p className="mt-1 font-body text-[15px] leading-relaxed text-bg/85">
          {children}
        </p>
      </div>
    </div>
  );
}
