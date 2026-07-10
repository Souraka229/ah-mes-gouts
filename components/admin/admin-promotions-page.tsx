"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { formatPrice } from "@/lib/format";
import type { Product } from "@/types/product";

export function AdminPromotionsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/admin/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { products: Product[] }) => setProducts(d.products ?? []))
      .finally(() => setLoading(false));
  }, []);

  const promos = products.filter((p) => p.isPromotion);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">
          Promotions & codes promo
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Produits en promotion. Modifiez les prix promo depuis{" "}
          <Link href="/admin/produits" className="text-primary underline">
            Produits
          </Link>{" "}
          ou l&apos;{" "}
          <Link href="/admin/assistant" className="text-primary underline">
            Assistant IA
          </Link>
          .
        </p>
      </div>
      {loading ? (
        <Loader2 className="size-6 animate-spin text-primary" />
      ) : promos.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">
          Aucune promotion active. Utilisez l&apos;assistant pour en créer une.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
          {promos.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-4 py-3 font-body text-sm"
            >
              <span className="font-medium">{p.name}</span>
              <span>
                <span className="text-muted-foreground line-through">
                  {formatPrice(p.price)}
                </span>{" "}
                <span className="font-semibold text-primary">
                  {formatPrice(p.promotionPrice ?? p.price)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
