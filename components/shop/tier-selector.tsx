"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, MessageCircle, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import {
  generatePredefinedWhatsAppLink,
  getTierForAmount,
  PRICING_TIERS,
} from "@/lib/pricing-tiers";
import { cn } from "@/lib/utils";

const MIN_AMOUNT = PRICING_TIERS[0]!.minPrice;
const MAX_AMOUNT = PRICING_TIERS[PRICING_TIERS.length - 1]!.maxPrice;
const PRESETS = [15_000, 35_000, 65_000, 100_000];

interface CustomTierSelectorProps {
  categoryName?: string;
  productName?: string;
  defaultAmount?: number;
  onAmountChange?: (amount: number) => void;
}

/**
 * Sélecteur de palier avantages.
 *
 * Le montant pilote l'affichage des avantages ; la commande réelle se compose
 * dans le composeur de cadeau, où chaque produit est un vrai produit du
 * catalogue. Ce sélecteur ne met donc rien au panier lui-même.
 */
export function CustomTierSelector({
  categoryName = "Toutes catégories",
  productName = "Formule à montant libre",
  defaultAmount = 25_000,
  onAmountChange,
}: CustomTierSelectorProps) {
  const [amount, setAmount] = useState<number>(defaultAmount);
  const activeTier = getTierForAmount(amount);

  const handleAmountChange = (next: number) => {
    if (Number.isNaN(next)) return;
    const clamped = Math.min(Math.max(next, MIN_AMOUNT), MAX_AMOUNT);
    setAmount(clamped);
    onAmountChange?.(clamped);
  };

  const whatsappLink = generatePredefinedWhatsAppLink({
    categoryName,
    productName,
    amount,
  });

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-primary">
            <Sparkles className="size-5 text-secondary" aria-hidden />
            Choisissez votre montant
          </h3>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            Entre {formatPrice(MIN_AMOUNT)} et {formatPrice(MAX_AMOUNT)} — les
            avantages se débloquent par palier.
          </p>
        </div>
        {activeTier && (
          <Badge className="shrink-0 border-0 bg-secondary/15 text-secondary">
            {activeTier.badge}
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <label
            htmlFor="tier-amount"
            className="font-body text-sm font-medium text-text"
          >
            Montant sélectionné
          </label>
          <div className="flex items-center gap-2">
            <input
              id="tier-amount"
              type="number"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              step={1000}
              value={amount}
              onChange={(event) => handleAmountChange(Number(event.target.value))}
              className="w-28 rounded-lg border border-border bg-bg px-3 py-1.5 text-right font-body text-lg font-semibold tabular-nums text-primary focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
            <span className="font-body text-sm font-semibold text-muted-foreground">
              F
            </span>
          </div>
        </div>

        <input
          type="range"
          min={MIN_AMOUNT}
          max={MAX_AMOUNT}
          step={5000}
          value={amount}
          onChange={(event) => handleAmountChange(Number(event.target.value))}
          aria-label="Montant du cadeau"
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
        />

        <div className="flex justify-between font-body text-xs tabular-nums text-muted-foreground">
          <span>{formatPrice(MIN_AMOUNT)}</span>
          <span>{formatPrice(MAX_AMOUNT)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handleAmountChange(preset)}
            aria-pressed={amount === preset}
            className={
              amount === preset
                ? "cursor-pointer rounded-lg border border-primary bg-primary px-2 py-1.5 font-body text-xs font-semibold tabular-nums text-primary-foreground"
                : "cursor-pointer rounded-lg border border-border bg-bg px-2 py-1.5 font-body text-xs font-semibold tabular-nums text-text transition-colors hover:border-primary/40"
            }
          >
            {formatPrice(preset)}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-4">
        <h4 className="font-body text-sm font-semibold text-text">
          Avantages débloqués
        </h4>
        {activeTier ? (
          <>
            <p className="mt-0.5 font-body text-xs text-muted-foreground">
              {activeTier.name}
            </p>
            <ul className="mt-3 space-y-2">
              {activeTier.benefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-start gap-2 font-body text-xs text-text"
                >
                  <Check
                    className="mt-0.5 size-3.5 shrink-0 text-success"
                    aria-hidden
                  />
                  {benefit}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 font-body text-xs text-muted-foreground italic">
            Choisissez un montant entre {formatPrice(MIN_AMOUNT)} et{" "}
            {formatPrice(MAX_AMOUNT)} pour voir vos avantages.
          </p>
        )}
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <Link
          href="/catalogue"
          className={cn(
            buttonVariants({ variant: "cta", size: "lg" }),
            "w-full cursor-pointer",
          )}
        >
          Composer un cadeau à ce montant
        </Link>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 font-body text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          <MessageCircle className="size-3.5" aria-hidden />
          Un montant sur mesure ? Écrivez-nous sur WhatsApp
        </a>
      </div>
    </div>
  );
}
