"use client";

import { useCallback, useEffect, useState } from "react";
import { IceCreamCone, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

type AdminProduct = Product & { category?: string };

export function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { products: AdminProduct[] };
      setProducts(data.products);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchProduct = async (
    id: string,
    body: Record<string, unknown>,
    label: string,
    undo?: () => Promise<void>,
  ) => {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error("Modification impossible");
      return;
    }
    const data = (await res.json()) as { product: AdminProduct };
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? data.product : p)),
    );
    toast.success(label, {
      action: undo
        ? { label: "Annuler", onClick: () => void undo() }
        : undefined,
      duration: 5000,
    });
  };

  const toggleAvailable = (product: AdminProduct) => {
    const wasAvailable = product.stockRemaining > 0;
    void patchProduct(
      product.id,
      { toggleAvailable: true },
      wasAvailable ? "Produit masqué" : "Produit disponible",
      () =>
        patchProduct(
          product.id,
          { stockRemaining: wasAvailable ? 10 : 0 },
          "Annulé",
        ),
    );
  };

  const savePrice = (product: AdminProduct) => {
    const price = Number(priceDraft);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Prix invalide");
      return;
    }
    const previous = product.price;
    setEditingPrice(null);
    void patchProduct(
      product.id,
      { price },
      `Prix → ${formatPrice(price)}`,
      () => patchProduct(product.id, { price: previous }, "Annulé"),
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold text-primary">
          Produits
        </h1>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          Disponibilité et prix en un clic — pas besoin d&apos;ouvrir chaque fiche.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Chargement…
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <IceCreamCone className="mx-auto size-10 text-muted-foreground/50" />
          <p className="mt-4 font-body text-sm text-muted-foreground">
            Aucun produit dans le catalogue. Rechargez les données démo ou
            créez-en via l&apos;assistant IA.
          </p>
          <Button
            type="button"
            className="mt-4 cursor-pointer"
            render={<a href="/admin/assistant" />}
          >
            Créer un produit
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[640px] font-body text-sm">
            <thead>
              <tr className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3">Prix</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Dispo</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const available = product.stockRemaining > 0;
                return (
                  <tr
                    key={product.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-text">
                      {product.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {editingPrice === product.id ? (
                        <input
                          type="number"
                          autoFocus
                          value={priceDraft}
                          onChange={(e) => setPriceDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") savePrice(product);
                            if (e.key === "Escape") setEditingPrice(null);
                          }}
                          onBlur={() => savePrice(product)}
                          className="w-24 rounded-lg border border-border px-2 py-1"
                        />
                      ) : (
                        <button
                          type="button"
                          title="Cliquer pour modifier le prix"
                          className="cursor-pointer rounded-lg px-2 py-1 hover:bg-bg"
                          onClick={() => {
                            setEditingPrice(product.id);
                            setPriceDraft(String(product.price));
                          }}
                        >
                          {formatPrice(product.price)}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {product.stockRemaining}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        title={
                          available
                            ? "Masquer du catalogue"
                            : "Rendre disponible"
                        }
                        onClick={() => toggleAvailable(product)}
                        className={cn(
                          "cursor-pointer rounded-full px-3 py-1 text-xs font-semibold",
                          available
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {available ? "Oui" : "Non"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
