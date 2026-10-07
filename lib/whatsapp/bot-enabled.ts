import { ORDER_PHONE } from "@/lib/business-info";
import { getBoutiqueSettings } from "@/lib/server/site-settings-repository";
import { SITE_URL } from "@/lib/seo/site";

import { joinBlocks } from "./message-compose";

const DEFAULT_PAUSED = joinBlocks([
  "Bonjour — l’assistant est en pause.",
  `Commande : ${SITE_URL}`,
  `Équipe : ${ORDER_PHONE.display}`,
]);

export type WhatsAppBotGate = {
  enabled: boolean;
  pausedMessage: string;
};

export async function getWhatsAppBotGate(): Promise<WhatsAppBotGate> {
  if (process.env.WHATSAPP_BOT_ENABLED === "false") {
    return {
      enabled: false,
      pausedMessage:
        process.env.WHATSAPP_BOT_PAUSED_MESSAGE?.trim() || DEFAULT_PAUSED,
    };
  }

  try {
    const settings = await getBoutiqueSettings();
    const enabled = settings.whatsappBotEnabled !== false;
    const pausedMessage =
      settings.whatsappBotPausedMessage?.trim() || DEFAULT_PAUSED;
    return { enabled, pausedMessage };
  } catch {
    return { enabled: true, pausedMessage: DEFAULT_PAUSED };
  }
}
