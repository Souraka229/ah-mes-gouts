import Link from "next/link";

import { ProductCard } from "@/components/shop/product-card";
import { SectionHeading } from "@/components/shop/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

type SimilarProductsProps = {
  products: Product[];
};

export function SimilarProducts({ products }: SimilarProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border pt-12">
      <SectionHeading
        title="Vous aimerez aussi"
        subtitle="D'autres créations artisanales à découvrir."
        action={
          <Link
            href="/catalogue"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "cursor-pointer",
            )}
          >
            Voir tout le catalogue
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
