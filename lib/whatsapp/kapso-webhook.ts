import { createHmac, timingSafeEqual } from "node:crypto";

import { inboundPhonesConsistent } from "./security";

export type KapsoMessageReceivedPayload = {
  message?: {
    id?: string;
    from?: string;
    type?: string;
    text?: { body?: string };
    kapso?: {
      direction?: string;
      content?: string;
      transcript?: string;
      passive?: boolean;
      origin?: string;
    };
  };
  conversation?: {
    phone_number?: string;
    contact_name?: string;
  };
  phone_number_id?: string;
};

export type KapsoBatchEnvelope = {
  batch?: boolean;
  data?: KapsoMessageReceivedPayload[];
};

export function verifyKapsoWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret =
    process.env.KAPSO_WEBHOOK_SECRET?.trim() ??
    process.env.WEBHOOK_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  if (!signatureHeader || typeof signatureHeader !== "string") return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function expandKapsoReceivedPayloads(
  body: unknown,
): KapsoMessageReceivedPayload[] {
  if (!body || typeof body !== "object") return [];
  const record = body as KapsoBatchEnvelope & KapsoMessageReceivedPayload;
  if (record.batch === true && Array.isArray(record.data)) {
    return record.data;
  }
  if (record.message) return [record];
  return [];
}

export function extractInboundFromKapso(
  payload: KapsoMessageReceivedPayload,
): { fromPhone: string; text: string; messageId?: string } | null {
  const msg = payload.message;
  if (!msg) return null;
  if (msg.kapso?.passive === true) return null;
  if (msg.kapso?.direction === "outbound") return null;
  if (msg.kapso?.origin === "business_app") return null;

  const conversationPhone = payload.conversation?.phone_number?.trim();
  const messageFrom = msg.from?.trim();

  if (!inboundPhonesConsistent(conversationPhone, messageFrom)) {
    console.warn("[whatsapp/security] phone mismatch in webhook payload");
    return null;
  }

  const fromPhone = conversationPhone || messageFrom || "";
  if (!fromPhone) return null;

  const type = msg.type ?? "text";
  let text = "";
  if (type === "text") {
    text = (msg.text?.body ?? msg.kapso?.content ?? "").trim();
  } else if (type === "audio" || type === "voice") {
    text = (msg.kapso?.transcript ?? msg.kapso?.content ?? "").trim();
  } else {
    return null;
  }

  if (!text) return null;

  return {
    fromPhone,
    text,
    messageId: msg.id,
  };
}
