import Image from "next/image";
import Link from "next/link";

import { LANDING_SIGNATURES } from "@/lib/landing-data";

/**
 * Signatures — pastilles rondes volontairement désalignées.
 *
 * Vitrine éditoriale, pas le menu du jour : ces six créations racontent le
 * savoir-faire et ne changent pas d'un jour à l'autre. Ce qui est réellement
 * commandable vit dans la section « menu du jour », qui n'apparaît qu'une fois
 * le menu planifié et publié.
 *
 * L'irrégularité est le sujet : alignées au pixel, ces pastilles feraient
 * « catalogue » ; décalées, elles font « composition ». Le décalage est
 * désactivé sous 768 px, où il ne produirait qu'un empilement bancal.
 */
const OFFSETS = [
  "md:-translate-y-4",
  "",
  "md:translate-y-5",
  "md:-translate-y-2.5",
  "",
  "md:translate-y-3.5",
];

export function LandingSignatures() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div
        className="blob blob-lg left-1/2 -top-32 h-[44rem] w-[44rem] -translate-x-1/2 bg-muted opacity-60"
        aria-hidden
      />

      <div className="relative z-1 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="font-body text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
          ✦ Nos signatures
        </p>
        <h2 className="mx-auto mt-4 max-w-[18ch] font-display text-[clamp(2rem,4.5vw,3rem)] font-semibold leading-tight text-balance text-primary">
          Celles qu’on nous redemande
        </h2>

        <ul className="mt-14 flex flex-wrap items-start justify-center gap-x-8 gap-y-8 sm:gap-x-10 lg:mt-18">
          {LANDING_SIGNATURES.map((item, index) => (
            <li key={item.id} className={OFFSETS[index]}>
              <Link
                href="/catalogue"
                className="group flex cursor-pointer flex-col items-center focus-visible:outline-none"
              >
                <span className="shadow-soft relative block size-32 overflow-hidden rounded-full bg-photo-bg transition-[transform,box-shadow] duration-500 group-hover:scale-[1.08] group-hover:shadow-lift group-focus-visible:ring-2 group-focus-visible:ring-secondary group-focus-visible:ring-offset-2 motion-reduce:group-hover:scale-100 sm:size-[9.5rem]">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="152px"
                    className="object-cover"
                  />
                </span>
                <span className="mt-4 font-body text-sm font-semibold text-primary transition-opacity duration-400 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
                  {item.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
