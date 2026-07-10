import { formatPrice } from "@/lib/format";
import type { MenuPack } from "@/lib/landing-data";

type MenuPackCardProps = {
  pack: MenuPack;
};

export function MenuPackCard({ pack }: MenuPackCardProps) {
  return (
    <article
      className="w-[min(85vw,320px)] shrink-0 snap-start font-body"
      style={{
        backgroundColor: "#3B1F4D",
        border: "1px solid #C9A96E",
        borderRadius: "4px",
        padding: "20px",
      }}
    >
      <h4 className="font-display text-xl font-semibold text-white">
        {pack.name}
      </h4>

      <ul
        className="mt-4 space-y-1.5"
        style={{ color: "#F3C9CE", fontSize: "0.9rem" }}
      >
        {pack.includes.map((line) => (
          <li key={line}>· {line}</li>
        ))}
      </ul>

      <div className="relative mt-6 flex flex-wrap items-baseline gap-2">
        <span
          className="font-body text-sm text-white/50 line-through"
          aria-hidden
        >
          {formatPrice(pack.unitTotalPrice)}
        </span>
        <span className="font-body text-lg font-bold text-white">
          {formatPrice(pack.packPrice)}
        </span>
        <span
          className="absolute right-0 top-0 font-body font-bold uppercase text-accent"
          style={{ fontSize: "0.65rem", letterSpacing: "0.12em" }}
        >
          {pack.badgeLabel ?? "Pack"}
        </span>
      </div>
    </article>
  );
}
