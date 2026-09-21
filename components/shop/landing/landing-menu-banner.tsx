import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * Bandeau « menu du jour ».
 *
 * Il n'apparaît que les jours où un menu est **réellement publié**, et il est
 * piloté par les mêmes données que la section menu de la page : il ne peut donc
 * pas annoncer un menu qui n'existe pas. Le menu du jour étant journalier, il
 * disparaît de lui-même une fois le menu expiré.
 *
 * Reste en noir plutôt qu'en rouge : le rouge est réservé au CTA principal et
 * aux prix (règle 60/30/10), et le hero en porte déjà un sur le même écran.
 *
 * Deux partis pris d'écriture, pour ne pas sonner comme une page générée :
 *
 *  - **Aucune icône.** Une étincelle (Sparkles) devant une annonce est le tic
 *    le plus reconnaissable qui soit, et elle n'apprend rien. Le reste de la
 *    page n'en met pas : chaque section ouvre sur un sur-titre en capitales
 *    espacées. Le bandeau suit la même règle, il a l'air d'appartenir au site.
 *  - **On parle de ce qu'on vend, pas de notre site.** « Le menu est en ligne »
 *    décrit l'état d'une page ; une boutique annonce ce qu'elle a aujourd'hui
 *    et en quelle quantité. C'est aussi l'information qui manque au visiteur :
 *    la section plus bas dit *quoi*, le bandeau dit *combien de temps*.
 */

/** Sur-titre du site — capitales, très espacées, comme chaque section. */
const EYEBROW_CLASS =
  "font-body text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55";

export function LandingMenuBanner({ count }: { count: number }) {
  if (count <= 0) return null;

  const creations = `${count} création${count > 1 ? "s" : ""}`;

  return (
    <aside aria-label="Menu du jour" className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 lg:px-8">
        <p className="font-body text-sm leading-snug">
          <span className={EYEBROW_CLASS}>Aujourd&apos;hui seulement</span>
          <span className="mt-0.5 block">
            <span className="font-semibold">{creations}</span> en quantité
            limitée.
          </span>
        </p>

        <Link
          href="/catalogue"
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-full border border-white/25 px-4 py-1.5 font-body text-sm font-semibold transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:self-auto"
        >
          Voir le menu du jour
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </aside>
  );
}
