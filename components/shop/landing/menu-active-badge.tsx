"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type MenuActiveResponse = {
  activeMenu: { productIds: string[] } | null;
  nextMenu: { activateAt: string } | null;
  activateAtLabel: string | null;
};

export function MenuActiveBadge() {
  const [data, setData] = useState<MenuActiveResponse | null>(null);

  useEffect(() => {
    void fetch("/api/menu/active", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setData(json as MenuActiveResponse | null))
      .catch(() => null);
  }, []);

  if (!data?.activeMenu) return null;

  const nextIn2h =
    data.nextMenu &&
    new Date(data.nextMenu.activateAt).getTime() - Date.now() < 2 * 60 * 60 * 1000 &&
    new Date(data.nextMenu.activateAt).getTime() > Date.now();

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-center gap-3 px-5 sm:px-8 lg:px-10">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 font-body text-sm font-medium text-emerald-900">
        <span
          className="relative flex size-2"
          aria-hidden
        >
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
        </span>
        Menu du jour actif
        <span className="text-emerald-700/80">
          · {data.activeMenu.productIds.length} créations
        </span>
      </div>
      {nextIn2h && data.activateAtLabel && (
        <Link
          href="/catalogue"
          className="font-body text-xs text-muted-foreground hover:text-primary"
        >
          Nouveau menu dès {data.activateAtLabel}
        </Link>
      )}
    </div>
  );
}
