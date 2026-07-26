"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";

import {
  formatSlotDate,
  getSelectableDates,
  getSlotsForDate,
  isDateClosed,
} from "@/lib/delivery/slots";
import { useCheckoutStore } from "@/lib/checkout-store";
import { useDeliveryConfig } from "@/lib/hooks/use-delivery-config";
import { cn } from "@/lib/utils";

export function StepSchedule({ embedded = false }: { embedded?: boolean }) {
  const mode = useCheckoutStore((state) => state.mode);
  const scheduledSlot = useCheckoutStore((state) => state.scheduledSlot);
  const setScheduledSlot = useCheckoutStore((state) => state.setScheduledSlot);

  const { schedules, options, loading } = useDeliveryConfig();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);

  // « Sur place » et « À emporter » partagent les horaires boutique (pickup).
  const fulfillmentType = mode === "delivery" ? "delivery" : "pickup";
  const now = useMemo(() => new Date(), []);

  const selectableDates = useMemo(
    () =>
      mode
        ? getSelectableDates(
            schedules,
            fulfillmentType,
            now,
            options.bookingDaysAhead,
          )
        : [],
    [schedules, fulfillmentType, mode, now, options.bookingDaysAhead],
  );

  useEffect(() => {
    if (!selectedDate && selectableDates.length > 0) {
      setSelectedDate(selectableDates[0]!);
    }
  }, [selectableDates, selectedDate]);

  const slots = useMemo(() => {
    if (!selectedDate || !mode) return [];
    return getSlotsForDate(schedules, fulfillmentType, selectedDate, now);
  }, [selectedDate, schedules, fulfillmentType, mode, now]);

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
            {mode === "delivery"
              ? "Choisissez le jour et la vague de livraison (13h–15h30 ou 16h–18h30)."
              : mode === "dinein"
                ? "Choisissez le jour de votre venue — vous passez quand vous voulez (jusqu'à 19h)."
                : "Choisissez le jour — vous passez chercher quand vous voulez (jusqu'à 19h)."}
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

      <div className="space-y-3">
        <div className="flex items-center gap-2 font-body text-sm font-medium text-primary">
          <CalendarDays className="size-4" aria-hidden />
          Date
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: options.bookingDaysAhead }, (_, offset) => {
            const date = new Date(now);
            date.setDate(now.getDate() + offset);
            date.setHours(0, 0, 0, 0);
            const closed = isDateClosed(schedules, fulfillmentType, date);
            const selectable = selectableDates.some(
              (d) => d.toDateString() === date.toDateString(),
            );
            const isSelected =
              selectedDate?.toDateString() === date.toDateString();

            return (
              <button
                key={offset}
                type="button"
                disabled={closed || !selectable}
                title={closed ? "Fermé ce jour" : undefined}
                onClick={() => {
                  if (!closed && selectable) {
                    setSelectedDate(date);
                    setScheduledSlot(null);
                    setSlotError(null);
                  }
                }}
                className={cn(
                  "min-h-14 min-w-[5.5rem] shrink-0 cursor-pointer rounded-2xl border px-3 py-2 text-center font-body text-xs transition-all duration-[250ms] sm:min-w-24 sm:text-sm",
                  isSelected && "border-primary bg-primary/5 shadow-md",
                  !isSelected &&
                    !closed &&
                    selectable &&
                    "border-border bg-card hover:border-primary/40",
                  (closed || !selectable) &&
                    "cursor-not-allowed border-border/60 bg-muted/40 text-muted-foreground opacity-60",
                )}
              >
                <span className="block font-semibold capitalize">
                  {date.toLocaleDateString("fr-FR", { weekday: "short" })}
                </span>
                <span className="mt-1 block">
                  {date.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <p className="font-body text-sm font-medium text-primary">
          {selectedDate
            ? `Créneaux — ${formatSlotDate(selectedDate)}`
            : "Créneaux horaires"}
        </p>

        {slots.length === 0 ? (
          <p className="rounded-2xl border border-border bg-muted/30 px-4 py-6 text-center font-body text-sm text-muted-foreground">
            Aucun créneau disponible pour cette date.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                    setSlotError(null);
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

      {slotError && (
        <p role="alert" className="font-body text-sm text-destructive">
          {slotError}
        </p>
      )}
    </div>
  );
}
