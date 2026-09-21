"use client";

import { Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GiftComposerButton({
  isGift,
  onToggle,
}: {
  isGift: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <Button
      type="button"
      variant={isGift ? "cta" : "outline"}
      size="lg"
      className="w-full cursor-pointer gap-2"
      onClick={() => onToggle(!isGift)}
    >
      {isGift ? (
        <>
          <Sparkles className="size-4" aria-hidden />
          Mode cadeau activé — composez votre surprise
        </>
      ) : (
        <>
          <Gift className="size-4" aria-hidden />
          Composer un cadeau
        </>
      )}
    </Button>
  );
}
