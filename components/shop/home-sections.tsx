import Link from "next/link";

import { ProductCard } from "@/components/shop/product-card";
import { SectionHeading } from "@/components/shop/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

type MenuDuJourSectionProps = {
  products: Product[];
};

export function MenuDuJourSection({ products }: MenuDuJourSectionProps) {
  if (products.length === 0) return null;

  return (
    <section id="menu-du-jour" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Menu du jour"
          subtitle="Nos créations du moment, fraîches et en édition limitée."
        />

        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="w-[72vw] shrink-0 sm:w-auto sm:shrink"
            >
              <ProductCard product={product} priority={index < 2} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type PopularProductsSectionProps = {
  products: Product[];
};

export function PopularProductsSection({
  products,
}: PopularProductsSectionProps) {
  return (
    <section className="bg-muted/50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Produits populaires"
          subtitle="Les favoris de nos clients, indémodables et irrésistibles."
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
      </div>
    </section>
  );
}
