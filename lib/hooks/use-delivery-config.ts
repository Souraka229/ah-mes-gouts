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

/** Une seule requête partagée entre tous les hooks checkout montés. */
let sharedPromise: Promise<DeliveryConfigResponse> | null = null;
let sharedCache: DeliveryConfigResponse | null = null;

async function fetchDeliveryConfig(
  force = false,
): Promise<DeliveryConfigResponse> {
  if (!force && sharedCache) return sharedCache;
  if (!force && sharedPromise) return sharedPromise;

  sharedPromise = fetch("/api/delivery/config")
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Impossible de charger la configuration");
      }
      const data = (await response.json()) as DeliveryConfigResponse;
      sharedCache = {
        zones: data.zones,
        schedules: data.schedules,
        options: data.options ?? DEFAULT_OPTIONS,
      };
      return sharedCache;
    })
    .finally(() => {
      sharedPromise = null;
    });

  return sharedPromise;
}

export function useDeliveryConfig() {
  const [zones, setZones] = useState<DeliveryZoneConfig[]>(
    () => sharedCache?.zones ?? [],
  );
  const [schedules, setSchedules] = useState<DeliveryScheduleConfig[]>(
    () => sharedCache?.schedules ?? [],
  );
  const [options, setOptions] = useState<DeliveryOptions>(
    () => sharedCache?.options ?? DEFAULT_OPTIONS,
  );
  const [loading, setLoading] = useState(!sharedCache);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDeliveryConfig(force);
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
    void refresh(false);
  }, [refresh]);

  return {
    zones,
    schedules,
    options,
    loading,
    error,
    refresh: () => refresh(true),
  };
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
