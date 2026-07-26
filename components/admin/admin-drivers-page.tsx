"use client";

import { useCallback, useEffect, useState } from "react";
import {
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
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/drivers", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { drivers: DriverRow[] };
      setDrivers(data.drivers);
    } catch {
      setDrivers([]);
      toast.error("Impossible de charger les livreurs");
    } finally {
      setLoading(false);
    }
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
      const res = await fetch("/api/admin/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const data = (await res.json()) as {
        driver?: DriverRow;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setDrivers((prev) => [data.driver!, ...prev]);
      setName("");
      setPhone("");
      toast.success("Livreur créé — envoyez-lui son lien WhatsApp");
      void copyLink(data.driver!);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Création impossible");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (driver: DriverRow) => {
    setBusyId(driver.id);
    const next = !driver.isActive;
    const res = await fetch(`/api/admin/drivers/${driver.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    if (!res.ok) {
      toast.error("Modification impossible");
      setBusyId(null);
      return;
    }
    const data = (await res.json()) as { driver: DriverRow };
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === driver.id ? { ...d, ...data.driver } : d,
      ),
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
    const res = await fetch(`/api/admin/drivers/${driver.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerateToken: true }),
    });
    if (!res.ok) {
      toast.error("Impossible de régénérer le lien");
      setBusyId(null);
      return;
    }
    const data = (await res.json()) as { driver: DriverRow };
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === driver.id ? { ...d, ...data.driver } : d,
      ),
    );
    toast.success("Nouveau lien généré — renvoyez-le au livreur");
    void copyLink(data.driver);
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
          className="cursor-pointer gap-2 bg-accent text-text hover:bg-accent/90"
        >
          {creating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Créer le livreur
        </Button>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 font-body text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Chargement…
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
