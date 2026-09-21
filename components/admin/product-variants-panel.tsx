"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatPrice } from "@/lib/format";
import { templatesForCategory } from "@/lib/product-options/variant-templates";
import type { ProductVariantView } from "@/types/product";
import { cn } from "@/lib/utils";

/** Ce dont le panneau a besoin — rien de plus : il ne lit jamais le catalogue. */
export type VariantsPanelProduct = {
  id: string;
  name: string;
  category?: string;
  variantLabel?: string;
};

type ProductVariantsPanelProps = {
  product: VariantsPanelProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Le résumé de la liste (nombre de tailles, gamme de prix) a changé. */
  onChanged: () => void;
};

type Draft = { code: string; label: string; price: string };

const EMPTY_DRAFT: Draft = { code: "", label: "", price: "" };

/**
 * « Tailles / options » — ce que la cliente choisit sur la fiche produit.
 *
 * Ces paliers vivent en base (`ProductVariant`) et **c'est la base qui fait
 * foi** : le serveur refuse toute commande dont l'option n'y est pas, et
 * recalcule le prix depuis elle. Sans ce panneau, l'administrateur n'avait
 * aucun moyen de voir ni de corriger ce que la boutique proposait : la fiche
 * n'affichait que le prix d'entrée.
 *
 * Rien ici n'écrit de montant côté client — on ne fait que piloter l'API, qui
 * reste la seule à valider et à facturer.
 */
export function ProductVariantsPanel({
  product,
  open,
  onOpenChange,
  onChanged,
}: ProductVariantsPanelProps) {
  const [variants, setVariants] = useState<ProductVariantView[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [labelDraft, setLabelDraft] = useState("");
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  const productId = product?.id ?? "";

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { variants: ProductVariantView[] };
      setVariants(data.variants);
      setPriceDrafts(
        Object.fromEntries(data.variants.map((v) => [v.id, String(v.price)])),
      );
    } catch {
      setVariants([]);
      toast.error("Tailles illisibles");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (!open || !product) return;
    setDraft(EMPTY_DRAFT);
    setLabelDraft(product.variantLabel ?? "");
    void load();
  }, [open, product, load]);

  const templates = product ? templatesForCategory(product.category ?? "") : [];

  /** Après toute écriture : on relit la vérité en base, jamais un état deviné. */
  const afterWrite = useCallback(
    async (message: string) => {
      toast.success(message);
      await load();
      onChanged();
    },
    [load, onChanged],
  );

  const addVariant = async () => {
    const price = Number(draft.price);
    if (!draft.label.trim()) {
      toast.error("Donne un libellé (ex. « 30 cm »)");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Prix invalide");
      return;
    }

    setBusy("new");
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Le code est l'identifiant que le panier envoie : à défaut, le libellé.
          code: (draft.code.trim() || draft.label.trim()).toLowerCase(),
          label: draft.label.trim(),
          price: Math.round(price),
          sortOrder: variants.length,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Création impossible");
      }
      setDraft(EMPTY_DRAFT);
      await afterWrite("Taille ajoutée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Création impossible");
    } finally {
      setBusy(null);
    }
  };

  const savePrice = async (variant: ProductVariantView) => {
    const next = Number(priceDrafts[variant.id]);
    if (!Number.isFinite(next) || next <= 0) {
      toast.error("Prix invalide");
      setPriceDrafts((prev) => ({ ...prev, [variant.id]: String(variant.price) }));
      return;
    }
    if (Math.round(next) === variant.price) return;

    setBusy(variant.id);
    try {
      const res = await fetch(
        `/api/admin/products/${productId}/variants/${variant.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ price: Math.round(next) }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Modification impossible");
      }
      await afterWrite(`${variant.label} → ${formatPrice(Math.round(next))}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Modification impossible");
      setPriceDrafts((prev) => ({ ...prev, [variant.id]: String(variant.price) }));
    } finally {
      setBusy(null);
    }
  };

  const toggleActive = async (variant: ProductVariantView) => {
    setBusy(variant.id);
    try {
      const res = await fetch(
        `/api/admin/products/${productId}/variants/${variant.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !variant.isActive }),
        },
      );
      if (!res.ok) throw new Error();
      await afterWrite(
        variant.isActive
          ? `${variant.label} retirée du choix`
          : `${variant.label} proposée à nouveau`,
      );
    } catch {
      toast.error("Modification impossible");
    } finally {
      setBusy(null);
    }
  };

  const removeVariant = async (variant: ProductVariantView) => {
    if (
      !window.confirm(
        `Supprimer définitivement « ${variant.label} » ?\n\n` +
          "Si une commande la référence, la suppression sera refusée : " +
          "désactive-la plutôt, l'historique reste lisible.",
      )
    ) {
      return;
    }

    setBusy(variant.id);
    try {
      const res = await fetch(
        `/api/admin/products/${productId}/variants/${variant.id}`,
        { method: "DELETE" },
      );
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Suppression impossible");
      await afterWrite(`${variant.label} supprimée`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Suppression impossible",
      );
    } finally {
      setBusy(null);
    }
  };

  const applyTemplate = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setBusy("template");
    try {
      // On renvoie le stock existant : le modèle ne le connaît pas, et l'écraser
      // par `null` ferait retomber la variante sur le stock du produit.
      const stockByCode = new Map(variants.map((v) => [v.code, v.stockRemaining]));
      const res = await fetch(`/api/admin/products/${productId}/variants`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantLabel: template.variantLabel,
          variants: template.entries.map((entry, index) => ({
            code: entry.code,
            label: entry.label,
            price: entry.price,
            sortOrder: index,
            stockRemaining: stockByCode.get(entry.code.toLowerCase()) ?? null,
          })),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Modèle non appliqué");
      }
      setLabelDraft(template.variantLabel);
      await afterWrite(`${template.name} appliqué`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Modèle non appliqué");
    } finally {
      setBusy(null);
    }
  };

  const saveVariantLabel = async () => {
    const next = labelDraft.trim();
    if (next === (product?.variantLabel ?? "")) return;
    setBusy("label");
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantLabel: next || null }),
      });
      if (!res.ok) throw new Error();
      await afterWrite("Libellé du sélecteur enregistré");
    } catch {
      toast.error("Modification impossible");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>Tailles / options</SheetTitle>
          <SheetDescription>
            {product?.name} — ce que la cliente choisit sur la fiche produit. Le
            prix facturé est toujours recalculé depuis ces paliers ; une option
            absente d&apos;ici est refusée à la commande.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 px-1 pb-10">
          {templates.length > 0 && (
            <div className="rounded-2xl border border-border bg-bg/60 p-4">
              <p className="font-body text-sm font-semibold text-text">
                Partir d&apos;un modèle
              </p>
              <p className="mt-1 font-body text-xs text-muted-foreground">
                Préremplit les paliers officiels. Un palier déjà présent est mis
                à jour, jamais dupliqué — rien n&apos;est supprimé.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {templates.map((template) => (
                  <Button
                    key={template.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    disabled={busy !== null}
                    onClick={() => void applyTemplate(template.id)}
                  >
                    {busy === "template" ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Wand2 className="size-3.5" aria-hidden />
                    )}
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="pv-label">Libellé du sélecteur</Label>
            <Input
              id="pv-label"
              value={labelDraft}
              placeholder="Taille"
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={() => void saveVariantLabel()}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
            <p className="font-body text-xs text-muted-foreground">
              Le mot affiché au-dessus des choix : « Taille », « Format »,
              « Nombre de personnes ».
            </p>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <p className="font-body text-sm font-semibold text-text">
                Paliers proposés
              </p>
              <span className="font-body text-xs text-muted-foreground">
                {variants.length} au total
              </span>
            </div>

            {loading ? (
              <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Chargement…
              </div>
            ) : variants.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-6 text-center font-body text-sm text-muted-foreground">
                Aucun palier. La fiche est vendue au prix d&apos;entrée, sans
                choix proposé.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border/70 rounded-xl border border-border">
                {variants.map((variant) => (
                  <li
                    key={variant.id}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "font-body text-sm font-medium",
                          variant.isActive ? "text-text" : "text-muted-foreground line-through",
                        )}
                      >
                        {variant.label}
                      </p>
                      <p className="font-body text-xs text-muted-foreground">
                        code {variant.code}
                        {variant.stockRemaining !== null &&
                          ` · stock ${variant.stockRemaining}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        aria-label={`Prix de ${variant.label}`}
                        value={priceDrafts[variant.id] ?? String(variant.price)}
                        onChange={(e) =>
                          setPriceDrafts((prev) => ({
                            ...prev,
                            [variant.id]: e.target.value,
                          }))
                        }
                        onBlur={() => void savePrice(variant)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                          if (e.key === "Escape") {
                            setPriceDrafts((prev) => ({
                              ...prev,
                              [variant.id]: String(variant.price),
                            }));
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-24 text-right"
                      />
                      <span className="font-body text-xs text-muted-foreground">
                        F
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer"
                      disabled={busy === variant.id}
                      onClick={() => void toggleActive(variant)}
                      title={
                        variant.isActive
                          ? "Retirer du choix (l'historique reste lisible)"
                          : "Proposer à nouveau"
                      }
                    >
                      {busy === variant.id ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : variant.isActive ? (
                        "Active"
                      ) : (
                        "Retirée"
                      )}
                    </Button>

                    <button
                      type="button"
                      className="cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
                      title="Supprimer définitivement"
                      aria-label={`Supprimer ${variant.label}`}
                      disabled={busy === variant.id}
                      onClick={() => void removeVariant(variant)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-border p-4">
            <p className="font-body text-sm font-semibold text-text">
              Ajouter un palier
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="pv-new-label">Libellé</Label>
                <Input
                  id="pv-new-label"
                  value={draft.label}
                  placeholder="30 cm"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, label: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pv-new-price">Prix (FCFA)</Label>
                <Input
                  id="pv-new-price"
                  type="number"
                  value={draft.price}
                  placeholder="25000"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, price: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  className="w-full cursor-pointer"
                  disabled={busy !== null}
                  onClick={() => void addVariant()}
                >
                  {busy === "new" ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Plus className="size-4" aria-hidden />
                  )}
                  Ajouter
                </Button>
              </div>
            </div>
            <p className="mt-2 font-body text-xs text-muted-foreground">
              Le code interne est déduit du libellé. Laisse le stock vide : les
              nounours et les fleurs sont montés à la demande.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
