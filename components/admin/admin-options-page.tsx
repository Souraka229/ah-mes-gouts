"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeFetch } from "@/lib/api/safe-fetch";
import { formatPrice } from "@/lib/format";
import type {
  MessageCategoryRecord,
  OptionGroupRecord,
  OptionRecord,
} from "@/lib/product-options/options";
import { cn } from "@/lib/utils";

/**
 * Back-office — « Options & compléments ».
 *
 * Tout ce qui se vend en supplément se règle ici : groupes, options, prix,
 * cartes et occasions. Aucun prix n'est écrit dans le code : c'est cette page
 * qui fait autorité, et le serveur qui refacture à partir d'elle.
 *
 * Ajouter « Bougie anniversaire » ou une nouvelle carte ne demande donc aucune
 * intervention technique.
 */

type Catalogue = {
  groups: OptionGroupRecord[];
  categories: MessageCategoryRecord[];
};

export function AdminOptionsPage() {
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await safeFetch<Catalogue>("/api/admin/options", {
      requireJson: true,
    });

    if (!result.ok) {
      setLoadError(result.error.message);
      return;
    }

    setLoadError(null);
    setCatalogue(result.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const mutate = async (
    url: string,
    method: "POST" | "PATCH" | "PUT" | "DELETE",
    body: unknown,
    successMessage: string,
  ) => {
    setBusy(true);
    const result = await safeFetch<unknown>(url, { method, json: body });
    setBusy(false);

    if (!result.ok) {
      toast.error(result.error.message);
      return false;
    }

    toast.success(successMessage);
    await load();
    return true;
  };

  if (loadError) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
        <p className="font-body text-sm text-destructive">{loadError}</p>
        <Button variant="outline" className="mt-4 cursor-pointer" onClick={() => void load()}>
          <RefreshCw className="size-4" aria-hidden />
          Réessayer
        </Button>
      </div>
    );
  }

  if (!catalogue) {
    return (
      <div className="flex items-center gap-2 p-6 font-body text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Chargement des options…
      </div>
    );
  }

  return (
    <div className={cn("space-y-10", busy && "opacity-70")}>
      <header>
        <h1 className="font-display text-3xl font-semibold text-primary">
          Options &amp; compléments
        </h1>
        <p className="mt-2 max-w-2xl font-body text-sm text-muted-foreground">
          Cartes, messages, boissons, décorations… Tout ce qui s&apos;ajoute à une
          création se règle ici. Les prix saisis sont ceux facturés : le site ne
          calcule jamais un montant lui-même.
        </p>
      </header>

      <GroupsSection
        groups={catalogue.groups}
        busy={busy}
        onCreateGroup={(payload) =>
          mutate("/api/admin/options", "POST", { kind: "group", ...payload }, "Groupe créé.")
        }
        onCreateOption={(payload) =>
          mutate("/api/admin/options", "POST", { kind: "option", ...payload }, "Option créée.")
        }
        onPatchOption={(id, patch) =>
          mutate(`/api/admin/options/${id}`, "PATCH", { kind: "option", ...patch }, "Option modifiée.")
        }
        onPatchGroup={(id, patch) =>
          mutate(`/api/admin/options/${id}`, "PATCH", { kind: "group", ...patch }, "Groupe modifié.")
        }
        onRemove={(id, kind, mode) =>
          mutate(
            `/api/admin/options/${id}`,
            "DELETE",
            { kind, mode },
            mode === "delete" ? "Supprimé." : "Désactivé.",
          )
        }
      />

      <ProductsSection groups={catalogue.groups} busy={busy} />

      <CategoriesSection
        categories={catalogue.categories}
        busy={busy}
        onCreate={(payload) =>
          mutate("/api/admin/options", "POST", { kind: "category", ...payload }, "Carte créée.")
        }
        onPatch={(id, patch) =>
          mutate(`/api/admin/options/${id}`, "PATCH", { kind: "category", ...patch }, "Carte modifiée.")
        }
        onRemove={(id, mode) =>
          mutate(
            `/api/admin/options/${id}`,
            "DELETE",
            { kind: "category", mode },
            mode === "delete" ? "Supprimée." : "Désactivée.",
          )
        }
      />
    </div>
  );
}

// ─── Groupes & options ──────────────────────────────────────────────────────

function GroupsSection({
  groups,
  busy,
  onCreateGroup,
  onCreateOption,
  onPatchOption,
  onPatchGroup,
  onRemove,
}: {
  groups: OptionGroupRecord[];
  busy: boolean;
  onCreateGroup: (payload: Record<string, unknown>) => Promise<boolean>;
  onCreateOption: (payload: Record<string, unknown>) => Promise<boolean>;
  onPatchOption: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  onPatchGroup: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  onRemove: (id: string, kind: string, mode: "deactivate" | "delete") => Promise<boolean>;
}) {
  const [newGroup, setNewGroup] = useState({ slug: "", name: "" });

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-primary">Groupes</h2>

      {groups.map((group) => (
        <div key={group.id} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-body text-base font-semibold text-text">
                {group.name}
                <span className="ml-2 font-body text-xs font-normal text-muted-foreground">
                  {group.slug} ·{" "}
                  {group.selectionType === "single"
                    ? "un seul choix"
                    : `jusqu'à ${group.maxSelections} choix`}
                </span>
              </p>
              {group.description && (
                <p className="mt-0.5 font-body text-sm text-muted-foreground">
                  {group.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled={busy}
                onClick={() => void onPatchGroup(group.id, { isActive: !group.isActive })}
              >
                {group.isActive ? "Désactiver" : "Réactiver"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer text-destructive"
                disabled={busy}
                onClick={() => void onRemove(group.id, "group", "deactivate")}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {group.options.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                busy={busy}
                onPatch={(patch) => onPatchOption(option.id, patch)}
                onRemove={(mode) => onRemove(option.id, "option", mode)}
              />
            ))}
            {group.options.length === 0 && (
              <p className="font-body text-sm text-muted-foreground">
                Aucune option dans ce groupe.
              </p>
            )}
          </div>

          <NewOptionForm
            busy={busy}
            onSubmit={(payload) => onCreateOption({ ...payload, groupId: group.id })}
          />
        </div>
      ))}

      <div className="rounded-2xl border border-dashed border-border p-5">
        <p className="font-body text-sm font-semibold text-text">
          Ajouter un groupe
        </p>
        <p className="mt-1 font-body text-xs text-muted-foreground">
          « Fleurs », « Ballons », « Emballage cadeau »… Un groupe créé ici est
          immédiatement disponible à l&apos;association produit.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <Label className="font-body text-xs">Identifiant</Label>
            <Input
              value={newGroup.slug}
              onChange={(event) =>
                setNewGroup((current) => ({ ...current, slug: event.target.value }))
              }
              placeholder="emballage-cadeau"
              className="mt-1 w-48"
            />
          </div>
          <div>
            <Label className="font-body text-xs">Nom affiché</Label>
            <Input
              value={newGroup.name}
              onChange={(event) =>
                setNewGroup((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Emballage cadeau"
              className="mt-1 w-56"
            />
          </div>
          <Button
            className="cursor-pointer"
            disabled={busy || !newGroup.slug.trim() || !newGroup.name.trim()}
            onClick={async () => {
              const created = await onCreateGroup(newGroup);
              if (created) setNewGroup({ slug: "", name: "" });
            }}
          >
            <Plus className="size-4" aria-hidden />
            Créer
          </Button>
        </div>
      </div>
    </section>
  );
}

function OptionRow({
  option,
  busy,
  onPatch,
  onRemove,
}: {
  option: OptionRecord;
  busy: boolean;
  onPatch: (patch: Record<string, unknown>) => Promise<boolean>;
  onRemove: (mode: "deactivate" | "delete") => Promise<boolean>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState({
    name: option.name,
    price: String(option.price),
    imageUrl: option.imageUrl ?? "",
    subgroupLabel: option.subgroupLabel ?? "",
    maxQuantity: String(option.maxQuantity),
  });

  const priceLabel =
    option.pricingType === "per_unit"
      ? `${formatPrice(option.price)} / ${option.unitLabel ?? "unité"}`
      : formatPrice(option.price);

  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-body text-sm font-medium text-text">
            {option.name}
            {!option.isActive && (
              <span className="ml-2 text-xs text-destructive">désactivée</span>
            )}
          </p>
          <p className="mt-0.5 font-body text-xs text-muted-foreground">
            {priceLabel}
            {option.subgroupLabel ? ` · ${option.subgroupLabel}` : ""}
            {option.messageMode !== "none" ? " · message" : ""}
            {option.occasionMode !== "none" ? " · carte" : ""}
            {option.imageUrl ? "" : " · sans image"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Fermer" : "Modifier"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer"
            disabled={busy}
            onClick={() => void onPatch({ isActive: !option.isActive })}
          >
            {option.isActive ? "Désactiver" : "Réactiver"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer text-destructive"
            disabled={busy}
            onClick={() => void onRemove("deactivate")}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <div>
            <Label className="font-body text-xs">Nom affiché</Label>
            <Input
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label className="font-body text-xs">
              Prix (FCFA){option.pricingType === "per_unit" ? " — par unité" : ""}
            </Label>
            <Input
              type="number"
              inputMode="numeric"
              value={draft.price}
              onChange={(event) =>
                setDraft((current) => ({ ...current, price: event.target.value }))
              }
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="font-body text-xs">
              Image (URL) — laisser vide si aucune
            </Label>
            <Input
              value={draft.imageUrl}
              onChange={(event) =>
                setDraft((current) => ({ ...current, imageUrl: event.target.value }))
              }
              placeholder="/images/options/champagne-enfant.webp"
              className="mt-1"
            />
            <p className="mt-1 font-body text-xs text-muted-foreground">
              Le champ reste modifiable à tout moment : une image peut être
              ajoutée ou remplacée plus tard, sans toucher au reste.
            </p>
          </div>
          <div>
            <Label className="font-body text-xs">Sous-famille (affichage)</Label>
            <Input
              value={draft.subgroupLabel}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  subgroupLabel: event.target.value,
                }))
              }
              placeholder="Champagne avec alcool"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="font-body text-xs">Quantité maximale</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={draft.maxQuantity}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  maxQuantity: event.target.value,
                }))
              }
              className="mt-1"
            />
          </div>

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button
              className="cursor-pointer"
              disabled={busy || !draft.name.trim()}
              onClick={() =>
                void onPatch({
                  name: draft.name,
                  price: Number(draft.price),
                  imageUrl: draft.imageUrl.trim() || null,
                  subgroupLabel: draft.subgroupLabel.trim() || null,
                  maxQuantity: Number(draft.maxQuantity),
                })
              }
            >
              Enregistrer
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer text-destructive"
              disabled={busy}
              onClick={() => void onRemove("delete")}
            >
              Supprimer définitivement
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewOptionForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    slug: "",
    name: "",
    price: "",
    pricingType: "fixed" as "fixed" | "per_unit",
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 cursor-pointer font-body text-sm text-primary underline-offset-4 hover:underline"
      >
        + Ajouter une option à ce groupe
      </button>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl bg-muted/40 p-4">
      <div>
        <Label className="font-body text-xs">Identifiant</Label>
        <Input
          value={draft.slug}
          onChange={(event) => setDraft((c) => ({ ...c, slug: event.target.value }))}
          placeholder="bougie-anniversaire"
          className="mt-1 w-44"
        />
      </div>
      <div>
        <Label className="font-body text-xs">Nom affiché</Label>
        <Input
          value={draft.name}
          onChange={(event) => setDraft((c) => ({ ...c, name: event.target.value }))}
          placeholder="Bougie anniversaire"
          className="mt-1 w-52"
        />
      </div>
      <div>
        <Label className="font-body text-xs">Prix (FCFA)</Label>
        <Input
          type="number"
          inputMode="numeric"
          value={draft.price}
          onChange={(event) => setDraft((c) => ({ ...c, price: event.target.value }))}
          className="mt-1 w-28"
        />
      </div>
      <div>
        <Label className="font-body text-xs">Facturation</Label>
        <select
          value={draft.pricingType}
          onChange={(event) =>
            setDraft((c) => ({
              ...c,
              pricingType: event.target.value as "fixed" | "per_unit",
            }))
          }
          className="mt-1 h-9 rounded-md border border-border bg-bg px-2 font-body text-sm"
        >
          <option value="fixed">Forfait</option>
          <option value="per_unit">Par unité</option>
        </select>
      </div>
      <Button
        className="cursor-pointer"
        disabled={busy || !draft.slug.trim() || !draft.name.trim() || draft.price === ""}
        onClick={async () => {
          const created = await onSubmit({
            ...draft,
            price: Number(draft.price),
          });
          if (created) {
            setDraft({ slug: "", name: "", price: "", pricingType: "fixed" });
            setOpen(false);
          }
        }}
      >
        Créer
      </Button>
      <Button variant="ghost" className="cursor-pointer" onClick={() => setOpen(false)}>
        Annuler
      </Button>
    </div>
  );
}

// ─── Association aux produits ───────────────────────────────────────────────

type AdminProductRow = { id: string; slug: string; name: string };

/**
 * Quels produits proposent quels groupes.
 *
 * Sans ce réglage, toutes les options seraient offertes partout — un bouquet de
 * roses avec du champagne. On rattache donc groupe par groupe, produit par
 * produit. Les groupes « Suppléments », eux, sont volontairement rattachés à
 * tout le catalogue (comportement d'avant).
 */
function ProductsSection({
  groups,
  busy,
}: {
  groups: OptionGroupRecord[];
  busy: boolean;
}) {
  const [products, setProducts] = useState<AdminProductRow[] | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [linkedGroupIds, setLinkedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const result = await safeFetch<{ products: AdminProductRow[] }>(
        "/api/admin/products",
        { requireJson: true },
      );
      if (result.ok) setProducts(result.data.products);
      else setProducts([]);
    })();
  }, []);

  const loadLinks = useCallback(async (productId: string) => {
    setLoading(true);
    const result = await safeFetch<{ links: { groupId: string }[] }>(
      `/api/admin/products/${productId}/option-groups`,
      { requireJson: true },
    );
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setLinkedGroupIds(result.data.links.map((link) => link.groupId));
  }, []);

  const save = async () => {
    const result = await safeFetch(
      `/api/admin/products/${selectedProduct}/option-groups`,
      {
        method: "PUT",
        json: { links: linkedGroupIds.map((groupId) => ({ groupId })) },
      },
    );

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Options du produit enregistrées.");
  };

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-primary">
        Options proposées par produit
      </h2>
      <p className="max-w-2xl font-body text-sm text-muted-foreground">
        Cochez les groupes que ce produit doit proposer à la cliente.
      </p>

      <div className="rounded-2xl border border-border bg-card p-5">
        <select
          value={selectedProduct}
          onChange={(event) => {
            const productId = event.target.value;
            setSelectedProduct(productId);
            setLinkedGroupIds([]);
            if (productId) void loadLinks(productId);
          }}
          className="h-9 w-full max-w-md rounded-md border border-border bg-bg px-2 font-body text-sm"
        >
          <option value="">— Choisir un produit —</option>
          {(products ?? []).map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.slug})
            </option>
          ))}
        </select>

        {selectedProduct && (
          <div className="mt-4 space-y-2">
            {loading ? (
              <p className="font-body text-sm text-muted-foreground">
                Chargement…
              </p>
            ) : (
              groups.map((group) => {
                const checked = linkedGroupIds.includes(group.id);
                return (
                  <label
                    key={group.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2 font-body text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setLinkedGroupIds((current) =>
                          checked
                            ? current.filter((id) => id !== group.id)
                            : [...current, group.id],
                        )
                      }
                      className="size-4 cursor-pointer"
                    />
                    <span className="text-text">{group.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {group.options.length} option
                      {group.options.length > 1 ? "s" : ""}
                    </span>
                  </label>
                );
              })
            )}

            <Button
              className="mt-2 cursor-pointer"
              disabled={busy || loading}
              onClick={() => void save()}
            >
              Enregistrer
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Cartes & occasions ─────────────────────────────────────────────────────

function CategoriesSection({
  categories,
  busy,
  onCreate,
  onPatch,
  onRemove,
}: {
  categories: MessageCategoryRecord[];
  busy: boolean;
  onCreate: (payload: Record<string, unknown>) => Promise<boolean>;
  onPatch: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  onRemove: (id: string, mode: "deactivate" | "delete") => Promise<boolean>;
}) {
  const [draft, setDraft] = useState({ slug: "", name: "", parentId: "" });
  const roots = categories.filter((category) => category.parentId === null);

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-primary">
        Cartes &amp; occasions
      </h2>
      <p className="max-w-2xl font-body text-sm text-muted-foreground">
        Les types de carte proposés à la cliente. « Fête spéciale » peut contenir
        ses propres occasions (Noël, Saint-Valentin…) : ajoutez-en autant que
        nécessaire, elles apparaîtront sous cette carte.
      </p>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="space-y-3">
          {roots.map((category) => {
            const children = categories.filter(
              (child) => child.parentId === category.id,
            );

            return (
            <div key={category.id}>
              <CategoryLine
                category={category}
                busy={busy}
                onPatch={(patch) => onPatch(category.id, patch)}
                onRemove={(mode) => onRemove(category.id, mode)}
              />
              {children.length > 0 && (
                <div className="mt-2 space-y-2 pl-6">
                  {children
                    .map((child) => (
                      <CategoryLine
                        key={child.id}
                        category={child}
                        busy={busy}
                        onPatch={(patch) => onPatch(child.id, patch)}
                        onRemove={(mode) => onRemove(child.id, mode)}
                      />
                    ))}
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-border p-5">
        <p className="font-body text-sm font-semibold text-text">
          Ajouter une carte ou une occasion
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <Label className="font-body text-xs">Identifiant</Label>
            <Input
              value={draft.slug}
              onChange={(event) =>
                setDraft((c) => ({ ...c, slug: event.target.value }))
              }
              placeholder="ramadan"
              className="mt-1 w-40"
            />
          </div>
          <div>
            <Label className="font-body text-xs">Nom affiché</Label>
            <Input
              value={draft.name}
              onChange={(event) =>
                setDraft((c) => ({ ...c, name: event.target.value }))
              }
              placeholder="Ramadan"
              className="mt-1 w-48"
            />
          </div>
          <div>
            <Label className="font-body text-xs">Rattacher à</Label>
            <select
              value={draft.parentId}
              onChange={(event) =>
                setDraft((c) => ({ ...c, parentId: event.target.value }))
              }
              className="mt-1 h-9 rounded-md border border-border bg-bg px-2 font-body text-sm"
            >
              <option value="">Aucun (carte principale)</option>
              {roots.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            className="cursor-pointer"
            disabled={busy || !draft.slug.trim() || !draft.name.trim()}
            onClick={async () => {
              const created = await onCreate({
                slug: draft.slug,
                name: draft.name,
                parentId: draft.parentId || null,
              });
              if (created) setDraft({ slug: "", name: "", parentId: "" });
            }}
          >
            <Plus className="size-4" aria-hidden />
            Créer
          </Button>
        </div>
      </div>
    </section>
  );
}

function CategoryLine({
  category,
  busy,
  onPatch,
  onRemove,
}: {
  category: MessageCategoryRecord;
  busy: boolean;
  onPatch: (patch: Record<string, unknown>) => Promise<boolean>;
  onRemove: (mode: "deactivate" | "delete") => Promise<boolean>;
}) {
  const [name, setName] = useState(category.name);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="w-52"
      />
      {name !== category.name && (
        <Button
          size="sm"
          className="cursor-pointer"
          disabled={busy}
          onClick={() => void onPatch({ name })}
        >
          Enregistrer
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="cursor-pointer"
        disabled={busy}
        onClick={() => void onPatch({ isActive: !category.isActive })}
      >
        {category.isActive ? "Désactiver" : "Réactiver"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="cursor-pointer text-destructive"
        disabled={busy}
        onClick={() => void onRemove("delete")}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
