"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  IceCreamCone,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
  Download,
} from "lucide-react";
import { toast } from "sonner";

import type { AppError } from "@/lib/api/errors";
import { safeFetch } from "@/lib/api/safe-fetch";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import {
  CATEGORY_FAMILIES,
  categoryInFamily,
  isUnlimitedStockCategory,
  normalizeProductCategory,
} from "@/lib/admin/categories";
import { compareRoseOrder } from "@/lib/constants/rose-compositions";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { ProductVariantsPanel } from "@/components/admin/product-variants-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format";
import { getEffectiveStock } from "@/lib/product-stock-display";
import { validateUploadFile } from "@/lib/uploads";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

type AdminProduct = Product & { category?: string };

const emptyForm = {
  name: "",
  price: "5000",
  category: "Entremets" as string,
  keyword: "",
  description: "",
  imageUrl: "",
};

type FamilyTab = "Tous" | "jour" | "permanente" | "Promo";

export function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  /** Panne de chargement — distincte d'un catalogue réellement vide. */
  const [loadError, setLoadError] = useState<AppError | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<FamilyTab>("Tous");
  const [permanentFilter, setPermanentFilter] = useState<string>("Tous");
  const [search, setSearch] = useState("");
  /** Produit dont on gère les tailles / options — `null` = panneau fermé. */
  const [variantsProduct, setVariantsProduct] =
    useState<AdminProduct | null>(null);

  const visibleProducts = products.filter((product) => {
    const category = normalizeProductCategory(product.category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!product.name.toLowerCase().includes(q)) return false;
    }
    if (activeTab === "Tous") return true;
    if (activeTab === "Promo") return Boolean(product.isPromotion);
    if (activeTab === "jour") {
      return categoryInFamily("jour", product.category);
    }
    if (permanentFilter !== "Tous") return category === permanentFilter;
    return categoryInFamily("permanente", product.category);
  });

  /**
   * Les compositions de roses se lisent du plus petit bouquet au plus grand.
   * L'API les renvoie par nom : « Bouquet 10 roses » s'intercalait entre
   * « 1 rose » et « 2 roses ».
   */
  const filteredProducts =
    activeTab === "permanente" &&
    (permanentFilter === "Fleurs" || permanentFilter === "Tous")
      ? [...visibleProducts].sort(compareRoseOrder)
      : visibleProducts;

  const stocklessCategory = isUnlimitedStockCategory(form.category);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await safeFetch<{ products: AdminProduct[] }>(
      "/api/admin/products",
      { requireJson: true },
    );

    if (result.ok) {
      setProducts(result.data?.products ?? []);
      setLoadError(null);
      setHasLoaded(true);
    } else {
      // Une panne ne doit jamais s'afficher « catalogue vide » : on conserve
      // la dernière liste connue et on signale l'incident.
      setLoadError(result.error);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Applique une modification à une fiche.
   *
   * Retourne `true` seulement si le serveur a confirmé. Les appelants qui
   * enchaînent une action (nettoyage d'un fichier orphelin) ont besoin de
   * savoir si l'écriture a réellement eu lieu.
   */
  const patchProduct = async (
    id: string,
    body: Record<string, unknown>,
    label: string,
    undo?: () => Promise<unknown>,
  ): Promise<boolean> => {
    const result = await safeFetch<{ product: AdminProduct }>(
      `/api/admin/products/${id}`,
      { method: "PATCH", json: body, requireJson: true },
    );
    if (!result.ok) {
      toast.error(result.error.message);
      return false;
    }
    const data = result.data;
    if (!data?.product) {
      toast.error("Modification impossible");
      return false;
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? data.product : p)),
    );
    toast.success(label, {
      action: undo
        ? { label: "Annuler", onClick: () => void undo() }
        : undefined,
      duration: 5000,
    });
    return true;
  };

  const toggleAvailable = (product: AdminProduct) => {
    const wasVisible = (product.visibility ?? "published") === "published";
    void patchProduct(
      product.id,
      { toggleAvailable: true },
      wasVisible ? "Retiré de la vitrine" : "Remis en vitrine",
      () =>
        patchProduct(
          product.id,
          { visibility: wasVisible ? "published" : "hidden" },
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
    // Refus avant envoi : inutile de téléverser 6 Mo pour se les voir refuser
    // par la plateforme, sans message exploitable.
    const invalid = validateUploadFile(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await safeFetch<{ url?: string }>("/api/admin/upload", {
        method: "POST",
        body: fd,
        requireJson: true,
        // Un envoi de fichier est plus lent qu'une requête JSON ordinaire.
        timeoutMs: 60_000,
      });

      if (!result.ok) {
        // C'est ici que se produisait « Unexpected end of JSON input » : un
        // fichier au-dessus de la limite de la plateforme recevait une page
        // HTML, que `res.json()` ne pouvait pas parser.
        toast.error(result.error.message);
        return;
      }
      if (!result.data?.url) {
        toast.error("L'image n'a pas pu être enregistrée");
        return;
      }

      setForm((f) => ({ ...f, imageUrl: result.data!.url! }));
      toast.success("Image ajoutée");
    } finally {
      setUploading(false);
    }
  };

  /**
   * Retire la photo de la fiche.
   *
   * Un visuel **livré avec le site** (`/images/produits`, `/images/placeholders`)
   * n'est jamais effacé du stockage : on détache seulement la fiche, sinon les
   * autres produits qui partagent ce fichier perdraient leur image. Seul un
   * envoi de l'admin est réellement supprimé.
   */
  const removeImage = async () => {
    const url = form.imageUrl;
    if (!url) return;

    setForm((f) => ({ ...f, imageUrl: "" }));

    const isUpload =
      url.startsWith("/images/uploads/") || url.includes("/cms-images/");
    if (!isUpload) {
      toast.success("Photo retirée de la fiche — le fichier du site est conservé");
      return;
    }

    const result = await safeFetch("/api/admin/upload", {
      method: "DELETE",
      json: { url },
    });

    if (!result.ok) {
      // La fiche a déjà été détachée : on le dit, sinon l'admin croit à une
      // suppression complète alors que le fichier est toujours stocké.
      toast.error(
        `${result.error.message} La photo reste détachée de la fiche.`,
      );
      return;
    }

    toast.success("Photo supprimée");
  };

  /**
   * Remplace la photo d'un produit **déjà en ligne**.
   *
   * Le formulaire n'étant qu'en création, aucune fiche publiée ne pouvait
   * jusqu'ici changer de photo. On passe par `patchProduct`, qui gère déjà
   * l'affichage optimiste, le toast et le retour arrière en cas d'échec.
   */
  const changeProductImage = async (product: AdminProduct, file: File) => {
    const invalid = validateUploadFile(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const upload = await safeFetch<{ url?: string }>("/api/admin/upload", {
        method: "POST",
        body: fd,
        requireJson: true,
        timeoutMs: 60_000,
      });

      if (!upload.ok) {
        toast.error(upload.error.message);
        return;
      }
      const url = upload.data?.url;
      if (!url) {
        toast.error("L'image n'a pas pu être enregistrée");
        return;
      }

      const previous = {
        imageUrl: product.imageUrl,
        imageUrls: product.imageUrls ?? [],
      };

      const saved = await patchProduct(
        product.id,
        { imageUrl: url, imageUrls: [url] },
        `Photo de ${product.name} mise à jour`,
        () => patchProduct(product.id, previous, "Photo rétablie"),
      );

      // Le fichier est monté mais la fiche n'a pas été écrite : sans ce
      // nettoyage il resterait dans le stockage sans que rien ne le référence.
      if (!saved) {
        await safeFetch("/api/admin/upload", {
          method: "DELETE",
          json: { url },
        });
      }
    } finally {
      setUploading(false);
    }
  };

  /**
   * Détache la photo d'un produit en ligne.
   *
   * Un fichier livré avec le site n'est jamais effacé — on retire seulement le
   * lien depuis la fiche, sinon les autres produits qui le partagent perdraient
   * leur image. Seul un envoi de l'admin part réellement du stockage.
   */
  const clearProductImage = async (product: AdminProduct) => {
    const url = product.imageUrl;
    const previous = {
      imageUrl: url,
      imageUrls: product.imageUrls ?? [],
    };
    const isUpload =
      url.startsWith("/images/uploads/") || url.includes("/cms-images/");

    if (isUpload) {
      await safeFetch("/api/admin/upload", { method: "DELETE", json: { url } });
    }

    await patchProduct(
      product.id,
      { imageUrl: "", imageUrls: [] },
      isUpload ? "Photo supprimée" : "Photo détachée de la fiche",
      () => patchProduct(product.id, previous, "Photo rétablie"),
    );
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
      const result = await safeFetch<{ product?: AdminProduct }>(
        "/api/admin/products",
        {
          method: "POST",
          requireJson: true,
          json: {
            name: form.name.trim(),
            price: Math.round(price),
            category: form.category,
            keyword: form.keyword.trim() || undefined,
            description: form.description.trim() || undefined,
            stock: stocklessCategory ? 9999 : 10,
            imageUrl: form.imageUrl || undefined,
            imageUrls: form.imageUrl ? [form.imageUrl] : undefined,
          },
        },
      );

      if (!result.ok) {
        // Un échec ne doit jamais laisser croire à une création : on ne
        // referme pas le formulaire et on ne vide pas la saisie.
        toast.error(result.error.message);
        return;
      }
      const product = result.data?.product;
      if (!product) {
        toast.error("Le produit n'a pas été confirmé par le serveur");
        return;
      }

      setProducts((prev) => [product, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
      toast.success(`${product.name} ajouté`);
    } finally {
      setSaving(false);
    }
  };

  const importGift = async () => {
    setImporting(true);
    try {
      const result = await safeFetch<{ created?: number; skipped?: number }>(
        "/api/admin/products",
        { method: "POST", requireJson: true, json: { importGift: true } },
      );

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success(
        `${result.data?.created ?? 0} produits importés` +
          (result.data?.skipped ? ` · ${result.data.skipped} déjà présents` : ""),
      );
      await load();
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
            Deux familles : pièces du jour (entremets) et carte permanente
            (fleurs, nounours, vins…). Un formulaire, des groupes clairs.
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
            className="cursor-pointer bg-accent text-accent-foreground hover:bg-accent/90"
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
            Identité d’abord. Les paliers (tailles, parts) se règlent ensuite
            sur la ligne du tableau.
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
              <Label htmlFor="category">Famille</Label>
              <select
                id="category"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                className="flex h-10 w-full cursor-pointer rounded-lg border border-border bg-white px-3 font-body text-sm"
              >
                <optgroup label={CATEGORY_FAMILIES.jour.label}>
                  {CATEGORY_FAMILIES.jour.categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={CATEGORY_FAMILIES.permanente.label}>
                  {CATEGORY_FAMILIES.permanente.categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
              </select>
              {stocklessCategory && (
                <p className="font-body text-xs text-muted-foreground">
                  Carte permanente — toujours commandable, hors menu du jour.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyword">Tag (carte menu)</Label>
              <Input
                id="keyword"
                value={form.keyword}
                onChange={(e) =>
                  setForm((f) => ({ ...f, keyword: e.target.value }))
                }
                placeholder="Ex: Solaire, Floral"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="description">Description courte</Label>
              <textarea
                id="description"
                value={form.description}
                rows={2}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
                placeholder="Facultatif — le goût, la texture, l’occasion."
              />
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

                {form.imageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 cursor-pointer gap-2 text-destructive hover:text-destructive"
                    onClick={() => void removeImage()}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Retirer la photo
                  </Button>
                )}
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

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["Tous", "Tous"],
              ["jour", CATEGORY_FAMILIES.jour.label],
              ["permanente", CATEGORY_FAMILIES.permanente.label],
              ["Promo", "Promo"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTab(id);
                setPermanentFilter("Tous");
              }}
              className={cn(
                "min-h-11 cursor-pointer rounded-full px-4 py-2 font-body text-sm font-medium transition-colors",
                activeTab === id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {activeTab === "permanente" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPermanentFilter("Tous")}
              className={cn(
                "min-h-10 cursor-pointer rounded-full border px-3 py-1.5 font-body text-xs font-semibold",
                permanentFilter === "Tous"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              Toute la carte
            </button>
            {CATEGORY_FAMILIES.permanente.categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setPermanentFilter(category)}
                className={cn(
                  "min-h-10 cursor-pointer rounded-full border px-3 py-1.5 font-body text-xs font-semibold",
                  permanentFilter === category
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {category}
              </button>
            ))}
          </div>
        )}
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit…"
          className="h-11 max-w-md cursor-text"
          aria-label="Rechercher un produit"
        />
      </div>

      {/* Panne alors qu'on a déjà des produits : on garde l'affichage et on
          prévient, plutôt que d'annoncer un catalogue vide. */}
      {loadError && hasLoaded && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3"
        >
          <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
          <p className="font-body text-sm text-destructive">
            {loadError.message} L&apos;affichage peut être périmé.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => void load()}
          >
            Réessayer
          </Button>
        </div>
      )}

      {loading && !hasLoaded ? (
        <AdminPageSkeleton rows={6} />
      ) : loadError && !hasLoaded ? (
        /* Premier chargement en échec : « Catalogue vide » serait un mensonge. */
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" aria-hidden />
            <h2 className="font-display text-base font-semibold text-destructive">
              Impossible de charger le catalogue
            </h2>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            {loadError.message} Les produits ne sont pas perdus : seul
            l&apos;affichage a échoué.
          </p>
          <Button
            type="button"
            size="sm"
            className="cursor-pointer gap-2"
            onClick={() => void load()}
          >
            <RefreshCw className="size-4" aria-hidden />
            Réessayer
          </Button>
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
                const remaining = getEffectiveStock(product);
                const unlimited =
                  isUnlimitedStockCategory(product.category ?? "Entremets") ||
                  remaining === null;
                const listed =
                  (product.visibility ?? "published") === "published";
                const exhausted = !unlimited && remaining === 0;
                // Seuls les paliers actifs sont proposés à la cliente : ce sont
                // eux, et eux seuls, qui définissent la gamme de prix affichée.
                const activeVariants = (product.variants ?? []).filter(
                  (variant) => variant.isActive,
                );
                const variantSummary = activeVariants.length
                  ? {
                      count: activeVariants.length,
                      min: Math.min(...activeVariants.map((v) => v.price)),
                      max: Math.max(...activeVariants.map((v) => v.price)),
                    }
                  : null;
                return (
                  <tr
                    key={product.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/*
                          La vignette est le bouton : cliquer dessus remplace la
                          photo. C'est l'affordance la plus directe pour changer
                          l'image d'un produit déjà en ligne.
                        */}
                        <label
                          className="relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-transparent bg-bg transition-colors hover:border-primary/40"
                          title={product.imageUrl ? "Changer la photo" : "Ajouter une photo"}
                        >
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt=""
                              fill
                              className="object-contain"
                              sizes="48px"
                              unoptimized={product.imageUrl.startsWith("/")}
                            />
                          ) : (
                            <span className="flex size-full items-center justify-center text-muted-foreground">
                              <ImagePlus className="size-4" aria-hidden />
                            </span>
                          )}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            disabled={uploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void changeProductImage(product, file);
                              e.target.value = "";
                            }}
                          />
                        </label>

                        {product.imageUrl && (
                          <button
                            type="button"
                            onClick={() => void clearProductImage(product)}
                            className="cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
                            title="Retirer la photo"
                            aria-label={`Retirer la photo de ${product.name}`}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        )}

                        <div>
                          <p className="font-medium text-text">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {normalizeProductCategory(product.category)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {/*
                        Un produit à paliers ne se résume pas à son prix
                        d'entrée : un nounours affiché « 10 000 F » se vend
                        jusqu'à 100 000 F. On montre la gamme, et c'est elle
                        qu'on vient corriger — pas un montant qui ne serait
                        jamais facturé tel quel.
                      */}
                      {variantSummary ? (
                        <div className="space-y-0.5">
                          <p className="font-medium tabular-nums text-text">
                            {formatPrice(variantSummary.min)}
                            {variantSummary.max > variantSummary.min &&
                              ` → ${formatPrice(variantSummary.max)}`}
                          </p>
                          <button
                            type="button"
                            title="Gérer les tailles et leurs prix"
                            className="cursor-pointer rounded-lg text-xs font-semibold text-primary hover:underline"
                            onClick={() => setVariantsProduct(product)}
                          >
                            {variantSummary.count} taille
                            {variantSummary.count > 1 ? "s" : ""} — gérer
                          </button>
                        </div>
                      ) : editingPrice === product.id ? (
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
                        <div className="space-y-0.5">
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
                          <div>
                            <button
                              type="button"
                              title="Proposer des tailles ou des options à la cliente"
                              className="cursor-pointer rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:underline"
                              onClick={() => setVariantsProduct(product)}
                            >
                              + Tailles
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {unlimited ? "∞" : remaining}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        title={
                          listed
                            ? "Masquer de la vitrine (le stock n’est pas modifié)"
                            : "Remettre en vitrine"
                        }
                        onClick={() => toggleAvailable(product)}
                        className={cn(
                          "cursor-pointer rounded-full px-3 py-1 text-xs font-semibold",
                          !listed
                            ? "bg-muted text-muted-foreground"
                            : exhausted
                              ? "bg-destructive/10 text-destructive"
                              : "bg-emerald-100 text-emerald-800",
                        )}
                      >
                        {!listed
                          ? "Masqué"
                          : exhausted
                            ? "Épuisé"
                            : unlimited
                              ? "Toujours"
                              : "Oui"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ProductVariantsPanel
        product={variantsProduct}
        open={variantsProduct !== null}
        onOpenChange={(next) => {
          if (!next) setVariantsProduct(null);
        }}
        onChanged={() => void load()}
      />
    </div>
  );
}
