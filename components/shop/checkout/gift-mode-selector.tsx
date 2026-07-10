"use client";

import { Gift, User } from "lucide-react";

import { cn } from "@/lib/utils";

type GiftModeSelectorProps = {
  isGift: boolean;
  onChange: (isGift: boolean) => void;
};

export function GiftModeSelector({ isGift, onChange }: GiftModeSelectorProps) {
  return (
    <div
      className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/40 p-1.5"
      role="group"
      aria-label="Type de commande"
    >
      <SegmentOption
        selected={!isGift}
        icon={User}
        label="C'est pour moi"
        description="Je commande pour moi-même"
        onClick={() => onChange(false)}
      />
      <SegmentOption
        selected={isGift}
        icon={Gift}
        label="C'est un cadeau"
        description="Offrir une surprise"
        onClick={() => onChange(true)}
      />
    </div>
  );
}

type SegmentOptionProps = {
  selected: boolean;
  icon: typeof User;
  label: string;
  description: string;
  onClick: () => void;
};

function SegmentOption({
  selected,
  icon: Icon,
  label,
  description,
  onClick,
}: SegmentOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex cursor-pointer flex-col items-start gap-2 rounded-xl px-4 py-3 text-left transition-all duration-[250ms]",
        selected
          ? "bg-card shadow-md ring-2 ring-primary/20"
          : "hover:bg-card/60",
      )}
    >
      <div
        className={cn(
          "flex size-9 items-center justify-center rounded-full",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-primary",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </div>
      <div>
        <p className="font-display text-lg font-semibold text-primary">
          {label}
        </p>
        <p className="font-body text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
