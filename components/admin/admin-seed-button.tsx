"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

import { safeFetch } from "@/lib/api/safe-fetch";
import { Button } from "@/components/ui/button";

export function AdminSeedButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSeed = async () => {
    setLoading(true);
    setMessage(null);
    try {
      // `requireJson` : sans le compte renvoyé, annoncer « 0 commandes
      // chargées » serait faux — mieux vaut dire que la réponse est anormale.
      const result = await safeFetch<{ count?: number }>("/api/admin/seed", {
        method: "POST",
        requireJson: true,
      });
      if (!result.ok) {
        setMessage(result.error.message);
        return;
      }
      setMessage(`${result.data?.count ?? 0} commandes de démo chargées.`);
      router.refresh();
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
