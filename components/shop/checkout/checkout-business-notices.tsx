import {
  AlertTriangle,
  MessageCircle,
} from "lucide-react";

import {
  CHECKOUT_NOTICES,
  LATE_PENALTIES,
  WHATSAPP_PICKUP,
} from "@/lib/business-info";
import { cn } from "@/lib/utils";

type CheckoutBusinessNoticesProps = {
  variant?: "compact" | "full";
  className?: string;
};

/** Bandes d'info checkout — sans toucher aux moyens de paiement. */
export function CheckoutBusinessNotices({
  variant = "compact",
  className,
}: CheckoutBusinessNoticesProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-start gap-3 rounded-2xl border border-secondary bg-secondary/20 px-4 py-3 font-body text-sm text-text">
        <AlertTriangle
          className="mt-0.5 size-4 shrink-0 text-primary"
          aria-hidden
        />
        <p>{CHECKOUT_NOTICES.sameDay}</p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3 font-body text-sm text-text">
        <MessageCircle
          className="mt-0.5 size-4 shrink-0 text-primary"
          aria-hidden
        />
        <div>
          <p>{CHECKOUT_NOTICES.whatsapp}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            WhatsApp boutique :{" "}
            <a
              href={WHATSAPP_PICKUP.waMe}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer font-medium text-primary underline-offset-2 hover:underline"
            >
              {WHATSAPP_PICKUP.display}
            </a>
          </p>
        </div>
      </div>

      {variant === "full" && (
        <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 font-body text-xs text-muted-foreground">
          <p className="font-medium text-text">Pénalités de retard</p>
          <ul className="mt-1 space-y-0.5">
            {LATE_PENALTIES.map((item) => (
              <li key={item.type}>
                {item.type} : {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
