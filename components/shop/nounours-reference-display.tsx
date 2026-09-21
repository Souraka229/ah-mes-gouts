import Image from "next/image";
import { Info } from "lucide-react";

const NOUNOURS_TYPES = [
  { slug: "nounours-stitch", name: "Stitch", label: "Type : Stitch" },
  { slug: "nounours-teddy", name: "Teddy", label: "Type : Teddy" },
  { slug: "nounours-labubu", name: "Labubu", label: "Type : Labubu" },
] as const;

export function NounoursReferenceDisplay() {
  return (
    <section className="rounded-[24px] border border-border bg-white p-6 shadow-[0_12px_40px_rgba(59,31,77,0.04)]">
      <div className="flex items-center gap-3">
        <Info className="size-5 text-amber-600" />
        <h2 className="font-display text-xl font-semibold text-primary">
          Types de Nounours
        </h2>
      </div>
      <p className="mt-2 font-body text-sm text-muted-foreground">
        Photos non contractuelles — visuels indicatifs. Les vraies photos remplaceront automatiquement ces images une fois disponibles.
      </p>
      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        {NOUNOURS_TYPES.map((type) => (
          <div
            key={type.slug}
            className="group relative overflow-hidden rounded-2xl border border-border bg-bg transition-colors hover:border-primary/30"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={`/images/placeholders/nounours/${type.slug.replace("nounours-", "")}-placeholder.webp`}
                alt={`${type.name} — visuel indicatif`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                unoptimized
              />
            </div>
            <div className="p-4">
              <p className="font-display text-lg font-semibold text-primary">
                {type.name}
              </p>
              <p className="font-body text-xs text-amber-700">
                ⚠ Visuel indicatif
              </p>
              <p className="font-body text-xs text-muted-foreground">
                Non contractuel — photo réelle à venir
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
