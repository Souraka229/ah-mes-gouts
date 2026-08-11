"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Sunrise } from "lucide-react";

import { getShopDateKey, isTodayAtShop } from "@/lib/business-date";
import { formatSlotDate } from "@/lib/delivery/slots";
import type { TimeSlotOption } from "@/lib/delivery/types";
import { useCheckoutStore } from "@/lib/checkout-store";
import { useDeliveryConfig } from "@/lib/hooks/use-delivery-config";
import { cn } from "@/lib/utils";

export function StepSchedule({ embedded = false }: { embedded?: boolean }) {
  const mode = useCheckoutStore((state) => state.mode);
  const scheduledSlot = useCheckoutStore((state) => state.scheduledSlot);
  const setScheduledSlot = useCheckoutStore((state) => state.setScheduledSlot);

  const { options, loading: configLoading } = useDeliveryConfig();

  // « Sur place » et « À emporter » partagent les horaires boutique (pickup).
  const fulfillmentType = mode === "delivery" ? "delivery" : "pickup";

  const [slots, setSlots] = useState<TimeSlotOption[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    if (!mode) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      const response = await fetch(
        `/api/delivery/slots?type=${fulfillmentType}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error("Impossible de charger les créneaux.");
      }
      const data = (await response.json()) as { slots?: TimeSlotOption[] };
      const nextSlots = data.slots ?? [];
      setSlots(nextSlots);

      // Si le créneau mémorisé n'est plus libre : bascule silencieuse sur le 1er dispo.
      const currentKey = useCheckoutStore.getState().scheduledSlot?.slotKey;
      if (nextSlots.length === 0) {
        setScheduledSlot(null);
        return;
      }
      const stillValid = nextSlots.some((slot) => slot.slotKey === currentKey);
      if (!stillValid) {
        const first = nextSlots[0]!;
        setScheduledSlot({
          start: first.start,
          end: first.end,
          slotKey: first.slotKey,
        });
      }
    } catch {
      setSlotsError("Créneaux temporairement inaccessibles. Réessayez.");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [fulfillmentType, mode, setScheduledSlot]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  // Les créneaux couvrent aujourd'hui, et demain dès 20 h — on les sépare en
  // deux blocs pour que la cliente ne se trompe jamais de journée.
  const slotsByDay = useMemo(() => {
    const groups = new Map<string, { date: Date; slots: TimeSlotOption[] }>();
    for (const slot of slots) {
      const key = getShopDateKey(slot.start);
      const group = groups.get(key);
      if (group) group.slots.push(slot);
      else groups.set(key, { date: new Date(slot.start), slots: [slot] });
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, group]) => ({
        dateKey,
        isToday: isTodayAtShop(group.date),
        label: formatSlotDate(group.date),
        slots: group.slots,
      }));
  }, [slots]);

  if (!mode) return null;

  const loading = configLoading || slotsLoading;

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
            Le menu est journalier. Dès 20 h, vous pouvez aussi réserver un
            créneau pour demain.
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
        {slotsError ? (
          <div className="space-y-3">
            <p className="rounded-2xl border border-border bg-muted/30 px-4 py-6 text-center font-body text-sm text-muted-foreground">
              {slotsError}
            </p>
            <button
              type="button"
              onClick={() => void loadSlots()}
              className="mx-auto block min-h-11 cursor-pointer font-body text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Actualiser
            </button>
          </div>
        ) : slotsByDay.length === 0 ? (
          <p className="rounded-2xl border border-border bg-muted/30 px-4 py-6 text-center font-body text-sm text-muted-foreground">
            Plus de créneau disponible aujourd&apos;hui. Les créneaux de demain
            ouvrent à 20 h.
          </p>
        ) : (
          slotsByDay.map((day) => (
            <div key={day.dateKey} className="space-y-3">
              <div
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3",
                  day.isToday
                    ? "border-secondary/60 bg-secondary/15"
                    : "border-primary/40 bg-primary/5",
                )}
              >
                {day.isToday ? (
                  <CalendarDays
                    className="size-5 shrink-0 text-primary"
                    aria-hidden
                  />
                ) : (
                  <Sunrise className="size-5 shrink-0 text-primary" aria-hidden />
                )}
                <div>
                  <p className="font-body text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {day.isToday ? "Aujourd’hui" : "Demain"}
                  </p>
                  <p className="font-body text-sm font-semibold capitalize text-primary">
                    {day.label}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  "grid gap-3",
                  day.slots.length === 1 ? "grid-cols-1" : "grid-cols-2",
                )}
              >
                {day.slots.map((slot) => {
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
