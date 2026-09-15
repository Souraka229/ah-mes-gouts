"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaInstallButtonProps = {
  label?: string;
  className?: string;
  /** Variante compacte pour la barre mobile */
  compact?: boolean;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS|FxiOS|EdgiOS/.test(ua);
  return ios && webkit && notChrome;
}

export function PwaInstallButton({
  label = "Installer l'app",
  className,
  compact = false,
}: PwaInstallButtonProps) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);
  const [iosHintOpen, setIosHintOpen] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    // iOS ne déclenche pas beforeinstallprompt — on propose quand même le bouton.
    if (isIosSafari()) {
      setShowIosHint(true);
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setShowIosHint(false);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setShowIosHint(false);
      setIosHintOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!deferred && !showIosHint) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        setDeferred(null);
      }
      return;
    }
    setIosHintOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant={compact ? "ghost" : "outline"}
        size={compact ? "icon" : "sm"}
        className={cn(
          "min-h-11 cursor-pointer gap-1.5",
          compact && "size-11 shrink-0",
          className,
        )}
        onClick={handleClick}
        aria-label={label}
        title={label}
      >
        <Download className={compact ? "size-5" : "size-3.5"} aria-hidden />
        {!compact && label}
      </Button>

      {iosHintOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-ios-title"
          onClick={() => setIosHintOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2
                id="pwa-ios-title"
                className="font-display text-xl font-semibold text-primary"
              >
                Ajouter à l&apos;écran d&apos;accueil
              </h2>
              <button
                type="button"
                onClick={() => setIosHintOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:text-primary"
                aria-label="Fermer"
              >
                <X className="size-5" />
              </button>
            </div>
            <ol className="mt-4 space-y-3 font-body text-sm text-muted-foreground">
              <li className="flex gap-3">
                <Share className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <span>
                  Appuyez sur <strong className="text-primary">Partager</strong>{" "}
                  en bas de Safari
                </span>
              </li>
              <li>
                Choisissez{" "}
                <strong className="text-primary">
                  Sur l&apos;écran d&apos;accueil
                </strong>
              </li>
              <li>Confirmez avec <strong className="text-primary">Ajouter</strong></li>
            </ol>
            <Button
              type="button"
              variant="cta"
              className="mt-6 w-full cursor-pointer rounded-full"
              onClick={() => setIosHintOpen(false)}
            >
              Compris
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
