import Image from "next/image";
import Link from "next/link";

import { ProductImageFrame } from "@/components/shop/product-image-frame";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import {
  getProductPrice,
  isProductAvailable,
} from "@/lib/mock-data";
import {
  getLowStockLabel,
  isLowStock,
} from "@/lib/product-stock-display";
import { getProductAltText } from "@/lib/seo/images";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

type ProductCardProps = {
  product: Product;
  className?: string;
  priority?: boolean;
  keyword?: string;
};

export function ProductCard({
  product,
  className,
  priority = false,
  keyword,
}: ProductCardProps) {
  const available = isProductAvailable(product);
  const price = getProductPrice(product);
  const showPromotion =
    product.isPromotion && product.promotionPrice !== undefined;

  const categoryLabel =
    product.keyword?.trim() ||
    keyword ||
    (product.isNew ? "Nouveau" : product.isPromotion ? "Promo" : "Signature");

  const cardClasses = cn(
    "group flex h-full flex-col overflow-hidden rounded-2xl bg-bg",
    "transition-all duration-[250ms] motion-reduce:transition-none",
    available && [
      "cursor-pointer hover:scale-[1.03] hover:shadow-lg",
      "motion-reduce:hover:scale-100",
    ],
    !available && "cursor-not-allowed opacity-80",
    className,
  );

  const content = (
    <ProductImageFrame
      src={product.imageUrl}
      alt={getProductAltText(product.name)}
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      priority={priority}
      className="aspect-[4/5] w-full"
      imageClassName={cn(
        available && "group-hover:scale-[1.03] motion-reduce:group-hover:scale-100",
        !available && "opacity-60 grayscale",
      )}
      badges={
        <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
          {!available && <Badge variant="destructive">Épuisé</Badge>}
          {available && product.isNew && (
            <Badge className="bg-primary text-primary-foreground">Nouveau</Badge>
          )}
          {available && showPromotion && (
            <Badge className="bg-accent text-text">Promo</Badge>
          )}
          {available && isLowStock(product) && (
            <Badge className="border-0 bg-secondary/80 text-primary">
              {getLowStockLabel(product)}
            </Badge>
          )}
        </div>
      }
      overlay={
        <>
          <p className="font-body text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
            {categoryLabel}
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold text-primary sm:text-2xl">
            {product.name}
          </h3>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-body text-sm font-semibold text-text">
              {formatPrice(price)}
            </span>
            {showPromotion && (
              <span className="font-body text-xs text-muted-foreground line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
        </>
      }
    />
  );

  if (!available) {
    return (
      <div className={cardClasses} aria-label={`${product.name} — épuisé`}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/produit/${product.slug}`}
      className={cardClasses}
      aria-label={`Voir ${product.name}`}
    >
      {content}
    </Link>
  );
}
