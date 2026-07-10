"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  DeliveryOptions,
  DeliveryScheduleConfig,
  DeliveryZoneConfig,
} from "@/lib/delivery/types";

type DeliveryConfigResponse = {
  zones: DeliveryZoneConfig[];
  schedules: DeliveryScheduleConfig[];
  options: DeliveryOptions;
};

const DEFAULT_OPTIONS: DeliveryOptions = {
  maxOrdersPerSlot: 5,
  bookingDaysAhead: 7,
  pickupAddress: "Gift & ENTREMETS — Cotonou, Bénin",
};

export function useDeliveryConfig() {
  const [zones, setZones] = useState<DeliveryZoneConfig[]>([]);
  const [schedules, setSchedules] = useState<DeliveryScheduleConfig[]>([]);
  const [options, setOptions] = useState<DeliveryOptions>(DEFAULT_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/delivery/config", { cache: "no-store" });
      if (!response.ok) throw new Error("Impossible de charger la configuration");
      const data = (await response.json()) as DeliveryConfigResponse;
      setZones(data.zones);
      setSchedules(data.schedules);
      setOptions(data.options ?? DEFAULT_OPTIONS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { zones, schedules, options, loading, error, refresh };
}

export function getZoneCost(
  zones: DeliveryZoneConfig[],
  zoneId: string | null,
): number {
  if (!zoneId) return 0;
  return zones.find((z) => z.id === zoneId)?.cost ?? 0;
}

export function getZoneName(
  zones: DeliveryZoneConfig[],
  zoneId: string | null,
): string | null {
  if (!zoneId) return null;
  return zones.find((z) => z.id === zoneId)?.name ?? null;
}
