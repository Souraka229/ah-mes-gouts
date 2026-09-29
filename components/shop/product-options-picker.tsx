"use client";

import { useMemo, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";

import {
  formatOptionPrice,
  groupOptionsBySubgroup,
  messageMaxLength,
  type MessageCategoryTree,
  type OptionRecord,
  type ProductOptionGroupRecord,
} from "@/lib/product-options/options";
import { cn } from "@/lib/utils";
import type { CartSupplement } from "@/types/cart";

/**
 * Sélecteur d'options de la fiche produit.
 *
 * Deux principes, dans cet ordre :
 *
 *   1. **Ne pas transformer la fiche en formulaire.** Un groupe n'affiche ses
 *      champs de message et d'occasion qu'**après** que la cliente a choisi
 *      l'option qui les porte. Rien n'apparaît tant que rien n'est choisi.
 *   2. **Aucun prix n'est décidé ici.** Le sélecteur affiche une estimation et
 *      transmet des identifiants ; `priceOrderItems` relit tout en base.
 */

type SelectionState = {
  optionId: string;
  quantity: number;
  message: string;
  occasionCategorySlug: string;
  customOccasion: string;
};

type ProductOptionsPickerProps = {
  groups: ProductOptionGroupRecord[];
  messageCategories: MessageCategoryTree[];
  onChange: (supplements: CartSupplement[]) => void;
};

function emptySelection(optionId: string): SelectionState {
  return {
    optionId,
    quantity: 1,
    message: "",
    occasionCategorySlug: "",
    customOccasion: "",
  };
}

export function ProductOptionsPicker({
  groups,
  messageCategories,
  onChange,
}: ProductOptionsPickerProps) {
  const [selections, setSelections] = useState<SelectionState[]>([]);

  /** Les bornes du produit priment sur celles du groupe, comme côté serveur. */
  const boundsOf = (link: ProductOptionGroupRecord) => {
    const max =
      link.group.selectionType === "single"
        ? 1
        : (link.maxSelections ?? link.group.maxSelections);
    const min = Math.min(
      link.minSelections ?? link.group.minSelections,
      Math.max(max, 0),
    );
    return { min, max, required: link.group.isRequired || min > 0 };
  };

  const emit = (next: SelectionState[]) => {
    setSelections(next);

    const supplements: CartSupplement[] = [];
    for (const selection of next) {
      const option = groups
        .flatMap((link) => link.group.options)
        .find((candidate) => candidate.id === selection.optionId);
      if (!option) continue;

      const groupName = groups.find((link) =>
        link.group.options.some((candidate) => candidate.id === option.id),
      )?.group.name;

      supplements.push({
        id: option.id,
        name: option.name,
        price: option.price,
        pricingType: option.pricingType,
        unitLabel: option.unitLabel ?? undefined,
        groupName,
        subgroupLabel: option.subgroupLabel ?? undefined,
        ...(option.pricingType === "per_unit"
          ? { quantity: selection.quantity }
          : {}),
        ...(selection.message.trim() ? { message: selection.message.trim() } : {}),
        ...(selection.occasionCategorySlug
          ? { occasionCategorySlug: selection.occasionCategorySlug }
          : {}),
        ...(selection.customOccasion.trim()
          ? { customOccasion: selection.customOccasion.trim() }
          : {}),
      });
    }
    onChange(supplements);
  };

  const patch = (optionId: string, changes: Partial<SelectionState>) =>
    emit(
      selections.map((selection) =>
        selection.optionId === optionId
          ? { ...selection, ...changes }
          : selection,
      ),
    );

  const toggle = (link: ProductOptionGroupRecord, optionId: string) => {
    const already = selections.some((s) => s.optionId === optionId);

    if (already) {
      emit(selections.filter((s) => s.optionId !== optionId));
      return;
    }

    const groupOptionIds = link.group.options.map((option) => option.id);
    // Un groupe « single » remplace : on retire d'abord les autres choix du
    // même groupe, sinon deux tailles se retrouveraient facturées ensemble.
    const kept =
      link.group.selectionType === "single"
        ? selections.filter((s) => !groupOptionIds.includes(s.optionId))
        : selections;

    const bounds = boundsOf(link);
    const chosenInGroup = kept.filter((s) =>
      groupOptionIds.includes(s.optionId),
    ).length;
    if (chosenInGroup >= bounds.max) return;

    emit([...kept, emptySelection(optionId)]);
  };

  const clearGroup = (link: ProductOptionGroupRecord) => {
    const groupOptionIds = link.group.options.map((option) => option.id);
    emit(selections.filter((s) => !groupOptionIds.includes(s.optionId)));
  };

  if (groups.length === 0) return null;

  return (
    <div className="space-y-6">
      <p className="font-body text-sm font-medium tracking-widest text-muted-foreground uppercase">
        Ajouter une touche personnelle
      </p>

      {groups.map((link) => (
        <OptionGroupBlock
          key={link.groupId}
          link={link}
          selections={selections}
          messageCategories={messageCategories}
          bounds={boundsOf(link)}
          onToggle={toggle}
          onClear={() => clearGroup(link)}
          onPatch={patch}
        />
      ))}
    </div>
  );
}

function OptionGroupBlock({
  link,
  selections,
  messageCategories,
  bounds,
  onToggle,
  onClear,
  onPatch,
}: {
  link: ProductOptionGroupRecord;
  selections: SelectionState[];
  messageCategories: MessageCategoryTree[];
  bounds: { min: number; max: number; required: boolean };
  onToggle: (link: ProductOptionGroupRecord, optionId: string) => void;
  onClear: () => void;
  onPatch: (optionId: string, changes: Partial<SelectionState>) => void;
}) {
  const selectedIds = selections.map((selection) => selection.optionId);
  const chosen = selectedIds.filter((id) =>
    link.group.options.some((option) => option.id === id),
  );
  const sections = useMemo(
    () => groupOptionsBySubgroup(link.group),
    [link.group],
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-primary">
          {link.group.name}
        </h3>
        {chosen.length > 0 && link.group.selectionType !== "single" && (
          <button
            type="button"
            onClick={onClear}
            className="cursor-pointer font-body text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Tout retirer
          </button>
        )}
      </div>

      {link.group.description && (
        <p className="mt-1 font-body text-sm text-muted-foreground">
          {link.group.description}
        </p>
      )}

      <div className="mt-3 space-y-4">
        {sections.map((section) => (
          <div key={section.label ?? "__default"} className="space-y-2">
            {section.label && (
              <p className="font-body text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {section.label}
              </p>
            )}
            {section.options.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                selected={selectedIds.includes(option.id)}
                multiple={link.group.selectionType === "multiple"}
                selection={selections.find((s) => s.optionId === option.id)}
                messageCategories={messageCategories}
                onToggle={() => onToggle(link, option.id)}
                onPatch={(changes) => onPatch(option.id, changes)}
              />
            ))}
          </div>
        ))}

        {/* Groupe obligatoire et rien de choisi : on le dit, sans bloquer. */}
        {bounds.required && chosen.length < bounds.min && (
          <p className="font-body text-xs text-muted-foreground">
            {bounds.min > 1
              ? `Choisissez au moins ${bounds.min} options.`
              : "Ce choix est nécessaire pour continuer."}
          </p>
        )}
      </div>
    </div>
  );
}

function OptionRow({
  option,
  selected,
  multiple,
  selection,
  messageCategories,
  onToggle,
  onPatch,
}: {
  option: OptionRecord;
  selected: boolean;
  multiple: boolean;
  selection: SelectionState | undefined;
  messageCategories: MessageCategoryTree[];
  onToggle: () => void;
  onPatch: (changes: Partial<SelectionState>) => void;
}) {
  const chosenCategory = messageCategories
    .flatMap((category) => [category, ...category.children])
    .find((category) => category.slug === selection?.occasionCategorySlug);

  const allowFreeText = Boolean(
    option.allowCustomOccasion && chosenCategory?.allowsCustomText,
  );

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors",
          selected
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40",
        )}
      >
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center border transition-colors",
            multiple ? "rounded-md" : "rounded-full",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
          )}
          aria-hidden
        >
          {selected && <Check className="size-3" />}
        </span>

        {option.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={option.imageUrl}
            alt=""
            className="size-10 shrink-0 rounded-lg object-cover"
          />
        )}

        <span className="min-w-0 flex-1">
          <span className="block font-body text-sm font-medium text-text">
            {option.name}
          </span>
          {option.description && (
            <span className="mt-0.5 block font-body text-xs text-muted-foreground">
              {option.description}
            </span>
          )}
        </span>

        {formatOptionPrice(option) && (
          <span className="shrink-0 font-body text-sm font-semibold tabular-nums text-primary">
            {formatOptionPrice(option)}
          </span>
        )}
      </button>

      {/* Les champs n'apparaissent qu'après le choix de l'option. */}
      {selected && (
        <div className="mt-2 space-y-3 pl-8">
          {option.pricingType === "per_unit" && (
            <div className="flex items-center gap-3">
              <span className="font-body text-xs text-muted-foreground">
                {option.unitLabel ?? "Quantité"}
              </span>
              <QuantityStepper
                value={selection?.quantity ?? 1}
                max={option.maxQuantity}
                onChange={(quantity) => onPatch({ quantity })}
              />
            </div>
          )}

          {option.messageMode !== "none" && (
            <MessageField
              option={option}
              value={selection?.message ?? ""}
              onChange={(message) => onPatch({ message })}
            />
          )}

          {option.occasionMode !== "none" && (
            <OccasionField
              option={option}
              categories={messageCategories}
              value={selection?.occasionCategorySlug ?? ""}
              onChange={(occasionCategorySlug) =>
                onPatch({ occasionCategorySlug })
              }
            />
          )}

          {allowFreeText && (
            <input
              type="text"
              value={selection?.customOccasion ?? ""}
              onChange={(event) => onPatch({ customOccasion: event.target.value })}
              placeholder="Quelle occasion ?"
              maxLength={120}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 font-body text-sm text-text outline-none focus:border-primary"
            />
          )}
        </div>
      )}
    </div>
  );
}

function QuantityStepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center rounded-full border border-border bg-bg">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted"
        aria-label="Diminuer"
      >
        <Minus className="size-3" />
      </button>
      <span className="min-w-8 text-center font-body text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Augmenter"
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}

function MessageField({
  option,
  value,
  onChange,
}: {
  option: OptionRecord;
  value: string;
  onChange: (value: string) => void;
}) {
  const max = messageMaxLength(option);

  return (
    <div>
      <label className="font-body text-xs text-muted-foreground">
        Votre message
        {option.messageMode === "required" && (
          <span className="text-primary"> *</span>
        )}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, max))}
        placeholder={option.messagePlaceholder ?? "Écrivez votre message…"}
        rows={3}
        maxLength={max}
        className="mt-1 w-full resize-none rounded-xl border border-border bg-bg px-3 py-2 font-body text-sm text-text outline-none focus:border-primary"
      />
      <p className="mt-1 text-right font-body text-xs text-muted-foreground tabular-nums">
        {value.length} / {max}
      </p>
    </div>
  );
}

function OccasionField({
  option,
  categories,
  value,
  onChange,
}: {
  option: OptionRecord;
  categories: MessageCategoryTree[];
  value: string;
  onChange: (value: string) => void;
}) {
  const parent = categories.find((category) => category.slug === value);
  const children = parent?.children ?? [];

  return (
    <div className="space-y-2">
      <label className="font-body text-xs text-muted-foreground">
        Type de carte
        {option.occasionMode === "required" && (
          <span className="text-primary"> *</span>
        )}
      </label>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.slug}
            type="button"
            onClick={() => onChange(category.slug)}
            className={cn(
              "cursor-pointer rounded-full border px-3 py-1.5 font-body text-xs transition-colors",
              value === category.slug ||
                category.children.some((child) => child.slug === value)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* « Fête spéciale » ouvre ses sous-occasions, réglées au back-office. */}
      {children.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {children.map((child) => (
            <button
              key={child.slug}
              type="button"
              onClick={() => onChange(child.slug)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 font-body text-xs transition-colors",
                value === child.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {child.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
