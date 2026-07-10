import Image from "next/image";
import Link from "next/link";

import { formatPrice } from "@/lib/format";
import { getProductPrice } from "@/lib/mock-data";
import { getProductAltText } from "@/lib/seo/images";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

type LandingGridCardProps = {
  product: Product;
  keyword: string;
  priority?: boolean;
  imageHeightPx: number;
  className?: string;
};

/**
 * Card produit — tag ancré DANS le conteneur image avec backdrop blur.
 */
export function LandingGridCard({
  product,
  keyword,
  priority = false,
  imageHeightPx,
  className,
}: LandingGridCardProps) {
  const price = getProductPrice(product);

  return (
    <Link
      href={`/produit/${product.slug}`}
      className={cn(
        "group flex flex-col",
        "cursor-pointer transition-transform duration-[250ms] hover:scale-[1.02] motion-reduce:hover:scale-100",
        className,
      )}
      aria-label={`Voir ${product.name}`}
    >
      <div
        className="relative w-full overflow-hidden rounded-2xl bg-bg shadow-[0_8px_32px_rgba(59,31,77,0.08)]"
        style={{ height: `${imageHeightPx}px` }}
      >
        <span
          className="absolute z-20 px-2.5 py-1 font-body font-semibold text-primary uppercase"
          style={{
            top: "12px",
            left: "16px",
            fontSize: "10px",
            letterSpacing: "0.22em",
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderRadius: "4px",
          }}
        >
          {keyword}
        </span>
        <Image
          src={product.imageUrl}
          alt={getProductAltText(product.name)}
          fill
          sizes="(max-width: 768px) 90vw, 40vw"
          priority={priority}
          unoptimized={product.imageUrl.endsWith(".svg")}
          className="object-contain object-center transition-transform duration-[250ms] group-hover:scale-[1.05] motion-reduce:group-hover:scale-100"
        />
      </div>

      <div style={{ marginTop: "12px" }}>
        <h3 className="font-display text-lg font-semibold leading-tight text-primary sm:text-xl">
          {product.name}
        </h3>
        <p className="font-body text-sm font-semibold text-text">
          {formatPrice(price)}
        </p>
      </div>
    </Link>
  );
}
