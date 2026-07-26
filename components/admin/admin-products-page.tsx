"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  IceCreamCone,
  Loader2,
  Plus,
  Upload,
  X,
  Download,
} from "lucide-react";
import { toast } from "sonner";

import { PRODUCT_CATEGORIES, isUnlimitedStockCategory } from "@/lib/admin/categories";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

type AdminProduct = Product & { category?: string };

const emptyForm = {
  name: "",
  price: "5000",
  category: "Entremets" as string,
  imageUrl: "",
};

const ADMIN_TABS = ["Tous", "Entremets", "Nounours", "Carte", "Menu du jour"] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

export function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("Tous");

  const filteredProducts = products.filter((product) => {
    if (activeTab === "Tous") return true;
    return (product.category ?? "Entremets") === activeTab;
  });

  const stocklessCategory = isUnlimitedStockCategory(form.category);

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

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload échoué");
      setForm((f) => ({ ...f, imageUrl: data.url! }));
      toast.success("Image ajoutée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload échoué");
    } finally {
      setUploading(false);
    }
  };

  const createProduct = async () => {
    const price = Number(form.price);
    if (!form.name.trim()) {
      toast.error("Nom requis");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Prix invalide");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          price: Math.round(price),
          category: form.category,
          stock: stocklessCategory ? 9999 : 10,
          imageUrl: form.imageUrl || undefined,
          imageUrls: form.imageUrl ? [form.imageUrl] : undefined,
        }),
      });
      const data = (await res.json()) as {
        product?: AdminProduct;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Création impossible");
      setProducts((prev) => [data.product!, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
      toast.success(`${data.product!.name} ajouté`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Création impossible");
    } finally {
      setSaving(false);
    }
  };

  const importGift = async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importGift: true }),
      });
      const data = (await res.json()) as {
        created?: number;
        skipped?: number;
        products?: AdminProduct[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Import impossible");
      toast.success(
        `${data.created ?? 0} produits importés` +
          (data.skipped ? ` · ${data.skipped} déjà présents` : ""),
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import impossible");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary">
            Produits
          </h1>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            4 champs : nom, catégorie, prix, photo. Simple et rapide.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={importing}
            onClick={() => void importGift()}
          >
            {importing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Importer photos Gift
          </Button>
          <Button
            type="button"
            className="cursor-pointer bg-accent text-text hover:bg-accent/90"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
            {showForm ? "Fermer" : "Ajouter un produit"}
          </Button>
        </div>
      </header>

      {showForm && (
        <section className="rounded-[24px] border border-border bg-white p-5 shadow-[0_12px_40px_rgba(59,31,77,0.04)] sm:p-6">
          <h2 className="font-display text-xl font-semibold text-primary">
            Nouveau produit
          </h2>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            La photo est optimisée automatiquement à l&apos;upload.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Tiramisu Caramel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Prix (FCFA)</Label>
              <Input
                id="price"
                type="number"
                min={100}
                step={100}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <select
                id="category"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                className="flex h-10 w-full rounded-lg border border-border bg-white px-3 font-body text-sm"
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {stocklessCategory && (
                <p className="font-body text-xs text-muted-foreground">
                  Stock illimité — toujours commandable.
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label>Image</Label>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                {form.imageUrl ? (
                  <div className="relative size-24 overflow-hidden rounded-xl border border-border bg-bg">
                    <Image
                      src={form.imageUrl}
                      alt="Aperçu"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex size-24 items-center justify-center rounded-xl border border-dashed border-border bg-bg text-muted-foreground">
                    <IceCreamCone className="size-8 opacity-40" />
                  </div>
                )}
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border bg-bg px-4 py-2 font-body text-sm font-medium hover:border-primary/30">
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  Choisir une photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadImage(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm);
              }}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="cursor-pointer bg-primary text-primary-foreground"
              disabled={saving}
              onClick={() => void createProduct()}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Créer le produit
            </Button>
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "cursor-pointer rounded-full px-4 py-2 font-body text-sm font-medium transition-colors",
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Chargement…
        </div>
      ) : filteredProducts.length === 0 ? (
        <AdminEmptyState
          variant="products"
          title={activeTab === "Tous" ? "Catalogue vide" : `Aucun produit « ${activeTab} »`}
          description="Ajoute un produit avec le bouton ci-dessus."
          action={
            <>
              <Button
                type="button"
                className="cursor-pointer"
                onClick={() => setShowForm(true)}
              >
                Ajouter un produit
              </Button>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => void importGift()}
              >
                Importer photos Gift
              </Button>
            </>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[720px] font-body text-sm">
            <thead>
              <tr className="border-b border-border bg-bg text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3">Prix</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Dispo</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const unlimited = isUnlimitedStockCategory(
                  product.category ?? "Entremets",
                );
                const available = unlimited || product.stockRemaining > 0;
                return (
                  <tr
                    key={product.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-bg">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt=""
                              fill
                              className="object-contain"
                              sizes="48px"
                              unoptimized={product.imageUrl.startsWith("/")}
                            />
                          ) : null}
                        </div>
                        <div>
                          <p className="font-medium text-text">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.category}
                          </p>
                        </div>
                      </div>
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
                      {unlimited ? "∞" : product.stockRemaining}
                    </td>
                    <td className="px-4 py-3">
                      {unlimited ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                          Toujours
                        </span>
                      ) : (
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
                      )}
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
