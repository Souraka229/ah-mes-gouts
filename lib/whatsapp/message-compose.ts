/**
 * Règles d’écriture WhatsApp — lisibilité mobile, limites Meta, cohérence marque.
 * Références : messages transactionnels courts, 1 action claire, listes numérotées.
 */

/** Au-delà, on compresse (Meta autorise 4096, mais l’engagement chute). */
export const WHATSAPP_SOFT_MAX_CHARS = 1_450;

export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

export function formatFcfaShort(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} F`;
}

export function normalizeWhatsAppText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Blocs séparés par une ligne vide — plus scannable qu’un paragraphe. */
export function joinBlocks(blocks: Array<string | null | undefined>): string {
  return normalizeWhatsAppText(
    blocks.filter((b) => b != null && String(b).trim()).join("\n\n"),
  );
}

/**
 * Pied de message standard (aide) — une seule ligne pour ne pas répéter partout.
 */
export function helpFooter(): string {
  return "menu · horaires · ma commande · commander · payer · annuler";
}

export function compressForWhatsApp(text: string): string {
  const normalized = normalizeWhatsAppText(text);
  if (normalized.length <= WHATSAPP_SOFT_MAX_CHARS) {
    return normalized;
  }
  const head = normalized.slice(0, WHATSAPP_SOFT_MAX_CHARS - 48).trimEnd();
  return `${head}\n\n… Détails sur giftentremets.com`;
}

export function prepareOutboundBody(text: string): string {
  return compressForWhatsApp(text);
}
