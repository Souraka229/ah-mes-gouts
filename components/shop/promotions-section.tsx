import Link from "next/link";

import { ProductCard } from "@/components/shop/product-card";
import { SectionHeading } from "@/components/shop/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

type PromotionsSectionProps = {
  products: Product[];
};

export function PromotionsSection({ products }: PromotionsSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Promotions en cours"
          subtitle="Profitez de nos offres limitées sur une sélection de créations."
          action={
            <Link
              href="/catalogue?promotions=1"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "cursor-pointer",
              )}
            >
              Toutes les promos
            </Link>
          }
        />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
