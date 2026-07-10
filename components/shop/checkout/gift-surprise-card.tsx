import { Gift } from "lucide-react";

type GiftSurpriseCardProps = {
  message: string | null;
  recipientName?: string | null;
};

export function GiftSurpriseCard({
  message,
  recipientName,
}: GiftSurpriseCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-secondary bg-gradient-to-br from-secondary/40 via-card to-primary/5 p-6 sm:p-8">
      <div className="absolute -top-6 -right-6 size-24 rounded-full bg-accent/20 blur-2xl" aria-hidden />
      <div className="relative flex flex-col items-center text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Gift className="size-8" aria-hidden />
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold text-primary sm:text-3xl">
          Cadeau surprise
        </h2>
        {recipientName && (
          <p className="mt-2 font-body text-sm text-muted-foreground">
            Pour {recipientName}
          </p>
        )}
        <p className="mt-3 font-body text-sm text-muted-foreground">
          Quelqu&apos;un pense à vous — une douceur arrive bientôt.
        </p>
        {message && (
          <blockquote className="mt-6 max-w-md rounded-xl border border-border/60 bg-card/80 px-5 py-4 font-display text-lg leading-relaxed text-primary italic">
            &ldquo;{message}&rdquo;
          </blockquote>
        )}
      </div>
    </div>
  );
}
