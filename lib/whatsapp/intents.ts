/**

 * Routage sans LLM — 0 token, latence minimale.

 */



export type BotIntent =

  | "greeting"

  | "menu_stock"

  | "hours_location"

  | "order_status"

  | "order_on_site"

  | "contact_human"

  | "delivery_ask"

  | "thanks"

  | "payment"

  | "off_topic"

  | "unknown";



const NORMALIZE = (s: string) =>

  s

    .toLowerCase()

    .normalize("NFD")

    .replace(/\p{M}/gu, "")

    .replace(/[^\p{L}\p{N}\s?]/gu, " ")

    .replace(/\s+/g, " ")

    .trim();



export function detectIntent(text: string): BotIntent {

  const t = NORMALIZE(text);

  if (!t) return "unknown";



  if (/^(bonjour|bonsoir|salut|hello|coucou|bjr|bsr|bonne journee)\b/.test(t)) {

    return "greeting";

  }

  if (/^(merci|ok merci|parfait merci|a plus|a bientot|super merci)\b/.test(t)) {

    return "thanks";

  }



  if (

    /\b(menu|du jour|entremets|glaces?|parfums?|stock|reste|dispo|disponib|epuise|rupture|combien|prix|tarif|fcfa)\b/.test(

      t,

    ) ||

    /\b(nounours|bouquet|gift|boite|boite noire)\b/.test(t)

  ) {

    return "menu_stock";

  }



  if (

    /\b(horaire|heure|ouvert|ouverte|ferme|fermee|adresse|fidjrosse|yatt|localisation|trouver|google maps|plan)\b/.test(

      t,

    )

  ) {

    return "hours_location";

  }



  if (

    /\b(commande|suivi|statut|ou en est|recu ma|numero de commande)\b/.test(t) ||

    /\bge-\d+/i.test(text) ||

    /\blivreur\b/.test(t)

  ) {

    return "order_status";

  }



  if (

    /\b(livraison|livrer|frais de livraison|zone|quartier|destination|emporter|retrait)\b/.test(

      t,

    )

  ) {

    return "delivery_ask";

  }



  if (

    /\b(commander|commande sur|passer commande|je veux|j veux|acheter|payer|paiement|momo|moov|celtiis|carte bancaire|visa|site web|giftentremets)\b/.test(

      t,

    )

  ) {

    return "order_on_site";

  }



  if (

    /\b(humain|conseiller|personne|appeler|telephoner|whatsapp pro|parler a)\b/.test(

      t,

    )

  ) {

    return "contact_human";

  }



  if (t.length > 280 && !/\b(menu|commande|gift|glace)\b/.test(t)) {

    return "off_topic";

  }



  return "unknown";

}



/** Dernier filtre avant Groq/DeepSeek — évite les appels inutiles. */

export function shouldInvokeLlm(text: string, intent: BotIntent): boolean {

  if (intent !== "unknown") return false;

  const t = NORMALIZE(text);

  if (t.length < 6) return false;

  if (/^[\d\s+()-]+$/.test(t)) return false;

  const words = t.split(/\s+/).filter((w) => w.replace(/\?/g, "").length >= 3);

  if (words.length === 0) return false;

  if (/^(ok|oui|non|ah|hein|euh|mmh)\b/.test(t) && words.length <= 2) {

    return false;

  }

  return true;

}


