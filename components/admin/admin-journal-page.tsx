"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import type { AdminActionLogEntry } from "@/lib/server/admin-action-log";

export function AdminJournalPage() {
  const [entries, setEntries] = useState<AdminActionLogEntry[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/journal?${params}`, { cache: "no-store" });
    const data = (await res.json()) as { entries: AdminActionLogEntry[] };
    setEntries(data.entries ?? []);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">
          Journal des actions
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Tout ce qui a été modifié, par qui et quand.
        </p>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtrer par mot-clé, action, admin…"
        className="w-full max-w-md rounded-xl border border-border px-4 py-2 font-body text-sm"
      />
      {loading ? (
        <Loader2 className="size-6 animate-spin text-primary" />
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
          {entries.map((e) => (
            <li key={e.id} className="px-4 py-3 font-body text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-text">{e.summary}</p>
                <time className="text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString("fr-FR")}
                </time>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {e.adminName} · {e.action} · {e.source}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
