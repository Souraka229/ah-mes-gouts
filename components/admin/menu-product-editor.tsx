"use client";

import { useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PRODUCT_GALLERY_MAX,
  normalizeProductImages,
  setGallerySlot,
} from "@/lib/product-images";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

export type MenuProductDraft = Product & {
  category?: string;
  dirty?: boolean;
};

type MenuProductEditorProps = {
  product: MenuProductDraft;
  displayIndex: number;
  onChange: (patch: Partial<MenuProductDraft>) => void;
  onMove: (dir: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

export function MenuProductEditor({
  product,
  displayIndex,
  onChange,
  onMove,
  canMoveUp,
  canMoveDown,
}: MenuProductEditorProps) {
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(true);

  const images = normalizeProductImages(product).imageUrls;
  const slots = Array.from({ length: PRODUCT_GALLERY_MAX }, (_, i) => images[i] ?? "");

  const uploadImage = async (file: File, slotIndex: number) => {
    setUploadingSlot(slotIndex);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload échoué");
      const nextUrls = setGallerySlot(images, slotIndex, data.url!);
      const normalized = normalizeProductImages({ imageUrls: nextUrls });
      onChange({
        imageUrls: normalized.imageUrls,
        imageUrl: normalized.imageUrl,
        dirty: true,
      });
      toast.success("Image téléversée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload échoué");
    } finally {
      setUploadingSlot(null);
    }
  };

  const removeImage = (slotIndex: number) => {
    const nextUrls = setGallerySlot(images, slotIndex, null);
    const normalized = normalizeProductImages({ imageUrls: nextUrls });
    onChange({
      imageUrls: normalized.imageUrls,
      imageUrl: normalized.imageUrl,
      dirty: true,
    });
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-bg p-4",
        product.dirty ? "border-primary/40" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="flex-1 cursor-pointer text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          <p className="font-display text-base font-semibold text-primary">
            {displayIndex + 1}. {product.name}
          </p>
          <p className="mt-0.5 font-body text-xs text-muted-foreground">
            {formatPrice(product.price)}
            {product.keyword ? ` · ${product.keyword}` : ""}
            {product.dirty ? " · modifié" : ""}
          </p>
        </button>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            disabled={!canMoveUp}
            className="cursor-pointer px-2 text-xs text-muted-foreground hover:text-primary disabled:opacity-30"
            onClick={() => onMove(-1)}
            aria-label="Monter"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={!canMoveDown}
            className="cursor-pointer px-2 text-xs text-muted-foreground hover:text-primary disabled:opacity-30"
            onClick={() => onMove(1)}
            aria-label="Descendre"
          >
            ↓
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
          <div>
            <Label className="text-xs">Images (max {PRODUCT_GALLERY_MAX})</Label>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {slots.map((url, slotIndex) => (
                <div
                  key={slotIndex}
                  className="rounded-xl border border-border bg-white p-2"
                >
                  <p className="font-body text-[10px] font-medium uppercase text-muted-foreground">
                    {slotIndex === 0 ? "Principale" : `Galerie ${slotIndex}`}
                  </p>
                  <div className="relative mt-2 aspect-square overflow-hidden rounded-lg bg-bg">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                        Vide
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex gap-1">
                    <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-border px-2 py-1.5 font-body text-[10px] hover:bg-bg">
                      {uploadingSlot === slotIndex ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Upload className="size-3" />
                      )}
                      {url ? "Remplacer" : "Ajouter"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        disabled={uploadingSlot !== null}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadImage(f, slotIndex);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {url && (
                      <button
                        type="button"
                        className="cursor-pointer rounded-lg border border-border px-2 py-1.5 text-destructive hover:bg-destructive/5"
                        onClick={() => removeImage(slotIndex)}
                        aria-label="Supprimer l'image"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`name-${product.id}`}>Nom</Label>
              <Input
                id={`name-${product.id}`}
                value={product.name}
                onChange={(e) => onChange({ name: e.target.value, dirty: true })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`keyword-${product.id}`}>Tag / mot-clé</Label>
              <Input
                id={`keyword-${product.id}`}
                value={product.keyword ?? ""}
                placeholder="Ex: Solaire, Floral"
                onChange={(e) =>
                  onChange({ keyword: e.target.value, dirty: true })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`price-${product.id}`}>Prix (FCFA)</Label>
              <Input
                id={`price-${product.id}`}
                type="number"
                min={0}
                step={100}
                value={product.price}
                onChange={(e) =>
                  onChange({
                    price: Math.round(Number(e.target.value) || 0),
                    dirty: true,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`promo-${product.id}`}>Prix promo (optionnel)</Label>
              <Input
                id={`promo-${product.id}`}
                type="number"
                min={0}
                step={100}
                value={product.promotionPrice ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChange({
                    promotionPrice: raw ? Math.round(Number(raw)) : undefined,
                    isPromotion: Boolean(raw),
                    dirty: true,
                  });
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`stock-${product.id}`}>Stock</Label>
              <Input
                id={`stock-${product.id}`}
                type="number"
                min={0}
                value={product.stockRemaining}
                onChange={(e) =>
                  onChange({
                    stockRemaining: Math.round(Number(e.target.value) || 0),
                    dirty: true,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`stock-min-${product.id}`}>Stock minimum</Label>
              <Input
                id={`stock-min-${product.id}`}
                type="number"
                min={0}
                value={product.stockMinimum}
                onChange={(e) =>
                  onChange({
                    stockMinimum: Math.round(Number(e.target.value) || 0),
                    dirty: true,
                  })
                }
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`desc-${product.id}`}>Description courte</Label>
            <textarea
              id={`desc-${product.id}`}
              value={product.description}
              rows={2}
              onChange={(e) =>
                onChange({ description: e.target.value, dirty: true })
              }
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
