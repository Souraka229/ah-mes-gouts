"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

import type { AppError } from "@/lib/api/errors";
import { safeFetch } from "@/lib/api/safe-fetch";
import { Button } from "@/components/ui/button";
import type { AdminActionLogEntry } from "@/lib/server/admin-action-log";

export function AdminJournalPage() {
  const [entries, setEntries] = useState<AdminActionLogEntry[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  /** Panne de chargement — distincte d'un journal réellement vide. */
  const [loadError, setLoadError] = useState<AppError | null>(null);
  /** Au moins un chargement réussi : sans lui, un échec initial n'est pas « vide ». */
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const result = await safeFetch<{ entries: AdminActionLogEntry[] }>(
      `/api/admin/journal?${params}`,
      { requireJson: true },
    );

    if (result.ok) {
      setEntries(result.data?.entries ?? []);
      setLoadError(null);
      setHasLoaded(true);
    } else {
      // Une recherche qui échoue ne doit pas effacer l'historique déjà
      // affiché : on garde les lignes connues et on signale l'incident.
      setLoadError(result.error);
    }

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
      {/* Panne survenue alors que le journal était déjà affiché : on garde les
          lignes connues et on prévient, plutôt que de laisser croire à un
          historique vide. */}
      {loadError && hasLoaded && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3"
        >
          <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
          <p className="font-body text-sm text-destructive">
            {loadError.message} L&apos;affichage peut être périmé.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => void load()}
          >
            Réessayer
          </Button>
        </div>
      )}

      {loading && !hasLoaded ? (
        <Loader2 className="size-6 animate-spin text-primary" />
      ) : loadError && !hasLoaded ? (
        /* Premier chargement en échec : une liste vide se lirait « rien ne
           s'est jamais passé », ce qu'on n'a pas vérifié. */
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" aria-hidden />
            <h2 className="font-display text-base font-semibold text-destructive">
              Impossible de charger le journal
            </h2>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            {loadError.message} Les actions ne sont pas perdues : elles restent
            enregistrées, seul l&apos;affichage a échoué.
          </p>
          <Button
            type="button"
            size="sm"
            className="cursor-pointer gap-2"
            onClick={() => void load()}
          >
            <RefreshCw className="size-4" aria-hidden />
            Réessayer
          </Button>
        </div>
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
