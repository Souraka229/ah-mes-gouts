import { normalizeBeninPhone, phoneSearchVariants } from "@/lib/crm/phone";

import { getPrisma } from "@/lib/prisma";



import { getWhatsAppCustomerContext } from "./customer-context";

import { detectIntent, shouldInvokeLlm, type BotIntent } from "./intents";

import type { WhatsAppCustomerTier } from "./customer-tier";

import {

  formatMenuSnapshotForWhatsApp,

  getMenuSnapshotForBot,

  menuHintFromSnapshot,

  type MenuSnapshot,

} from "./menu-snapshot";

import {

  contactHumanMessage,

  deliveryAskMessage,

  greetingMessage,

  hoursLocationMessage,

  offTopicGuardMessage,

  orderOnSiteMessage,

  thanksMessage,

  unknownMessage,

} from "./replies";

import { generateWhatsAppLlmReply } from "./llm";



export type InboundWhatsAppMessage = {

  fromPhone: string;

  text: string;

  providerMessageId?: string;

};



export type OutboundWhatsAppReply = {

  text: string;

  deterministic: boolean;

  intent: BotIntent;

  tier: WhatsAppCustomerTier;

  usedLlm?: boolean;

  llmProvider?: string;

  suppressSend?: boolean;

};



/** Chemins sans tier client (0 requête CRM). */

const TIERLESS_INTENTS = new Set<BotIntent>([

  "hours_location",

  "thanks",

  "contact_human",

  "delivery_ask",

]);



export async function processWhatsAppMessage(

  inbound: InboundWhatsAppMessage,

): Promise<OutboundWhatsAppReply> {

  const phone = normalizeBeninPhone(inbound.fromPhone) ?? inbound.fromPhone;

  const text = inbound.text.trim();

  const intent = detectIntent(text);



  if (TIERLESS_INTENTS.has(intent)) {

    return {

      ...replyForTierlessIntent(intent),

      tier: "assiste",

    };

  }



  const needsMenu =

    intent === "menu_stock" ||

    (intent === "unknown" && shouldInvokeLlm(text, intent));



  const [tierInfo, menuSnapshot] = await Promise.all([

    getWhatsAppCustomerContext(phone),

    needsMenu ? getMenuSnapshotForBot() : Promise.resolve(null as MenuSnapshot | null),

  ]);



  const baseMeta = {
    intent,
    tier: tierInfo.tier,
  } as const;



  if (
    tierInfo.tier === "site_habitue" &&
    intent !== "order_status" &&
    intent !== "thanks"
  ) {
    const { siteHabitueGuidanceForIntent } = await import("./replies");
    const guided = siteHabitueGuidanceForIntent(intent, tierInfo.firstName);
    if (guided) {
      return {
        text: guided,
        deterministic: true,
        ...baseMeta,
      };
    }
  }



  switch (intent) {

    case "greeting":

      return {

        text: greetingMessage(tierInfo.tier, tierInfo.firstName),

        deterministic: true,

        ...baseMeta,

      };

    case "thanks":

      return { text: thanksMessage(), deterministic: true, ...baseMeta };

    case "menu_stock": {

      const snapshot = menuSnapshot ?? (await getMenuSnapshotForBot());

      return {

        text: formatMenuSnapshotForWhatsApp(snapshot),

        deterministic: true,

        ...baseMeta,

      };

    }

    case "hours_location":

      return { text: hoursLocationMessage(), deterministic: true, ...baseMeta };

    case "order_on_site":

      return {

        text: orderOnSiteMessage(tierInfo.firstName),

        deterministic: true,

        ...baseMeta,

      };

    case "contact_human":

      return {

        text: contactHumanMessage(),

        deterministic: true,

        ...baseMeta,

      };

    case "delivery_ask":

      return {

        text: deliveryAskMessage(),

        deterministic: true,

        ...baseMeta,

      };

    case "order_status": {

      const statusText = await orderStatusForPhone(phone);

      return { text: statusText, deterministic: true, ...baseMeta };

    };

    case "off_topic":

      return { text: offTopicGuardMessage(), deterministic: true, ...baseMeta };

    default: {

      if (!shouldInvokeLlm(text, intent)) {
        return {
          text: unknownMessage(tierInfo.tier),
          deterministic: true,
          ...baseMeta,
        };
      }

      if (tierInfo.tier === "site_habitue") {
        const { siteHabitueGuidanceForIntent } = await import("./replies");
        return {
          text:
            siteHabitueGuidanceForIntent("unknown", tierInfo.firstName) ??
            unknownMessage(tierInfo.tier),
          deterministic: true,
          ...baseMeta,
        };
      }

      const snapshot = menuSnapshot ?? (await getMenuSnapshotForBot());

      const llm = await generateWhatsAppLlmReply({

        userText: text,

        tier: tierInfo.tier,

        firstName: tierInfo.firstName,

        menuHint: menuHintFromSnapshot(snapshot),

      });

      if (llm) {

        return {

          text: llm.text,

          deterministic: false,

          usedLlm: true,

          llmProvider: llm.provider,

          ...baseMeta,

        };

      }

      return {

        text: unknownMessage(tierInfo.tier),

        deterministic: true,

        ...baseMeta,

      };

    }

  }

}



function replyForTierlessIntent(

  intent: BotIntent,

): Pick<OutboundWhatsAppReply, "text" | "deterministic" | "intent"> {

  switch (intent) {

    case "hours_location":

      return { text: hoursLocationMessage(), deterministic: true, intent };

    case "thanks":

      return { text: thanksMessage(), deterministic: true, intent };

    case "contact_human":

      return { text: contactHumanMessage(), deterministic: true, intent };

    case "delivery_ask":

      return { text: deliveryAskMessage(), deterministic: true, intent };

    default:

      return { text: unknownMessage("assiste"), deterministic: true, intent };

  }

}



async function orderStatusForPhone(phone: string): Promise<string> {

  const prisma = getPrisma();

  const variants = phoneSearchVariants(phone);

  const order = await prisma.order.findFirst({

    where: {

      clientPhone: { in: variants },

      status: { not: "ANNULEE" },

    },

    orderBy: { createdAt: "desc" },

    select: { id: true, status: true, trackingToken: true },

  });



  if (!order) {

    return (

      "Pas de commande récente avec ce numéro. " +

      "Si vous venez de payer sur le site, attendez la confirmation."

    );

  }



  const label = orderStatusLabel(order.status);

  const base = `Commande ${order.id} : ${label}.`;



  if (order.trackingToken) {

    const { SITE_URL } = await import("@/lib/seo/site");

    return `${base}\nSuivi : ${SITE_URL}/suivi/${order.id}?t=${order.trackingToken}`;

  }



  return `${base}\nDétail : +229 01 97 31 07 42.`;

}



function orderStatusLabel(status: string): string {

  const map: Record<string, string> = {

    RECUE: "Reçue",

    PAIEMENT_CONFIRME: "Paiement confirmé",

    PREPARATION: "En préparation",

    PRETE: "Prête",

    EN_LIVRAISON: "En livraison",

    LIVREE: "Livrée",

    ANNULEE: "Annulée",

  };

  return map[status] ?? status;

}


