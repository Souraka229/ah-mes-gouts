"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  MapPin,
  RefreshCw,
  Sunrise,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AppError } from "@/lib/api/errors";
import { safeFetch } from "@/lib/api/safe-fetch";
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
  /**
   * Dernière panne de chargement.
   *
   * Distingue « plus aucun créneau » de « on n'a pas pu savoir » : une cliente
   * à qui l'on annonce « plus de créneau » alors que la liste a juste échoué
   * renonce à commander.
   */
  const [loadError, setLoadError] = useState<AppError | null>(null);
  /** Au moins un chargement réussi : sinon un échec initial n'est pas « vide ». */
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadSlots = useCallback(async () => {
    if (!mode) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    setLoadError(null);

    const result = await safeFetch<{ slots?: TimeSlotOption[] }>(
      `/api/delivery/slots?type=${fulfillmentType}`,
      // La route doit renvoyer la liste des créneaux : un corps vide est une
      // anomalie, pas « plus rien de libre ».
      { requireJson: true },
    );

    if (!result.ok) {
      // On ne vide JAMAIS la liste : on conserve les derniers créneaux connus
      // et on signale l'incident.
      setLoadError(result.error);
      setSlotsLoading(false);
      return;
    }

    const nextSlots = result.data?.slots ?? [];
    setSlots(nextSlots);
    setHasLoaded(true);

    // Si le créneau mémorisé n'est plus libre : bascule silencieuse sur le 1er dispo.
    const currentKey = useCheckoutStore.getState().scheduledSlot?.slotKey;
    if (nextSlots.length === 0) {
      setScheduledSlot(null);
      setSlotsLoading(false);
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

    setSlotsLoading(false);
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
        {/* Rafraîchissement raté alors qu'on a déjà des créneaux : on garde la
            liste et on prévient, plutôt que de tout effacer. */}
        {loadError && hasLoaded && (
          <div
            role="status"
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3"
          >
            <AlertTriangle
              className="size-4 shrink-0 text-destructive"
              aria-hidden
            />
            <p className="font-body text-sm text-destructive">
              {loadError.message} L&apos;affichage peut être périmé.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => void loadSlots()}
            >
              Réessayer
            </Button>
          </div>
        )}

        {loadError && !hasLoaded ? (
          /* Premier chargement en échec : l'écran ne doit JAMAIS annoncer
             « plus de créneau » — on ne sait pas si c'est le cas. */
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" aria-hidden />
              <h2 className="font-display text-base font-semibold text-destructive">
                Impossible de charger les créneaux
              </h2>
            </div>
            <p className="font-body text-sm text-muted-foreground">
              {loadError.message} Les créneaux restent réservables : seul
              l&apos;affichage a échoué.
            </p>
            <Button
              type="button"
              size="sm"
              className="cursor-pointer gap-2"
              onClick={() => void loadSlots()}
            >
              <RefreshCw className="size-4" aria-hidden />
              Réessayer
            </Button>
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
