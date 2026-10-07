import { ORDER_PHONE } from "@/lib/business-info";
import { SITE_URL } from "@/lib/seo/site";

import type { WhatsAppCustomerTier } from "./customer-tier";

export type LlmProvider = "groq" | "deepseek";

export type LlmReplyResult = {
  text: string;
  provider: LlmProvider;
};

const SYSTEM =
  `Assistant WhatsApp Gift & ENTREMETS (Cotonou). FR, 3-5 lignes max, ton premium.` +
  ` Aide menu/horaires/commande. Site: ${SITE_URL} Tel: ${ORDER_PHONE.display}.` +
  ` Pas de prix inventés. JSON strict: {"reply":"..."}`;

type ChatMessage = { role: "system" | "user"; content: string };

async function callOpenAiCompatibleChat(params: {
  url: string;
  apiKey: string;
  model: string;
  provider: LlmProvider;
  messages: ChatMessage[];
  timeoutMs: number;
}): Promise<LlmReplyResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs);
  try {
    const res = await fetch(params.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: 0.2,
        max_tokens: 140,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`${params.provider} ${res.status}: ${errBody.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    return { text: parseReplyJson(raw), provider: params.provider };
  } finally {
    clearTimeout(timer);
  }
}

function parseReplyJson(raw: string): string {
  try {
    const obj = JSON.parse(raw) as { reply?: string };
    const reply = obj.reply?.trim();
    if (reply) return reply.slice(0, 900);
  } catch {
    /* fallback */
  }
  return raw.slice(0, 900);
}

function isRetryableLlmError(err: unknown): boolean {
  if (!(err instanceof Error)) return true;
  const m = err.message.toLowerCase();
  return (
    m.includes("abort") ||
    m.includes("429") ||
    m.includes("500") ||
    m.includes("502") ||
    m.includes("503") ||
    m.includes("504") ||
    m.includes("rate") ||
    m.includes("overloaded")
  );
}

export async function generateWhatsAppLlmReply(input: {
  userText: string;
  tier: WhatsAppCustomerTier;
  firstName: string | null;
  menuHint?: string;
}): Promise<LlmReplyResult | null> {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!groqKey && !deepseekKey) return null;

  const userContent = [
    input.tier === "site_habitue" ? "Cliente site." : "Cliente assistée.",
    input.firstName ? `Prénom: ${input.firstName}.` : "",
    input.menuHint ? `Au menu: ${input.menuHint}.` : "",
    input.userText.slice(0, 400),
  ]
    .filter(Boolean)
    .join(" ");

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: userContent },
  ];

  const groqModel =
    process.env.GROQ_WHATSAPP_MODEL?.trim() || "llama-3.1-8b-instant";
  const deepseekModel =
    process.env.DEEPSEEK_WHATSAPP_MODEL?.trim() || "deepseek-chat";

  if (groqKey) {
    try {
      return await callOpenAiCompatibleChat({
        url: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: groqKey,
        model: groqModel,
        provider: "groq",
        messages,
        timeoutMs: 5_500,
      });
    } catch (err) {
      if (!deepseekKey || !isRetryableLlmError(err)) {
        console.error("[whatsapp/llm/groq]", err);
        if (!deepseekKey) return null;
      } else {
        console.warn("[whatsapp/llm/groq-fallback]", err);
      }
    }
  }

  if (!deepseekKey) return null;

  try {
    return await callOpenAiCompatibleChat({
      url: "https://api.deepseek.com/v1/chat/completions",
      apiKey: deepseekKey,
      model: deepseekModel,
      provider: "deepseek",
      messages,
      timeoutMs: 9_000,
    });
  } catch (err) {
    console.error("[whatsapp/llm/deepseek]", err);
    return null;
  }
}
