"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function AdminSeedButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSeed = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/seed", { method: "POST" });
      const data = (await res.json()) as { count?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setMessage(`${data.count ?? 0} commandes de démo chargées.`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Échec du rechargement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer gap-2"
        disabled={loading}
        onClick={() => void handleSeed()}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="size-4" aria-hidden />
        )}
        Recharger les données démo
      </Button>
      {message && (
        <p className="font-body text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
