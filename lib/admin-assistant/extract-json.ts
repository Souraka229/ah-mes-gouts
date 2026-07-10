const MAX_PASTE_LENGTH = 5000;

const FORBIDDEN_ACTION_PATTERNS = [
  /delete/i,
  /supprim/i,
  /remove_/i,
];

export function sanitizePastedText(text: string): string {
  return text.trim().slice(0, MAX_PASTE_LENGTH);
}

export function extractJsonObject(text: string): unknown {
  const sanitized = sanitizePastedText(text);
  if (!sanitized) {
    throw new Error("Réponse vide.");
  }

  try {
    return JSON.parse(sanitized);
  } catch {
    const start = sanitized.indexOf("{");
    const end = sanitized.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(sanitized.slice(start, end + 1));
    }
    throw new Error(
      "Impossible de lire le JSON. Collez uniquement la réponse structurée de ChatGPT.",
    );
  }
}

export function assertActionAllowed(action: string): void {
  for (const pattern of FORBIDDEN_ACTION_PATTERNS) {
    if (pattern.test(action)) {
      throw new Error(
        "Les suppressions ne sont pas autorisées via l'assistant. Utilisez le formulaire classique.",
      );
    }
  }
}

export const PASTE_MAX_LENGTH = MAX_PASTE_LENGTH;
