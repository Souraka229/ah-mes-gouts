"use client";

import { useEffect, useMemo } from "react";
import { CalendarDays, MapPin } from "lucide-react";

import {
  formatSlotDate,
  getSlotsForDate,
} from "@/lib/delivery/slots";
import { useCheckoutStore } from "@/lib/checkout-store";
import { useDeliveryConfig } from "@/lib/hooks/use-delivery-config";
import { cn } from "@/lib/utils";
import { isTodayAtShop } from "@/lib/business-date";

export function StepSchedule({ embedded = false }: { embedded?: boolean }) {
  const mode = useCheckoutStore((state) => state.mode);
  const scheduledSlot = useCheckoutStore((state) => state.scheduledSlot);
  const setScheduledSlot = useCheckoutStore((state) => state.setScheduledSlot);

  const { schedules, options, loading } = useDeliveryConfig();

  // « Sur place » et « À emporter » partagent les horaires boutique (pickup).
  const fulfillmentType = mode === "delivery" ? "delivery" : "pickup";
  const now = useMemo(() => new Date(), []);

  const slots = useMemo(() => {
    if (!mode) return [];
    return getSlotsForDate(schedules, fulfillmentType, now, now).slice(0, 2);
  }, [schedules, fulfillmentType, mode, now]);

  useEffect(() => {
    if (!scheduledSlot) return;
    const stillValid =
      isTodayAtShop(scheduledSlot.start) &&
      slots.some((slot) => slot.slotKey === scheduledSlot.slotKey);
    if (!stillValid) setScheduledSlot(null);
  }, [scheduledSlot, setScheduledSlot, slots]);

  if (!mode) return null;

  if (loading) {
    return (
      <p className="font-body text-muted-foreground">
        Chargement des créneaux disponibles...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary sm:text-4xl">
            Choisissez votre créneau
          </h1>
          <p className="mt-2 font-body text-muted-foreground">
            Votre commande concerne uniquement le menu d&apos;aujourd&apos;hui.
          </p>
        </div>
      )}

      {mode !== "delivery" && (
        <div className="flex items-start gap-3 rounded-2xl border border-secondary bg-secondary/20 px-4 py-3 font-body text-sm text-text">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-medium text-primary">Adresse de la boutique</p>
            <p className="mt-1 text-muted-foreground">{options.pickupAddress}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-2xl border border-secondary/60 bg-secondary/15 px-4 py-3">
        <CalendarDays className="size-5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="font-body text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Commande du jour
          </p>
          <p className="font-body text-sm font-semibold capitalize text-primary">
            {formatSlotDate(now)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 font-body text-sm font-medium text-primary">
          <CalendarDays className="size-4" aria-hidden />
          Deux créneaux aujourd&apos;hui
        </div>

        {slots.length === 0 ? (
          <p className="rounded-2xl border border-border bg-muted/30 px-4 py-6 text-center font-body text-sm text-muted-foreground">
            Les créneaux d&apos;aujourd&apos;hui sont terminés. Le prochain menu
            sera disponible demain.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {slots.map((slot) => {
              const selected = scheduledSlot?.slotKey === slot.slotKey;
              return (
                <button
                  key={slot.slotKey}
                  type="button"
                  onClick={() => {
                    setScheduledSlot({
                      start: slot.start,
                      end: slot.end,
                      slotKey: slot.slotKey,
                    });
                  }}
                  className={cn(
                    "min-h-14 cursor-pointer rounded-2xl border px-4 py-3 font-body text-sm font-semibold transition-all duration-[250ms]",
                    selected
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-card text-text hover:border-primary/40",
                  )}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
