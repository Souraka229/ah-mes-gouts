"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { SectionMesh } from "@/components/shop/landing/section-mesh";
import { formatPrice } from "@/lib/format";
import { getProductAltText } from "@/lib/seo/images";
import { cn } from "@/lib/utils";
import type { GiftTeaserSectionContent } from "@/types/site-content";
import type { Product } from "@/types/product";

export function GiftUpsellBandSection({
  content,
  products,
}: {
  content: GiftTeaserSectionContent;
  products: Product[];
}) {
  const router = useRouter();

  const scrollToGifts = () => {
    router.push("/catalogue?cadeaux=1#cadeaux");
  };

  return (
    <SectionMesh
      variant="default"
      id="cadeaux-accueil"
      className="mx-auto w-full max-w-[1400px] px-5 py-[6vh] sm:px-8 lg:px-10"
      aria-label="Idées cadeaux"
    >
      <h2
        className="font-display font-bold text-primary"
        style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
      >
        {content.title}
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {products.map((product) => (
          <button
            key={product.slug}
            type="button"
            onClick={scrollToGifts}
            className={cn(
              "group flex w-full cursor-pointer flex-col text-left",
              "transition-transform duration-[250ms] hover:scale-[1.02] motion-reduce:hover:scale-100",
            )}
            aria-label={`Voir ${product.name} dans le catalogue cadeaux`}
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-photo-bg shadow-[0_8px_24px_rgba(59,31,77,0.08)]">
              <Image
                src={product.imageUrl}
                alt={getProductAltText(product.name)}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover object-center transition-transform duration-[250ms] group-hover:scale-[1.05] motion-reduce:group-hover:scale-100"
              />
            </div>
            <div className="mt-3">
              <p className="font-display text-lg font-semibold text-primary">
                {product.name}
              </p>
              <p className="mt-0.5 font-body text-sm font-semibold text-text">
                {formatPrice(product.price)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </SectionMesh>
  );
}
