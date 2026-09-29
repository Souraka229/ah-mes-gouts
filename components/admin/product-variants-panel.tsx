"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Wand2,
} from "lucide-react";
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
import type { AppError } from "@/lib/api/errors";
import { safeFetch } from "@/lib/api/safe-fetch";
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
  /**
   * Dernière panne de chargement.
   *
   * Distingue « ce produit n'a vraiment aucun palier » de « on n'a pas pu
   * savoir ». Avant, toute panne vidait la liste et l'écran annonçait « Aucun
   * palier » : l'admin croyait que la fiche était vendue au prix nu, alors que
   * ses tailles existaient peut-être toujours en base.
   */
  const [loadError, setLoadError] = useState<AppError | null>(null);
  /** Au moins un chargement réussi : sinon un échec initial n'est pas « vide ». */
  const [hasLoaded, setHasLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [labelDraft, setLabelDraft] = useState("");
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  const productId = product?.id ?? "";

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    // La route doit renvoyer une liste : un corps vide est une anomalie, pas
    // un produit sans palier.
    const result = await safeFetch<{ variants: ProductVariantView[] }>(
      `/api/admin/products/${productId}/variants`,
      { requireJson: true },
    );

    if (result.ok) {
      const incoming = result.data?.variants ?? [];
      setVariants(incoming);
      setPriceDrafts(
        Object.fromEntries(incoming.map((v) => [v.id, String(v.price)])),
      );
      setLoadError(null);
      setHasLoaded(true);
    } else {
      // On ne vide JAMAIS la liste : on garde les paliers déjà connus et on
      // signale explicitement que l'affichage peut être périmé.
      setLoadError(result.error);
    }

    setLoading(false);
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
      const result = await safeFetch(
        `/api/admin/products/${productId}/variants`,
        {
          method: "POST",
          json: {
            // Le code est l'identifiant que le panier envoie : à défaut, le libellé.
            code: (draft.code.trim() || draft.label.trim()).toLowerCase(),
            label: draft.label.trim(),
            price: Math.round(price),
            sortOrder: variants.length,
          },
          requireJson: true,
        },
      );
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setDraft(EMPTY_DRAFT);
      await afterWrite("Taille ajoutée");
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
      const result = await safeFetch(
        `/api/admin/products/${productId}/variants/${variant.id}`,
        {
          method: "PATCH",
          json: { price: Math.round(next) },
          requireJson: true,
        },
      );
      if (!result.ok) {
        toast.error(result.error.message);
        // Le prix affiché revient à la valeur réellement en base : sinon le
        // champ montrerait un montant que le serveur n'a jamais accepté.
        setPriceDrafts((prev) => ({ ...prev, [variant.id]: String(variant.price) }));
        return;
      }
      await afterWrite(`${variant.label} → ${formatPrice(Math.round(next))}`);
    } finally {
      setBusy(null);
    }
  };

  const toggleActive = async (variant: ProductVariantView) => {
    setBusy(variant.id);
    try {
      const result = await safeFetch(
        `/api/admin/products/${productId}/variants/${variant.id}`,
        {
          method: "PATCH",
          json: { isActive: !variant.isActive },
          requireJson: true,
        },
      );
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      await afterWrite(
        variant.isActive
          ? `${variant.label} retirée du choix`
          : `${variant.label} proposée à nouveau`,
      );
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
      // Une suppression refusée (palier référencé par une commande) arrive en
      // 409 : le message du serveur explique quoi faire, on l'affiche tel quel.
      const result = await safeFetch(
        `/api/admin/products/${productId}/variants/${variant.id}`,
        { method: "DELETE", requireJson: true },
      );
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      await afterWrite(`${variant.label} supprimée`);
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
      const result = await safeFetch(
        `/api/admin/products/${productId}/variants`,
        {
          method: "PUT",
          json: {
            variantLabel: template.variantLabel,
            variants: template.entries.map((entry, index) => ({
              code: entry.code,
              label: entry.label,
              price: entry.price,
              sortOrder: index,
              stockRemaining: stockByCode.get(entry.code.toLowerCase()) ?? null,
            })),
          },
          requireJson: true,
        },
      );
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setLabelDraft(template.variantLabel);
      await afterWrite(`${template.name} appliqué`);
    } finally {
      setBusy(null);
    }
  };

  const saveVariantLabel = async () => {
    const next = labelDraft.trim();
    if (next === (product?.variantLabel ?? "")) return;
    setBusy("label");
    try {
      const result = await safeFetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        json: { variantLabel: next || null },
        requireJson: true,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      await afterWrite("Libellé du sélecteur enregistré");
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
              {/* Le compteur n'apparaît qu'après un premier succès : afficher
                  « 0 au total » après une panne ferait croire à un produit
                  vendu sans choix. */}
              {hasLoaded && (
                <span className="font-body text-xs text-muted-foreground">
                  {variants.length} au total
                </span>
              )}
            </div>

            {/* Panne survenue alors qu'on avait déjà des paliers : on garde la
                liste affichée et on prévient, plutôt que de laisser croire
                qu'ils ont tous été supprimés. */}
            {loadError && hasLoaded && (
              <div
                role="status"
                className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3"
              >
                <AlertTriangle
                  className="size-4 shrink-0 text-destructive"
                  aria-hidden
                />
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
              <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Chargement…
              </div>
            ) : loadError && !hasLoaded ? (
              /* Premier chargement en échec : on ne sait pas si des paliers
                 existent — « Aucun palier » serait un mensonge. */
              <div
                role="alert"
                className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className="size-5 text-destructive"
                    aria-hidden
                  />
                  <h3 className="font-display text-base font-semibold text-destructive">
                    Impossible de charger les paliers
                  </h3>
                </div>
                <p className="font-body text-sm text-muted-foreground">
                  {loadError.message} Les tailles ne sont pas perdues : elles
                  restent enregistrées, seul l&apos;affichage a échoué.
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
