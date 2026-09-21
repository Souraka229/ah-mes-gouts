import Image from "next/image";

import { LANDING_AMBIANCE } from "@/lib/landing-data";

/**
 * Bannière cadeau — écrin de nuit.
 *
 * Volontairement **sans bouton** : le texte porte seul l'invitation, et la
 * navigation se fait par le menu et les sections voisines. La section reste en
 * noir plutôt qu'en rouge, le rouge étant réservé au CTA principal de la page.
 */
export function LandingGiftBanner() {
  const thumbs = LANDING_AMBIANCE.slice(0, 3);

  return (
    <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
      <div className="night-panel mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] px-7 py-16 sm:px-14 sm:py-20">
        <div className="max-w-2xl">
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
            Offrir, sans se tromper
          </p>

          <h2 className="mt-4 font-display text-[clamp(1.9rem,4.4vw,3rem)] font-semibold leading-tight text-balance text-white">
            Un entremets dit ce qu’une carte ne sait pas dire.
          </h2>

          <p className="mt-5 max-w-lg font-body text-base leading-relaxed text-white/75">
            Message manuscrit, emballage soigné, livraison au créneau choisi.
            Vous nous dites l’occasion, on s’occupe du reste.
          </p>

          <div className="mt-9 flex items-center gap-4">
            <div className="flex" aria-hidden>
              {thumbs.map((src, index) => (
                <span
                  key={src}
                  className={`relative block size-10 overflow-hidden rounded-full border-[2.5px] border-nuit bg-photo-bg ${
                    index > 0 ? "-ml-3" : ""
                  }`}
                >
                  <Image src={src} alt="" fill sizes="40px" className="object-cover" />
                </span>
              ))}
            </div>
            <p className="font-body text-sm text-white/70">
              Emballage cadeau et mot manuscrit offerts
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
