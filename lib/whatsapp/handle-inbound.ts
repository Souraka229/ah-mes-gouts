import {
  isKapsoMessageAlreadyHandled,
  logWhatsAppTurn,
} from "./bot-log";
import { sendKapsoWhatsAppText } from "./kapso-client";
import { tryWhatsAppOrderFlow } from "./order-flow";
import { tryWhatsAppPaymentFlow } from "./payment-flow";
import { trySiteHabitueQuietLane } from "./site-habitue";
import { processWhatsAppMessage } from "./process-message";
import { checkWhatsAppInboundRateLimit } from "./rate-limit";
import { getWhatsAppBotGate } from "./bot-enabled";
import { clampInboundText } from "./security";
import { checkRateLimit } from "@/lib/rate-limit";

export type InboundJob = {
  fromPhone: string;
  text: string;
  messageId?: string;
  phoneNumberId?: string;
};

export async function handleWhatsAppInbound(job: InboundJob): Promise<void> {
  if (job.messageId && (await isKapsoMessageAlreadyHandled(job.messageId))) {
    return;
  }

  const gate = await getWhatsAppBotGate();
  if (!gate.enabled) {
    const { allowed } = await checkRateLimit(
      `whatsapp:paused-notice:${job.fromPhone.replace(/\D/g, "").slice(-10)}`,
      1,
      30 * 60_000,
    );
    if (allowed && gate.pausedMessage.trim()) {
      await sendKapsoWhatsAppText(
        job.fromPhone,
        gate.pausedMessage,
        job.phoneNumberId,
      );
    }
    logWhatsAppTurn({
      phone: job.fromPhone,
      inboundText: clampInboundText(job.text),
      replyText: gate.pausedMessage,
      intent: "contact_human",
      tier: "assiste",
      kapsoMessageId: job.messageId,
    });
    return;
  }

  if (!(await checkWhatsAppInboundRateLimit(job.fromPhone))) {
    await sendKapsoWhatsAppText(
      job.fromPhone,
      "Trop de messages en peu de temps. Réessayez dans une minute.",
      job.phoneNumberId,
    );
    return;
  }

  const text = clampInboundText(job.text);

  const orderReply = await tryWhatsAppOrderFlow({
    fromPhone: job.fromPhone,
    text,
  });

  const paymentReply = orderReply
    ? null
    : await tryWhatsAppPaymentFlow({
        fromPhone: job.fromPhone,
        text,
        phoneNumberId: job.phoneNumberId,
      });

  const habitueReply =
    orderReply || paymentReply
      ? null
      : await trySiteHabitueQuietLane({
          fromPhone: job.fromPhone,
          text,
        });

  const reply =
    orderReply ??
    paymentReply ??
    habitueReply ??
    (await processWhatsAppMessage({
      fromPhone: job.fromPhone,
      text,
      providerMessageId: job.messageId,
    }));

  if (!reply.suppressSend && reply.text.trim()) {
    await sendKapsoWhatsAppText(job.fromPhone, reply.text, job.phoneNumberId);
  }

  logWhatsAppTurn({
    phone: job.fromPhone,
    inboundText: text,
    replyText: reply.text,
    intent: reply.intent,
    tier: reply.tier,
    usedLlm: reply.usedLlm,
    llmProvider: reply.llmProvider,
    kapsoMessageId: job.messageId,
  });
}
