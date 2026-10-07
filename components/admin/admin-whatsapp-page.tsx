"use client";



import { ExternalLink, MessageCircle, RefreshCw, Sparkles, Zap } from "lucide-react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { useTransition } from "react";



import { WhatsAppBotToggle } from "@/components/admin/whatsapp-bot-toggle";
import type { WhatsAppLogRow } from "@/lib/server/whatsapp-admin";

import type { WhatsAppBotDayStats } from "@/lib/whatsapp/bot-log";

import { cn } from "@/lib/utils";



type Props = {

  logs: WhatsAppLogRow[];

  stats: WhatsAppBotDayStats;

  kapsoInboxUrl: string | null;
  pendingWhatsappPayments: number;
  inboundQueuePending: number;
  outboundQueuePending: number;
  whatsappBotEnabled: boolean;
  whatsappBotPausedMessage: string;
};



function formatTime(d: Date): string {

  return new Intl.DateTimeFormat("fr-FR", {

    hour: "2-digit",

    minute: "2-digit",

  }).format(new Date(d));

}



export function AdminWhatsAppPage({
  logs,
  stats,
  kapsoInboxUrl,
  pendingWhatsappPayments,
  inboundQueuePending,
  outboundQueuePending,
  whatsappBotEnabled,
  whatsappBotPausedMessage,
}: Props) {

  const router = useRouter();

  const [pending, startTransition] = useTransition();



  return (

    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 py-4 md:px-6">

      <header className="flex items-center justify-between gap-3">

        <div className="min-w-0">

          <h1 className="font-display text-xl font-semibold text-foreground">

            WhatsApp

          </h1>

          <p className="font-body text-xs text-muted-foreground">

            Kapso · règles d’abord, LLM si besoin

          </p>

        </div>

        <div className="flex shrink-0 items-center gap-2">

          <button

            type="button"

            disabled={pending}

            onClick={() => startTransition(() => router.refresh())}

            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:bg-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"

            aria-label="Actualiser"

          >

            <RefreshCw

              className={cn("size-4", pending && "animate-spin")}

              aria-hidden

            />

          </button>

          {kapsoInboxUrl ? (

            <Link

              href={kapsoInboxUrl}

              target="_blank"

              rel="noopener noreferrer"

              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 py-2 font-body text-sm font-medium text-primary-foreground transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"

            >

              Inbox

              <ExternalLink className="size-3.5 opacity-80" aria-hidden />

            </Link>

          ) : null}

        </div>

      </header>

      <WhatsAppBotToggle
        initialEnabled={whatsappBotEnabled}
        initialPausedMessage={whatsappBotPausedMessage}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">

        <MiniStat icon={MessageCircle} label="Auj." value={String(stats.total)} />

        <MiniStat icon={Zap} label="Règles" value={`${stats.deterministicRate}%`} />

        <MiniStat icon={Sparkles} label="LLM" value={String(stats.llmCount)} />

      </div>

      {(pendingWhatsappPayments > 0 ||
        inboundQueuePending > 0 ||
        outboundQueuePending > 0) && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 font-body text-xs text-foreground">
          {pendingWhatsappPayments > 0
            ? `${pendingWhatsappPayments} commande(s) WhatsApp en attente de paiement (masquées du KDS). `
            : ""}
          {inboundQueuePending > 0
            ? `${inboundQueuePending} message(s) en file entrante. `
            : ""}
          {outboundQueuePending > 0
            ? `${outboundQueuePending} réponse(s) à renvoyer.`
            : ""}
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-border bg-background">

        {logs.length === 0 ? (

          <p className="px-4 py-6 font-body text-sm text-muted-foreground">

            Aucun échange enregistré.

          </p>

        ) : (

          <ul className="divide-y divide-border">

            {logs.map((row) => (

              <li key={row.id} className="px-3 py-2.5">

                <div className="flex items-center gap-2 font-body text-[11px] text-muted-foreground">

                  <span className="tabular-nums">{formatTime(row.createdAt)}</span>

                  {row.phoneLast4 ? <span>···{row.phoneLast4}</span> : null}

                  <span

                    className={cn(

                      "ml-auto rounded px-1.5 py-0.5 font-medium",

                      row.usedLlm

                        ? "bg-accent/15 text-accent-foreground"

                        : "bg-success/15 text-success",

                    )}

                  >

                    {row.usedLlm ? `LLM ${row.llmProvider ?? ""}`.trim() : "instant"}

                  </span>

                </div>

                <p className="mt-0.5 line-clamp-1 font-body text-xs text-muted-foreground">

                  {row.bodyPreview}

                </p>

                <p className="line-clamp-2 font-body text-sm leading-snug text-foreground">

                  {row.replyPreview ?? "—"}

                </p>

              </li>

            ))}

          </ul>

        )}

      </section>

    </div>

  );

}



function MiniStat({

  icon: Icon,

  label,

  value,

}: {

  icon: typeof MessageCircle;

  label: string;

  value: string;

}) {

  return (

    <div className="flex min-w-[88px] flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">

      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />

      <div className="min-w-0">

        <p className="font-body text-[10px] uppercase tracking-wide text-muted-foreground">

          {label}

        </p>

        <p className="font-display text-lg font-semibold leading-none text-foreground">

          {value}

        </p>

      </div>

    </div>

  );

}


