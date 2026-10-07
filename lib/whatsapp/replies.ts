import {

  BOUTIQUE_HOURS,

  BOUTIQUE_LOCATION,

  ORDER_PHONE,

} from "@/lib/business-info";

import { SITE_URL } from "@/lib/seo/site";

import type { BotIntent } from "./intents";
import { joinBlocks } from "./message-compose";
import {
  catalogUrl,
  checkoutUrl,
  deliveryZonesUrl,
} from "./site-links";

import type { WhatsAppCustomerTier } from "./customer-tier";



export const BOT_INTRO =

  "Gift & ENTREMETS by Ah Mes Goûts — assistant WhatsApp.";



export function siteRedirectMessage(firstName: string | null): string {

  const hi = firstName?.trim() ? `${firstName.trim()}, ` : "";

  return (

    `${hi}le plus simple pour vous : commander sur le site.\n\n` +

    `👉 ${SITE_URL}\n\n` +

    `Menu, créneau, MoMo/carte. Urgent : ${ORDER_PHONE.display}.`

  );

}



export function orderOnSiteMessage(firstName: string | null): string {

  const hi = firstName?.trim() ? `${firstName.trim()}, ` : "";

  return (

    `${hi}pour commander :\n${SITE_URL}\n\n` +

    `Après le panier, vous pouvez aussi écrire « payer » ici (MoMo / carte).`

  );

}



export function contactHumanMessage(): string {

  return (

    `Équipe Ah Mes Goûts : ${ORDER_PHONE.display}\n` +

    `${BOUTIQUE_HOURS.daysLabel} · ${BOUTIQUE_HOURS.label}\n` +

    `Commande en ligne : ${SITE_URL}`

  );

}



export function deliveryAskMessage(): string {
  return (
    `Livraison Cotonou et alentours — tarif selon le quartier.\n\n` +
    `Sur WhatsApp : écrivez « commander », choisissez « livraison » et indiquez votre quartier.\n` +
    `Sur le site : ${checkoutUrl()}\n\n` +
    `Grille : ${deliveryZonesUrl()}\n` +
    `Retrait : ${BOUTIQUE_LOCATION.short ?? BOUTIQUE_LOCATION.full}`
  );
}

export function isExplicitWhatsAppOrderTrigger(text: string): boolean {
  const t = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  return /\b(commander|commande|panier|ajouter|ajoute)\b/.test(t);
}

export function isWhatsAppPaymentOrStatusTrigger(text: string): boolean {
  const t = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  return (
    /\b(payer|paiement|regler|règler|momo|feexpay|recu|reçu)\b/.test(t) ||
    /\bGE-\d/i.test(text) ||
    /\b(suivi|ma commande|statut)\b/.test(t)
  );
}

/** Messages directs pour clientes site — zéro LLM. */
export function siteHabitueGuidanceForIntent(
  intent: BotIntent,
  firstName: string | null,
): string | null {
  const hi = firstName?.trim() ? `${firstName.trim()}, ` : "";
  const cat = catalogUrl();
  const co = checkoutUrl();

  switch (intent) {
    case "greeting":
      return joinBlocks([
        `${hi}content de vous revoir.`,
        `Catalogue : ${cat}`,
        `Commande site : ${co}`,
        `Déjà commandé ? « payer » ou « ma commande ».`,
      ]);
    case "menu_stock":
      return (
        `${hi}votre espace est sur le site — catalogue à jour :\n${cat}\n\n` +
        `Nounours, options et cadeaux : ouvrez la fiche produit depuis le catalogue.\n` +
        `Menu du jour simplifié ici : écrivez « commander ».`
      );
    case "order_on_site":
      return (
        `${hi}pour une commande complète (options, upsell, carte) :\n${co}\n\n` +
        `Après validation sur le site, vous pouvez régler par WhatsApp : « payer ».\n` +
        `Menu express WhatsApp : « commander ».`
      );
    case "delivery_ask":
      return (
        `${hi}livraison : même tarifs que le site.\n` +
        `• Site : ${co}\n` +
        `• WhatsApp : « commander » → livraison → votre quartier\n\n` +
        `Quartiers : ${deliveryZonesUrl()}`
      );
    case "contact_human":
      return contactHumanMessage();
    case "hours_location":
      return hoursLocationMessage();
    case "thanks":
      return thanksMessage();
    case "off_topic":
    case "unknown":
      return (
        `${hi}je vous guide sans détour :\n` +
        `• Catalogue : ${cat}\n` +
        `• Commander en ligne : ${co}\n` +
        `• Payer / MoMo ici : « payer »\n` +
        `• Suivi : « ma commande »\n\n` +
        `Urgent : ${ORDER_PHONE.display}`
      );
    default:
      return null;
  }
}



export function greetingMessage(

  tier: WhatsAppCustomerTier,

  firstName: string | null,

): string {

  const name = firstName?.trim() ? ` ${firstName.trim()}` : "";

  if (tier === "site_habitue") {

    return `${BOT_INTRO}\n\nContent de vous revoir${name}.\n${SITE_URL}`;

  }

  return (

    `${BOT_INTRO}\n\n` +

    `Écrivez « menu », « horaires » ou « ma commande ».\n` +

    `Commander : ${SITE_URL}`

  );

}



export function hoursLocationMessage(): string {

  return [

    `${BOUTIQUE_HOURS.daysLabel} · ${BOUTIQUE_HOURS.label}`,

    BOUTIQUE_LOCATION.full,

    ORDER_PHONE.display,

    SITE_URL,

  ].join("\n");

}



export function thanksMessage(): string {

  return `Avec plaisir. ${SITE_URL}`;

}



export function offTopicGuardMessage(): string {

  return (

    `Je gère le menu, horaires et commandes Gift & ENTREMETS.\n` +

    `${SITE_URL} · ${ORDER_PHONE.display}`

  );

}



export function unknownMessage(tier: WhatsAppCustomerTier): string {

  if (tier === "site_habitue") {

    return siteRedirectMessage(null);

  }

  return (

    `Essayez « menu », « horaires » ou « ma commande ».\n${SITE_URL}`

  );

}


