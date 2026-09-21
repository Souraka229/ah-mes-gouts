import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * Bandeau « menu du jour en ligne ».
 *
 * Il n'apparaît que les jours où un menu est **réellement publié**, et il est
 * piloté par les mêmes données que la section menu de la page : il ne peut donc
 * pas annoncer un menu qui n'existe pas. Le menu du jour étant journalier, il
 * disparaît de lui-même une fois le menu expiré.
 *
 * Reste en noir plutôt qu'en rouge : le rouge est réservé au CTA principal et
 * aux prix (règle 60/30/10), et le hero en porte déjà un sur le même écran.
 */
export function LandingMenuBanner({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <aside aria-label="Menu du jour" className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="flex items-start gap-2 font-body text-sm leading-snug sm:items-center">
          <Sparkles className="mt-0.5 size-4 shrink-0 sm:mt-0" aria-hidden />
          <span>
            <span className="font-semibold">Le menu du jour est en ligne</span>
            {" — "}
            {count} création{count > 1 ? "s" : ""} disponible
            {count > 1 ? "s" : ""} aujourd&apos;hui.
          </span>
        </p>

        <Link
          href="/catalogue"
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-full border border-white/25 px-4 py-1.5 font-body text-sm font-semibold transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:self-auto"
        >
          Voir le menu
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </aside>
  );
}
