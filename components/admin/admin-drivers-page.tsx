"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Plus, Truck, UserX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DriverRow = {
  id: string;
  name: string;
  phone: string;
  accessToken: string;
  isActive: boolean;
  createdAt: string;
};

export function AdminDriversPage() {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const portalUrl = (token: string) => {
    if (typeof window === "undefined") return `/livreur/${token}`;
    return `${window.location.origin}/livreur/${token}`;
  };

  const copyLink = async (driver: DriverRow) => {
    const url = portalUrl(driver.accessToken);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(driver.id);
      toast.success("Lien copié dans le presse-papiers");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Copie impossible — copiez manuellement");
    }
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
      const data = (await res.json()) as { driver?: DriverRow; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setDrivers((prev) => [data.driver!, ...prev]);
      setName("");
      setPhone("");
      toast.success("Livreur créé — copiez son lien portail");
      void copyLink(data.driver!);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Création impossible");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (driver: DriverRow) => {
    const next = !driver.isActive;
    const res = await fetch(`/api/admin/drivers/${driver.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    if (!res.ok) {
      toast.error("Modification impossible");
      return;
    }
    const data = (await res.json()) as { driver: DriverRow };
    setDrivers((prev) =>
      prev.map((d) => (d.id === driver.id ? data.driver : d)),
    );
    toast.success(next ? "Livreur activé" : "Livreur désactivé");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold text-primary">
          Livreurs
        </h1>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          Créez un livreur, copiez son lien personnel — il voit uniquement ses
          livraisons du jour sur mobile.
        </p>
      </header>

      <form
        onSubmit={createDriver}
        className="rounded-2xl border border-border bg-card p-6 space-y-4"
      >
        <h2 className="font-display text-lg font-semibold text-primary">
          Ajouter un livreur
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="font-body text-sm font-medium">Nom complet</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Kossi Mensah"
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2.5 font-body text-sm"
            />
          </div>
          <div>
            <label className="font-body text-sm font-medium">Téléphone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+229 97 00 00 00"
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2.5 font-body text-sm"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={creating}
          className="cursor-pointer gap-2"
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
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <Truck className="mx-auto size-10 text-muted-foreground/50" />
          <p className="mt-4 font-body text-sm text-muted-foreground">
            Aucun livreur. Créez-en un pour assigner les commandes « Prête ».
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {drivers.map((driver) => (
            <li
              key={driver.id}
              className={cn(
                "rounded-2xl border bg-card p-5",
                driver.isActive ? "border-border" : "border-dashed opacity-70",
              )}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-display text-lg font-semibold text-primary">
                    {driver.name}
                  </p>
                  <p className="mt-1 font-body text-sm text-muted-foreground">
                    {driver.phone}
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                    {portalUrl(driver.accessToken)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer gap-2"
                    onClick={() => void copyLink(driver)}
                  >
                    {copiedId === driver.id ? (
                      <Check className="size-4 text-success" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                    Copier le lien
                  </Button>
                  <Button
                    type="button"
                    variant={driver.isActive ? "outline" : "default"}
                    size="sm"
                    className="cursor-pointer gap-2"
                    onClick={() => void toggleActive(driver)}
                  >
                    <UserX className="size-4" />
                    {driver.isActive ? "Désactiver" : "Activer"}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
