import Image from "next/image";
import Link from "next/link";

import type { MenuShowcaseItem } from "@/lib/server/shop-catalog";

type LandingGiftBannerProps = {
  /** Vignettes utilisées comme preuve visuelle — vraies créations, pas des avatars. */
  thumbs: MenuShowcaseItem[];
};

/**
 * Bannière cadeau — écrin de nuit.
 *
 * Un grand aplat rouge casserait le 60/30/10 : le rouge reste réservé au CTA,
 * qui est ici l'unique touche colorée de la section.
 */
export function LandingGiftBanner({ thumbs }: LandingGiftBannerProps) {
  const visible = thumbs.slice(0, 3);

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

          <Link
            href="/catalogue"
            className="mt-9 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-accent px-8 font-body text-base font-semibold text-accent-foreground shadow-sm transition-[transform,box-shadow] duration-300 hover:scale-[1.02] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:hover:scale-100"
          >
            Composer un cadeau
          </Link>

          {visible.length > 0 && (
            <div className="mt-9 flex items-center gap-4">
              <div className="flex" aria-hidden>
                {visible.map((item, index) => (
                  <span
                    key={item.id}
                    className={`relative block size-10 overflow-hidden rounded-full border-[2.5px] border-nuit bg-photo-bg ${
                      index > 0 ? "-ml-3" : ""
                    }`}
                  >
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </span>
                ))}
              </div>
              <p className="font-body text-sm text-white/70">
                Emballage cadeau et mot manuscrit offerts
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
