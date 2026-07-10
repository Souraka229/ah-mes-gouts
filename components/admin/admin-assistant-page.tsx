"use client";

import Link from "next/link";
import {
  Bot,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AdminAssistantStepper } from "@/components/admin/admin-assistant-stepper";
import { Button } from "@/components/ui/button";
import type {
  ActionPreview,
  AssistantStep,
  ParsedAssistantAction,
} from "@/lib/admin-assistant/types";
import { PASTE_MAX_LENGTH } from "@/lib/admin-assistant/extract-json";
import { cn } from "@/lib/utils";

const PLACEHOLDER_EXAMPLES = [
  'Ajoute un produit "Fraise Basilic" à 4500 FCFA en catégorie Glaces',
  "Change le prix de Mango Passion à 5500 FCFA",
  "Désactive la zone Abomey-Calavi",
  "Le stock de Mangue Passion tombe à 15",
  "Mets une promo à 4000 F sur Vanilla Caramel",
  "Ferme la livraison le dimanche",
];

const CHATGPT_URL = "https://chatgpt.com/";

type JournalEntry = {
  id: string;
  createdAt: string;
  adminName: string;
  source: string;
  action: string;
  summary: string;
};

export function AdminAssistantPage() {
  const [step, setStep] = useState<AssistantStep>("describe");
  const [input, setInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [pasted, setPasted] = useState("");
  const [preview, setPreview] = useState<ActionPreview | null>(null);
  const [parsed, setParsed] = useState<ParsedAssistantAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  const loadJournal = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/assistant/journal", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { entries: JournalEntry[] };
        setJournal(data.entries);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadJournal();
  }, [loadJournal]);

  const handleGeneratePrompt = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/assistant/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = (await res.json()) as { prompt?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setPrompt(data.prompt ?? "");
      setStep("copy");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleAnalyze = async () => {
    if (!pasted.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    setPreview(null);
    setParsed(null);
    try {
      const res = await fetch("/api/admin/assistant/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pasted }),
      });
      const data = (await res.json()) as {
        preview?: ActionPreview;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setPreview(data.preview ?? null);
      setParsed(data.preview?.parsed ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!parsed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/assistant/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsed }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setSuccess(data.message ?? "Action appliquée.");
      setInput("");
      setPrompt("");
      setPasted("");
      setPreview(null);
      setParsed(null);
      setStep("describe");
      void loadJournal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setParsed(null);
    setPasted("");
    setError(null);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="flex items-center gap-3 font-display text-3xl font-semibold text-primary">
          <Bot className="size-8" aria-hidden />
          Assistant IA
        </h1>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          Complément aux formulaires — confirmation obligatoire avant application.
        </p>
      </header>

      <AdminAssistantStepper currentStep={step} />

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 font-body text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 font-body text-sm text-success">
          {success}
          <span className="mt-1 block text-xs opacity-80">
            Action enregistrée dans le journal (source : assistant IA).
          </span>
        </p>
      )}

      {step === "describe" && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold text-primary">
            Étape 1 — Décrire l&apos;action
          </h2>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={5}
            placeholder={PLACEHOLDER_EXAMPLES[placeholderIndex]}
            className="w-full resize-y rounded-xl border border-border bg-bg px-4 py-3 font-body text-sm text-text outline-none focus:border-primary"
          />
          <Button
            className="cursor-pointer gap-2 bg-accent text-text hover:bg-accent/90"
            disabled={!input.trim() || loading}
            onClick={() => void handleGeneratePrompt()}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            Générer le prompt pour ChatGPT
          </Button>
        </section>
      )}

      {step === "copy" && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold text-primary">
            Étape 2 — Copier vers ChatGPT
          </h2>
          <pre className="max-h-80 overflow-auto rounded-xl bg-bg p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-text">
            {prompt}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="cursor-pointer gap-2"
              onClick={() => void handleCopy()}
            >
              {copied ? (
                <Check className="size-4 text-success" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {copied ? "Copié" : "Copier"}
            </Button>
            <a href={CHATGPT_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="cursor-pointer gap-2">
                <ExternalLink className="size-4" aria-hidden />
                Ouvrir ChatGPT
              </Button>
            </a>
            <Button
              className="cursor-pointer bg-primary text-primary-foreground"
              onClick={() => setStep("validate")}
            >
              J&apos;ai copié la réponse →
            </Button>
          </div>
        </section>
      )}

      {step === "validate" && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold text-primary">
            Étape 3 — Coller la réponse
          </h2>
          <textarea
            value={pasted}
            onChange={(e) =>
              setPasted(e.target.value.slice(0, PASTE_MAX_LENGTH))
            }
            rows={8}
            placeholder='Collez ici le JSON renvoyé par ChatGPT…'
            className="w-full resize-y rounded-xl border border-border bg-bg px-4 py-3 font-mono text-xs text-text outline-none focus:border-primary"
          />
          <p className="font-body text-xs text-muted-foreground">
            {pasted.length} / {PASTE_MAX_LENGTH} caractères
          </p>
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={!pasted.trim() || loading}
            onClick={() => void handleAnalyze()}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              "Analyser"
            )}
          </Button>

          {preview && (
            <div className="mt-4 space-y-4 rounded-xl border border-secondary bg-secondary/10 p-4">
              <p className="font-body text-sm font-medium text-primary">
                Résumé de l&apos;action
              </p>
              <div className="space-y-1 font-body text-sm text-text">
                {preview.humanDetails.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                {preview.humanDetails.length === 0 && (
                  <p>{preview.humanSummary}</p>
                )}
              </div>

              {preview.blockedReason && (
                <p className="font-body text-sm text-muted-foreground">
                  {preview.blockedReason}
                  {preview.formLink && (
                    <>
                      {" "}
                      <Link
                        href={preview.formLink}
                        className="font-medium text-primary underline"
                      >
                        Ouvrir le formulaire classique
                      </Link>
                    </>
                  )}
                </p>
              )}

              {preview.canApply ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    className="cursor-pointer bg-success text-white hover:bg-success/90"
                    disabled={loading}
                    onClick={() => void handleApply()}
                  >
                    Confirmer et appliquer
                  </Button>
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    onClick={handleCancel}
                  >
                    Annuler
                  </Button>
                </div>
              ) : (
                preview.formLink && (
                  <Link href={preview.formLink}>
                    <Button variant="outline" className="mt-2 cursor-pointer">
                      Formulaire classique
                    </Button>
                  </Link>
                )
              )}
            </div>
          )}
        </section>
      )}

      {journal.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold text-primary">
            Journal récent
          </h2>
          <ul className="mt-4 space-y-3">
            {journal.slice(0, 5).map((entry) => (
              <li
                key={entry.id}
                className={cn(
                  "rounded-xl border border-border/60 bg-bg px-4 py-3 font-body text-sm",
                )}
              >
                <p className="text-text">{entry.summary}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.adminName} —{" "}
                  {entry.source === "ai_assistant"
                    ? "via assistant IA"
                    : "manuel"}{" "}
                  —{" "}
                  {new Date(entry.createdAt).toLocaleString("fr-FR")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
