"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  PAYMENT_METHOD_LABELS,
  RECEPTION_MODE_LABELS,
  type PaymentMethod,
  type ReceptionMode,
  type SavedOrder,
} from "@/types/order";

type ItemRow = { name: string; quantity: number; unitPrice: number };

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

    const cleanItems = form.items.map((item) => ({
      name: item.name.trim(),
      quantity: Math.max(1, Math.round(item.quantity)),
      unitPrice: Math.max(0, Math.round(item.unitPrice)),
    }));

    const client = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      landmark: form.landmark.trim(),
      message: form.message.trim(),
    };

    try {
      const response = isEdit
        ? await fetch(`/api/admin/orders/${order!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client,
              deliveryFee: form.mode === "delivery" ? form.deliveryFee : 0,
              items: cleanItems,
            }),
          })
        : await fetch("/api/admin/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client,
              mode: form.mode,
              deliveryFee: form.mode === "delivery" ? form.deliveryFee : 0,
              paymentMethod: form.paymentMethod,
              markPaid: form.markPaid,
              items: cleanItems,
            }),
          });

      const payload = (await response.json().catch(() => null)) as {
        order?: SavedOrder;
        error?: string;
      } | null;

      if (!response.ok || !payload?.order) {
        toast.error(payload?.error || "Échec de l'enregistrement.");
        setSaving(false);
        return;
      }

      toast.success(isEdit ? "Commande modifiée." : "Commande créée.");
      onSaved(payload.order);
      onOpenChange(false);
    } catch {
      toast.error("Connexion impossible. Réessayez.");
    } finally {
      setSaving(false);
    }
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
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
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
