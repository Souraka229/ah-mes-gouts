import { createHash } from "node:crypto";

import { getPrisma } from "@/lib/prisma";

import { clampInboundText } from "./security";
import { handleWhatsAppInbound } from "./handle-inbound";

export type InboundEnqueueInput = {
  fromPhone: string;
  text: string;
  messageId?: string;
  phoneNumberId?: string;
};

function backoffMs(attempts: number): number {
  const steps = [5_000, 20_000, 60_000, 180_000];
  return steps[Math.min(attempts, steps.length - 1)] ?? 180_000;
}

/** Insert idempotent — retourne l'id à traiter, ou null si déjà traité. */
export async function enqueueWhatsAppInbound(
  input: InboundEnqueueInput,
): Promise<string | null> {
  const text = clampInboundText(input.text);
  try {
    const prisma = getPrisma();
    if (input.messageId?.trim()) {
      const existing = await prisma.whatsAppInboundQueue.findUnique({
        where: { kapsoMessageId: input.messageId.trim() },
        select: { id: true, status: true },
      });
      if (existing) {
        if (existing.status === "done") return null;
        return existing.id;
      }
    }

    const row = await prisma.whatsAppInboundQueue.create({
      data: {
        kapsoMessageId: input.messageId?.trim() || null,
        fromPhone: input.fromPhone,
        text,
        phoneNumberId: input.phoneNumberId ?? null,
        status: "pending",
      },
      select: { id: true },
    });
    return row.id;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code
        : "";
    if (code === "P2002" && input.messageId) {
      const prisma = getPrisma();
      const row = await prisma.whatsAppInboundQueue.findUnique({
        where: { kapsoMessageId: input.messageId.trim() },
        select: { id: true, status: true },
      });
      if (row?.status === "done") return null;
      return row?.id ?? null;
    }
    console.warn("[whatsapp/inbound-queue] enqueue failed, direct process", err);
    await handleWhatsAppInbound({
      fromPhone: input.fromPhone,
      text,
      messageId: input.messageId,
      phoneNumberId: input.phoneNumberId,
    });
    return null;
  }
}

export async function processWhatsAppInboundJob(jobId: string): Promise<void> {
  const prisma = getPrisma();
  const job = await prisma.whatsAppInboundQueue.findUnique({
    where: { id: jobId },
  });
  if (!job || job.status === "done") return;
  if (job.status === "pending" && job.nextAttemptAt > new Date()) return;

  try {
    await handleWhatsAppInbound({
      fromPhone: job.fromPhone,
      text: job.text,
      messageId: job.kapsoMessageId ?? undefined,
      phoneNumberId: job.phoneNumberId ?? undefined,
    });
    await prisma.whatsAppInboundQueue.update({
      where: { id: jobId },
      data: { status: "done", lastError: null },
    });
  } catch (err) {
    const attempts = job.attempts + 1;
    const failed = attempts >= 5;
    await prisma.whatsAppInboundQueue.update({
      where: { id: jobId },
      data: {
        status: failed ? "failed" : "pending",
        attempts,
        lastError: String(err).slice(0, 500),
        nextAttemptAt: new Date(Date.now() + backoffMs(attempts)),
      },
    });
    if (!failed) throw err;
  }
}

export async function processWhatsAppInboundJobIds(jobIds: string[]): Promise<void> {
  for (const id of jobIds) {
    try {
      await processWhatsAppInboundJob(id);
    } catch (err) {
      console.error("[whatsapp/inbound-job]", id, err);
    }
  }
}

export async function drainWhatsAppInboundQueue(limit = 25): Promise<number> {
  const prisma = getPrisma();
  const now = new Date();
  const pending = await prisma.whatsAppInboundQueue.findMany({
    where: {
      status: "pending",
      nextAttemptAt: { lte: now },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });
  for (const row of pending) {
    try {
      await processWhatsAppInboundJob(row.id);
    } catch {
      /* backoff enregistré */
    }
  }
  return pending.length;
}

export function hashOutboundBody(toPhone: string, body: string): string {
  return createHash("sha256")
    .update(`${toPhone}\n${body}`)
    .digest("hex")
    .slice(0, 32);
}
