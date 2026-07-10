"use client";

import { useEffect, useRef } from "react";

import { fromPrismaOrderStatus } from "@/lib/orders/prisma-status";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { OrderStatus } from "@/types/order";

export type OrderStatusFeedRow = {
  id: string;
  status: OrderStatus;
  updatedAt: string;
};

type UseOrderRealtimeOptions = {
  /** Filtrer un seul orderId (suivi client). Omis = tous les changements (admin). */
  orderId?: string;
  enabled?: boolean;
  onStatusChange: (row: OrderStatusFeedRow) => void;
};

export function useOrderRealtime({
  orderId,
  enabled = true,
  onStatusChange,
}: UseOrderRealtimeOptions) {
  const callbackRef = useRef(onStatusChange);
  callbackRef.current = onStatusChange;

  useEffect(() => {
    if (!enabled) return;
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;

    let supabase;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      return;
    }

    const channelName = orderId
      ? `order-feed-${orderId}`
      : "order-feed-admin";

    const filter = orderId ? `id=eq.${orderId}` : undefined;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "OrderStatusFeed",
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            status?: string;
            updatedAt?: string;
          };
          if (!row?.id || !row.status) return;
          callbackRef.current({
            id: row.id,
            status: fromPrismaOrderStatus(row.status),
            updatedAt: row.updatedAt ?? new Date().toISOString(),
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId, enabled]);
}
