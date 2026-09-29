"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeFetch } from "@/lib/api/safe-fetch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatPrice } from "@/lib/format";
import {
  PAYMENT_METHOD_LABELS,
  RECEPTION_MODE_LABELS,
  type OrderItemOptionSnapshot,
  type PaymentMethod,
  type ReceptionMode,
  type SavedOrder,
} from "@/types/order";

/**
 * Une ligne d'article telle que l'admin la voit et la corrige.
 *
 * `variantLabel` est éditable : une commande prise par téléphone pour un
 * nounours doit pouvoir enregistrer la taille annoncée. `slug`, `variantId` et
 * `supplements` ne le sont pas — ils viennent de la commande et sont renvoyés
 * tels quels, pour que corriger un prix ne les efface pas.
 */
type ItemRow = {
  name: string;
  quantity: number;
  unitPrice: number;
  variantLabel?: string;
  slug?: string;
  variantId?: string;
  supplements?: string[];
  /**
   * Compléments choisis, **en lecture seule**. Ils ne se corrigent pas ici :
   * ce sont des snapshots figés à la commande, avec leur prix. L'atelier doit
   * pouvoir lire le mot de la cliente, pas le réécrire.
   */
  options?: OrderItemOptionSnapshot[];
};

type FormState = {
  firstName: string;
  lastName: string;
  phone: string;
  mode: ReceptionMode;
  address: string;
  landmark: string;
  deliveryFee: number;
  paymentMethod: PaymentMethod;
  markPaid: boolean;
  message: string;
  items: ItemRow[];
};

const EMPTY_ITEM: ItemRow = { name: "", quantity: 1, unitPrice: 0 };

function emptyForm(): FormState {
  return {
    firstName: "",
    lastName: "",
    phone: "",
    mode: "delivery",
    address: "",
    landmark: "",
    deliveryFee: 0,
    paymentMethod: "mtn_momo",
    markPaid: true,
    message: "",
    items: [{ ...EMPTY_ITEM }],
  };
}

function formFromOrder(order: SavedOrder): FormState {
  return {
    firstName: order.client.firstName,
    lastName: order.client.lastName,
    phone: order.client.phone,
    mode: order.fulfillmentType ?? order.mode,
    address: order.client.address,
    landmark: order.client.landmark,
    deliveryFee: order.deliveryFee,
    paymentMethod: order.paymentMethod,
    markPaid: true,
    message: order.client.message,
    items: order.items.length
      ? order.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          variantLabel: i.variantLabel,
          slug: i.slug,
          variantId: i.variantId,
          supplements: i.supplements,
          options: i.options,
        }))
      : [{ ...EMPTY_ITEM }],
  };
}

type AdminOrderFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined = création · SavedOrder = édition */
  order?: SavedOrder;
  onSaved: (order: SavedOrder) => void;
};

/** Formulaire unique — création ET édition d'une commande, volontairement minimal. */
export function AdminOrderFormSheet({
  open,
  onOpenChange,
  order,
  onSaved,
}: AdminOrderFormSheetProps) {
  const isEdit = Boolean(order);
  const [form, setForm] = useState<FormState>(() =>
    order ? formFromOrder(order) : emptyForm(),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(order ? formFromOrder(order) : emptyForm());
    }
  }, [open, order]);

  const subtotal = form.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const total = subtotal + (form.mode === "delivery" ? form.deliveryFee : 0);

  const updateItem = (index: number, patch: Partial<ItemRow>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const addItem = () =>
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }));

  const removeItem = (index: number) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));

  const canSave =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.phone.trim() &&
    form.items.length > 0 &&
    form.items.every((item) => item.name.trim() && item.quantity > 0);

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);

    // On ne renvoie `variantLabel` que s'il est renseigné : une chaîne vide
    // écraserait un libellé existant, alors que « champ laissé tel quel » et
    // « champ vidé » ne veulent pas dire la même chose.
    const cleanItems = form.items.map((item) => ({
      name: item.name.trim(),
      quantity: Math.max(1, Math.round(item.quantity)),
      unitPrice: Math.max(0, Math.round(item.unitPrice)),
      ...(item.variantLabel?.trim()
        ? { variantLabel: item.variantLabel.trim() }
        : {}),
      ...(item.slug ? { slug: item.slug } : {}),
      ...(item.variantId ? { variantId: item.variantId } : {}),
      ...(item.supplements?.length ? { supplements: item.supplements } : {}),
    }));

    const client = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      landmark: form.landmark.trim(),
      message: form.message.trim(),
    };

    // Les deux routes renvoient `{ order }` : un corps vide serait une anomalie,
    // pas une commande enregistrée.
    const result = isEdit
      ? await safeFetch<{ order?: SavedOrder }>(
          `/api/admin/orders/${order!.id}`,
          {
            method: "PATCH",
            json: {
              client,
              deliveryFee: form.mode === "delivery" ? form.deliveryFee : 0,
              items: cleanItems,
            },
            requireJson: true,
          },
        )
      : await safeFetch<{ order?: SavedOrder }>("/api/admin/orders", {
          method: "POST",
          json: {
            client,
            mode: form.mode,
            deliveryFee: form.mode === "delivery" ? form.deliveryFee : 0,
            paymentMethod: form.paymentMethod,
            markPaid: form.markPaid,
            items: cleanItems,
          },
          requireJson: true,
        });

    if (!result.ok) {
      toast.error(result.error.message);
      setSaving(false);
      return;
    }

    const saved = result.data?.order;
    if (!saved) {
      toast.error("Échec de l'enregistrement.");
      setSaving(false);
      return;
    }

    toast.success(isEdit ? "Commande modifiée." : "Commande créée.");
    onSaved(saved);
    onOpenChange(false);
    setSaving(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>
            {isEdit ? `Modifier ${order!.id}` : "Nouvelle commande"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Corrige les coordonnées client ou les articles."
              : "Commande prise par téléphone ou en boutique."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="of-firstName">Prénom</Label>
              <Input
                id="of-firstName"
                value={form.firstName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, firstName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="of-lastName">Nom</Label>
              <Input
                id="of-lastName"
                value={form.lastName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, lastName: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="of-phone">Téléphone</Label>
            <Input
              id="of-phone"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+229 …"
            />
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="of-mode">Type</Label>
              <select
                id="of-mode"
                value={form.mode}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    mode: e.target.value as ReceptionMode,
                  }))
                }
                className="h-9 w-full cursor-pointer rounded-lg border border-border bg-transparent px-2.5 text-sm"
              >
                {(Object.keys(RECEPTION_MODE_LABELS) as ReceptionMode[]).map(
                  (m) => (
                    <option key={m} value={m}>
                      {RECEPTION_MODE_LABELS[m]}
                    </option>
                  ),
                )}
              </select>
            </div>
          )}

          {form.mode === "delivery" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="of-address">Adresse</Label>
                <Input
                  id="of-address"
                  value={form.address}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, address: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="of-landmark">Repère</Label>
                  <Input
                    id="of-landmark"
                    value={form.landmark}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, landmark: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="of-fee">Frais livraison (FCFA)</Label>
                  <Input
                    id="of-fee"
                    type="number"
                    min={0}
                    value={form.deliveryFee}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        deliveryFee: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
            </>
          )}

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="of-payment">Paiement</Label>
              <select
                id="of-payment"
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    paymentMethod: e.target.value as PaymentMethod,
                  }))
                }
                className="h-9 w-full cursor-pointer rounded-lg border border-border bg-transparent px-2.5 text-sm"
              >
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(
                  (m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ),
                )}
              </select>
              <label className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.markPaid}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, markPaid: e.target.checked }))
                  }
                />
                Déjà payée (sinon reste « Reçue » en attente de paiement)
              </label>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Articles</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addItem}
                className="cursor-pointer gap-1"
              >
                <Plus className="size-3.5" aria-hidden />
                Ajouter
              </Button>
            </div>
            {form.items.map((item, index) => (
              <div
                key={index}
                className="flex flex-wrap items-end gap-2 rounded-xl border border-border/70 p-2"
              >
                {item.options && item.options.length > 0 && (
                  <ul className="basis-full space-y-1 rounded-lg bg-muted/50 p-2">
                    {item.options.map((option, optionIndex) => (
                      <li
                        key={`${option.optionName}-${optionIndex}`}
                        className="font-body text-xs"
                      >
                        <span className="font-medium text-text">
                          {option.groupName ? `${option.groupName} — ` : ""}
                          {option.optionName}
                        </span>
                        {option.quantity > 1 && (
                          <span className="text-muted-foreground">
                            {" "}
                            × {option.quantity}
                          </span>
                        )}
                        <span className="ml-1 tabular-nums text-muted-foreground">
                          {formatPrice(option.totalPrice)}
                        </span>
                        {option.messageCategory && (
                          <span className="block text-muted-foreground">
                            Occasion : {option.messageCategory}
                            {option.customOccasion
                              ? ` (${option.customOccasion})`
                              : ""}
                          </span>
                        )}
                        {option.customMessage && (
                          <span className="mt-0.5 block rounded border-l-2 border-primary/40 pl-2 text-text italic">
                            « {option.customMessage} »
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="min-w-40 flex-1 space-y-1">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground">Nom</Label>
                  )}
                  <Input
                    value={item.name}
                    placeholder="Ex: Tiramisu Caramel"
                    onChange={(e) =>
                      updateItem(index, { name: e.target.value })
                    }
                  />
                </div>
                <div className="w-24 space-y-1">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground">
                      Option
                    </Label>
                  )}
                  <Input
                    value={item.variantLabel ?? ""}
                    placeholder="30 cm"
                    title="Taille, format… ce que la cliente a choisi"
                    onChange={(e) =>
                      updateItem(index, { variantLabel: e.target.value })
                    }
                  />
                </div>
                <div className="w-16 space-y-1">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground">Qté</Label>
                  )}
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, {
                        quantity: Number(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <div className="w-24 space-y-1">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground">
                      Prix unit.
                    </Label>
                  )}
                  <Input
                    type="number"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(index, {
                        unitPrice: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="mb-0.5 cursor-pointer text-destructive"
                  disabled={form.items.length === 1}
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="of-message">Note (optionnel)</Label>
            <textarea
              id="of-message"
              value={form.message}
              onChange={(e) =>
                setForm((p) => ({ ...p, message: e.target.value }))
              }
              rows={2}
              className="w-full rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-sm"
            />
          </div>

          <p className="font-display text-lg font-semibold text-primary">
            Total : {total.toLocaleString("fr-FR")} FCFA
          </p>
        </div>

        <SheetFooter className="flex-row gap-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="flex-1 cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="flex-1 cursor-pointer"
            disabled={!canSave || saving}
            onClick={handleSave}
          >
            {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
