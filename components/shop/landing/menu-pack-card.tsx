import { formatPrice } from "@/lib/format";
import type { MenuPack } from "@/lib/landing-data";

type MenuPackCardProps = {
  pack: MenuPack;
};

export function MenuPackCard({ pack }: MenuPackCardProps) {
  return (
    <article className="w-[min(85vw,320px)] shrink-0 snap-start rounded-[2px] border border-accent/60 bg-primary p-6 font-body">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-display text-2xl font-semibold text-bg">
          {pack.name}
        </h4>
        <span className="mt-1 shrink-0 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
          {pack.badgeLabel ?? "Pack"}
        </span>
      </div>

      <ul className="mt-4 space-y-1.5 text-sm text-secondary">
        {pack.includes.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="text-accent" aria-hidden>
              ·
            </span>
            {line}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-baseline gap-2.5">
        <span className="font-body text-sm text-bg/45 line-through" aria-hidden>
          {formatPrice(pack.unitTotalPrice)}
        </span>
        <span className="font-display text-2xl font-semibold text-bg">
          {formatPrice(pack.packPrice)}
        </span>
      </div>
    </article>
  );
}
