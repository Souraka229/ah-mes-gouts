"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import type { AppError } from "@/lib/api/errors";
import { safeFetch } from "@/lib/api/safe-fetch";
import { Button } from "@/components/ui/button";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import {
  buildDriverPortalUrl,
  buildDriverWelcomeMessage,
  buildWhatsAppShareUrl,
} from "@/lib/driver/portal-links";
import { cn } from "@/lib/utils";

type DriverRow = {
  id: string;
  name: string;
  phone: string;
  accessToken: string;
  isActive: boolean;
  createdAt: string;
  deliveriesToday: number;
  totalDeliveries: number;
  lastOrderAt: string | null;
};

function formatLastOrder(value: string | null): string {
  if (!value) return "Aucune";
  return new Date(value).toLocaleString("fr-FR", {
    timeZone: "Africa/Porto-Novo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function AdminDriversPage() {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  /** Panne de chargement — distincte d'une équipe réellement vide. */
  const [loadError, setLoadError] = useState<AppError | null>(null);
  /** Au moins un chargement réussi : sans lui, un échec initial n'est pas « vide ». */
  const [hasLoaded, setHasLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await safeFetch<{ drivers: DriverRow[] }>(
      "/api/admin/drivers",
      { requireJson: true },
    );

    if (result.ok) {
      setDrivers(result.data?.drivers ?? []);
      setLoadError(null);
      setHasLoaded(true);
    } else {
      // Une panne ne doit jamais s'afficher « aucun livreur » : on conserve la
      // dernière liste connue et on signale l'incident.
      setLoadError(result.error);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const portalUrl = (token: string) => buildDriverPortalUrl(token);

  const copyLink = async (driver: DriverRow) => {
    const url = portalUrl(driver.accessToken);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(driver.id);
      toast.success("Lien copié");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Copie impossible");
    }
  };

  const sendWhatsApp = (driver: DriverRow) => {
    const url = portalUrl(driver.accessToken);
    const message = buildDriverWelcomeMessage(driver.name, url);
    const waUrl = buildWhatsAppShareUrl(driver.phone, message);
    if (!waUrl) {
      // Plutôt qu'ouvrir un wa.me que WhatsApp ne saura pas router.
      toast.error(
        "Numéro WhatsApp inexploitable. Corrigez le numéro du livreur (ex. 01 97 00 00 00).",
      );
      return;
    }
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const createDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Nom et téléphone requis");
      return;
    }
    setCreating(true);
    try {
      const result = await safeFetch<{ driver?: DriverRow }>(
        "/api/admin/drivers",
        {
          method: "POST",
          json: { name: name.trim(), phone: phone.trim() },
        },
      );
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      const driver = result.data?.driver;
      if (!driver) {
        toast.error("Le livreur n'a pas pu être créé");
        return;
      }
      setDrivers((prev) => [driver, ...prev]);
      setName("");
      setPhone("");
      toast.success("Livreur créé — envoyez-lui son lien WhatsApp");
      void copyLink(driver);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (driver: DriverRow) => {
    setBusyId(driver.id);
    const next = !driver.isActive;
    const result = await safeFetch<{ driver: DriverRow }>(
      `/api/admin/drivers/${driver.id}`,
      { method: "PATCH", json: { isActive: next } },
    );
    if (!result.ok) {
      toast.error(result.error.message);
      setBusyId(null);
      return;
    }
    const updated = result.data?.driver;
    if (!updated) {
      toast.error("Modification impossible");
      setBusyId(null);
      return;
    }
    setDrivers((prev) =>
      prev.map((d) => (d.id === driver.id ? { ...d, ...updated } : d)),
    );
    toast.success(next ? "Livreur activé" : "Livreur désactivé");
    setBusyId(null);
  };

  const regenerateLink = async (driver: DriverRow) => {
    if (
      !window.confirm(
        `Régénérer le lien de ${driver.name} ? L'ancien lien ne fonctionnera plus.`,
      )
    ) {
      return;
    }
    setBusyId(driver.id);
    const result = await safeFetch<{ driver: DriverRow }>(
      `/api/admin/drivers/${driver.id}`,
      { method: "PATCH", json: { regenerateToken: true } },
    );
    if (!result.ok) {
      toast.error(result.error.message);
      setBusyId(null);
      return;
    }
    const updated = result.data?.driver;
    if (!updated) {
      toast.error("Impossible de régénérer le lien");
      setBusyId(null);
      return;
    }
    setDrivers((prev) =>
      prev.map((d) => (d.id === driver.id ? { ...d, ...updated } : d)),
    );
    toast.success("Nouveau lien généré — renvoyez-le au livreur");
    void copyLink(updated);
    setBusyId(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold text-primary">
          Livreurs
        </h1>
        <p className="mt-2 max-w-2xl font-body text-sm text-muted-foreground">
          Ajoutez un livreur avec son nom et son téléphone — aucun mot de passe.
          Partagez son lien personnel sur WhatsApp : il voit uniquement ses
          livraisons du jour.
        </p>
      </header>

      <form
        onSubmit={createDriver}
        className="rounded-2xl border-2 border-accent/30 bg-card p-6 space-y-4"
      >
        <h2 className="font-display text-lg font-semibold text-primary">
          Nouveau livreur
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="font-body text-sm font-medium">
              Nom complet <span className="text-destructive">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Kossi Mensah"
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-3 font-body text-base"
            />
          </div>
          <div>
            <label className="font-body text-sm font-medium">
              Téléphone <span className="text-destructive">*</span>
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+229 97 00 00 00"
              type="tel"
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-3 font-body text-base"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={creating}
          size="lg"
          className="cursor-pointer gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {creating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Créer le livreur
        </Button>
      </form>

      {/* Panne survenue alors que la liste était déjà affichée : on garde les
          livreurs connus et on prévient, plutôt que de tout effacer. */}
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
        <div className="flex items-center gap-2 font-body text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Chargement…
        </div>
      ) : loadError && !hasLoaded ? (
        /* Premier chargement en échec : « aucun livreur » serait un mensonge —
           on ne sait pas qui est enregistré. */
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" aria-hidden />
            <h2 className="font-display text-base font-semibold text-destructive">
              Impossible de charger les livreurs
            </h2>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            {loadError.message} Les livreurs ne sont pas perdus : ils restent
            enregistrés, seul l&apos;affichage a échoué.
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
      ) : drivers.length === 0 ? (
        <AdminEmptyState
          variant="drivers"
          title="Aucun livreur"
          description="Ajoute ton premier livreur pour assigner les sorties depuis le board commandes."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[72rem] font-body text-sm">
            <thead>
              <tr className="border-b border-border bg-bg/80 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Livreur</th>
                <th className="px-4 py-3 font-medium">Téléphone</th>
                <th className="px-4 py-3 font-medium text-center">
                  Aujourd&apos;hui
                </th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Dernière commande</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr
                  key={driver.id}
                  className={cn(
                    "border-b border-border/60 last:border-0",
                    !driver.isActive && "opacity-60",
                  )}
                >
                  <td className="px-4 py-4 font-medium text-primary">
                    <Link
                      href={`/admin/livreurs/${driver.id}`}
                      className="cursor-pointer hover:underline"
                    >
                      {driver.name}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {driver.phone}
                  </td>
                  <td className="px-4 py-4 text-center font-semibold text-primary">
                    {driver.deliveriesToday}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {driver.totalDeliveries}
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">
                    {formatLastOrder(driver.lastOrderAt)}
                  </td>
                  <td className="px-4 py-4 text-xs font-medium">
                    {driver.isActive ? (
                      <span className="text-success">Actif</span>
                    ) : (
                      <span className="text-muted-foreground">Inactif</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer gap-1.5"
                        disabled={busyId === driver.id}
                        onClick={() => void copyLink(driver)}
                      >
                        {copiedId === driver.id ? (
                          <Check className="size-3.5 text-success" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        Copier lien
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="cursor-pointer gap-1.5 bg-[#25D366] text-white hover:bg-[#20bd5a]"
                        disabled={busyId === driver.id || !driver.isActive}
                        onClick={() => sendWhatsApp(driver)}
                      >
                        <MessageCircle className="size-3.5" />
                        WhatsApp
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer gap-1.5"
                        disabled={busyId === driver.id}
                        onClick={() => void toggleActive(driver)}
                      >
                        <UserX className="size-3.5" />
                        {driver.isActive ? "Désactiver" : "Activer"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer gap-1.5 text-muted-foreground"
                        disabled={busyId === driver.id}
                        title="Si le téléphone est perdu"
                        onClick={() => void regenerateLink(driver)}
                      >
                        <RefreshCw className="size-3.5" />
                        Nouveau lien
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
