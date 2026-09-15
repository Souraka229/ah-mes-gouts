"use client";

import { Label } from "@/components/ui/label";
import { GIFT_MESSAGE_MAX } from "@/lib/product-options/types";
import { cn } from "@/lib/utils";

type ProductMessageCardProps = {
  message: string;
  onChange: (value: string) => void;
};

/**
 * « Ajoutez un petit mot » — fiche produit.
 *
 * Le mot n'est pas un produit : il est offert et part dans
 * `Order.giftMessage`. La limite de 280 caractères vient de la colonne en
 * base — on l'affiche plutôt que de laisser la cliente la découvrir par un
 * refus au paiement. C'est aussi ce qui bascule la commande en mode cadeau :
 * un mot manuscrit suppose un destinataire, que le checkout demandera.
 */
export function ProductMessageCard({
  message,
  onChange,
}: ProductMessageCardProps) {
  const remaining = GIFT_MESSAGE_MAX - message.length;
  const nearLimit = remaining <= 40;
  const trimmed = message.trim();

  return (
    <section>
      <Label
        htmlFor="product-gift-message"
        className="font-display text-xl font-semibold text-primary"
      >
        Ajoutez un petit mot
      </Label>
      <p className="mt-1 font-body text-sm text-muted-foreground">
        Écrit à la main sur une carte, joint à votre commande. Offert.
      </p>

      <textarea
        id="product-gift-message"
        value={message}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        maxLength={GIFT_MESSAGE_MAX}
        placeholder="Écrivez votre message..."
        className="mt-3 w-full resize-y rounded-2xl border border-border bg-card px-4 py-3 font-body text-base text-text placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />

      <p
        className={cn(
          "mt-2 text-right font-body text-xs tabular-nums",
          nearLimit ? "text-destructive" : "text-muted-foreground",
        )}
        aria-live="polite"
      >
        {remaining} caractère{remaining > 1 ? "s" : ""} restant
        {remaining > 1 ? "s" : ""}
      </p>

      {/* Aperçu — la carte se remplit à mesure de la frappe. */}
      <div className="relative mt-3 overflow-hidden rounded-2xl border border-border bg-bg px-6 py-6">
        <div
          className="pointer-events-none absolute inset-[10px] rounded-xl border border-border/70"
          aria-hidden
        />
        <div className="relative flex flex-col items-center text-center">
          <p className="font-body text-[10px] font-semibold tracking-[0.34em] text-muted-foreground uppercase">
            Pour toi
          </p>
          <p
            className={cn(
              "mt-4 min-h-16 font-display text-lg leading-relaxed text-balance italic sm:text-xl",
              trimmed ? "text-primary" : "text-muted-foreground/70",
            )}
          >
            {trimmed || "Votre mot apparaîtra ici."}
          </p>
          <span className="mt-4 text-accent" aria-hidden>
            ❤
          </span>
        </div>
      </div>
    </section>
  );
}
