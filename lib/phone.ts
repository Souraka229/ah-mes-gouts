/**
 * Numéros de téléphone — SOURCE DE VÉRITÉ UNIQUE.
 *
 * Avant ce module, deux fonctions `normalizeBeninPhone` coexistaient
 * (`lib/crm/phone.ts` et `lib/payments/normalize-phone.ts`) avec des règles
 * différentes, et les numéros étaient stockés dans au moins quatre formats
 * selon la table : `0169949223`, `69949223`, `+229 - 01 - 66 - 65 - 90 - 09`,
 * `2290166659009`. Un même client pouvait donc exister plusieurs fois.
 *
 * Règles retenues :
 *  - **Stockage canonique** : `+2290155530826` (E.164).
 *  - **Affichage** : `+229 01 55 53 08 26`.
 *  - **WhatsApp** : `2290155530826` — ni `+`, ni espaces, ni `00`.
 *
 * Le Bénin est passé au plan à 10 chiffres (préfixe `01`) : l'ancien numéro à
 * 8 chiffres reçoit ce préfixe. `55530826` et `+22955530826` désignent donc le
 * même abonné que `+2290155530826`.
 *
 * Ce module ne déduit JAMAIS l'opérateur (MTN / Moov / Celtiis) du préfixe :
 * depuis l'interconnexion de janvier 2025, un même numéro peut être rattaché
 * aux trois. L'opérateur vient de la transaction, pas du numéro.
 */

export const DEFAULT_COUNTRY = "BJ" as const;
export type SupportedCountry = typeof DEFAULT_COUNTRY;

/** Indicatif du Bénin, sans `+`. */
export const BENIN_DIAL_CODE = "229";
/** Longueur du numéro national béninois moderne (préfixe `01` inclus). */
export const BENIN_NATIONAL_LENGTH = 10;
/** Longueur de l'ancien numéro national béninois. */
export const BENIN_LEGACY_LENGTH = 8;
/** Préfixe imposé par l'ARCEP depuis le 30 novembre 2024. */
export const BENIN_NATIONAL_PREFIX = "01";

/**
 * D'où vient le numéro — utile pour l'audit de migration et le diagnostic.
 *  - `modern_local`    : `0155530826`
 *  - `legacy_local`    : `55530826`
 *  - `international`   : `+229…` ou `00229…`
 *  - `national_with_cc`: `229…` sans `+` (ce que stockait le CRM)
 */
export type PhoneSourceFormat =
  | "modern_local"
  | "legacy_local"
  | "international"
  | "national_with_cc";

export type NormalizedPhone = {
  valid: true;
  country: SupportedCountry;
  /** Indicatif avec `+`, ex. `+229`. */
  countryCode: string;
  /** Numéro national, préfixe `01` inclus, ex. `0155530826`. */
  nationalNumber: string;
  /** Forme canonique stockée en base, ex. `+2290155530826`. */
  e164: string;
  /** Forme lisible, ex. `+229 01 55 53 08 26`. */
  display: string;
  /** Vrai si la saisie utilisait l'ancien format à 8 chiffres. */
  legacyInput: boolean;
  sourceFormat: PhoneSourceFormat;
};

export type PhoneErrorCode =
  | "INVALID_PHONE"
  | "UNSUPPORTED_COUNTRY"
  | "AMBIGUOUS_COUNTRY";

export type PhoneError = {
  valid: false;
  code: PhoneErrorCode;
  message: string;
};

export type PhoneResult = NormalizedPhone | PhoneError;

const MESSAGES: Record<PhoneErrorCode, string> = {
  INVALID_PHONE: "Le numéro de téléphone est invalide.",
  UNSUPPORTED_COUNTRY:
    "Ce numéro n'est pas un numéro béninois. Vérifiez l'indicatif.",
  AMBIGUOUS_COUNTRY:
    "Impossible de déterminer le pays du numéro. Précisez l'indicatif.",
};

function fail(code: PhoneErrorCode): PhoneError {
  return { valid: false, code, message: MESSAGES[code] };
}

/**
 * Caractères de séparation tolérés à la saisie.
 *
 * Volontairement limité : on ne retire QUE des séparateurs visuels. Une lettre
 * rend la saisie ambiguë et doit être refusée, pas silencieusement nettoyée —
 * sans quoi `+229 (55) 53-08-26` et `+229abc` seraient traités pareil.
 */
const SEPARATORS = /[\s.\-()  ]/g;
/** Ce qui reste une fois les séparateurs retirés. */
const ALLOWED_SHAPE = /^\+?\d+$/;

export type NormalizePhoneOptions = {
  /**
   * Pays du champ.
   *
   * Nos champs sont des numéros béninois : c'est un fait du domaine, pas une
   * supposition. Un appelant qui traiterait un autre pays doit le dire
   * explicitement — la fonction refusera alors de deviner.
   */
  country?: string;
};

/**
 * Normalise un numéro béninois vers sa forme canonique.
 *
 * Ne rejette jamais : retourne un résultat discriminé (`valid: true/false`).
 */
export function normalizePhone(
  raw: unknown,
  options: NormalizePhoneOptions = {},
): PhoneResult {
  const country = (options.country ?? DEFAULT_COUNTRY).toUpperCase();

  if (country !== DEFAULT_COUNTRY) {
    // On ne devine pas : hors Bénin, on refuse plutôt que de mal convertir.
    return fail("UNSUPPORTED_COUNTRY");
  }

  if (typeof raw !== "string") return fail("INVALID_PHONE");

  const trimmed = raw.trim();
  if (!trimmed) return fail("INVALID_PHONE");

  const compact = trimmed.replace(SEPARATORS, "");
  if (!ALLOWED_SHAPE.test(compact)) return fail("INVALID_PHONE");

  // `00` en tête = indicatif international (norme de composition).
  let digits: string;
  let hadPlus = false;
  let hadDoubleZero = false;

  if (compact.startsWith("+")) {
    hadPlus = true;
    digits = compact.slice(1);
  } else if (compact.startsWith("00")) {
    hadDoubleZero = true;
    digits = compact.slice(2);
  } else {
    digits = compact;
  }

  if (!digits) return fail("INVALID_PHONE");

  // Un préfixe international explicite qui n'est pas le Bénin.
  if ((hadPlus || hadDoubleZero) && !digits.startsWith(BENIN_DIAL_CODE)) {
    return fail("UNSUPPORTED_COUNTRY");
  }

  // Sans préfixe international, un `+` ailleurs qu'au début a déjà été rejeté
  // par ALLOWED_SHAPE. Reste à décider si l'indicatif 229 est présent.
  let national: string;
  let sourceFormat: PhoneSourceFormat;

  if (digits.startsWith(BENIN_DIAL_CODE)) {
    national = digits.slice(BENIN_DIAL_CODE.length);
    sourceFormat = hadPlus || hadDoubleZero ? "international" : "national_with_cc";
  } else {
    national = digits;
    sourceFormat = hadPlus || hadDoubleZero ? "international" : "modern_local";
  }

  if (!national) return fail("INVALID_PHONE");

  /**
   * L'ancien plan à 8 chiffres reçoit le préfixe `01`.
   *
   * `legacyInput` décrit l'ÉPOQUE du numéro, pas la façon dont l'indicatif a
   * été écrit : `55530826` et `+22955530826` sont tous deux d'anciens numéros.
   */
  let legacyInput = false;

  if (national.length === BENIN_LEGACY_LENGTH) {
    legacyInput = true;
    national = `${BENIN_NATIONAL_PREFIX}${national}`;
    if (!hadPlus && !hadDoubleZero) sourceFormat = "legacy_local";
  } else if (
    national.length === BENIN_NATIONAL_LENGTH &&
    national.startsWith(BENIN_NATIONAL_PREFIX)
  ) {
    sourceFormat =
      !hadPlus && !hadDoubleZero && digits.startsWith(BENIN_DIAL_CODE)
        ? "national_with_cc"
        : "modern_local";
    if (hadPlus || hadDoubleZero) sourceFormat = "international";
  } else {
    return fail("INVALID_PHONE");
  }

  const e164 = `+${BENIN_DIAL_CODE}${national}`;

  return {
    valid: true,
    country: DEFAULT_COUNTRY,
    countryCode: `+${BENIN_DIAL_CODE}`,
    nationalNumber: national,
    e164,
    display: formatPhoneDisplay(e164),
    legacyInput,
    sourceFormat,
  };
}

/**
 * Forme lisible d'un numéro canonique : `+229 01 55 53 08 26`.
 *
 * Séparée du stockage à dessein : la base garde une forme unique et stable,
 * l'écran affiche une forme lisible. Mélanger les deux est ce qui avait produit
 * quatre formats différents en base.
 */
export function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, "");

  const national = digits.startsWith(BENIN_DIAL_CODE)
    ? digits.slice(BENIN_DIAL_CODE.length)
    : digits;

  if (!national) return value;
  // Regroupement par paires, comme on lit un numéro à Cotonou.
  const parts = national.match(/.{1,2}/g) ?? [national];
  return `+${BENIN_DIAL_CODE} ${parts.join(" ")}`;
}

/**
 * Numéro au format attendu par WhatsApp : international, sans `+` ni espaces.
 *
 * WhatsApp documente `https://wa.me/<numéro international complet>` sans aucun
 * caractère supplémentaire : `wa.me/+229…` et `wa.me/00229…` ne fonctionnent
 * pas.
 */
export function getWhatsAppNumber(value: string): string | null {
  const result = normalizePhone(value);
  if (!result.valid) return null;
  // `e164` commence par `+` : WhatsApp ne le veut pas.
  return result.e164.slice(1);
}

/** Lien WhatsApp prêt à ouvrir, avec message pré-rempli optionnel. */
export function getWhatsAppUrl(value: string, text?: string): string | null {
  const number = getWhatsAppNumber(value);
  if (!number) return null;
  const base = `https://wa.me/${number}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Deux saisies désignent-elles le même abonné ? */
export function phonesMatch(a: unknown, b: unknown): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  return na.valid && nb.valid && na.e164 === nb.e164;
}

/**
 * Forme canonique, ou `null` si le numéro est invalide.
 *
 * Raccourci pour les chemins d'écriture en base, qui n'ont besoin que de la
 * valeur stockée.
 */
export function canonicalPhone(raw: unknown): string | null {
  const result = normalizePhone(raw);
  return result.valid ? result.e164 : null;
}

/**
 * Toutes les écritures sous lesquelles un même abonné a pu être stocké.
 *
 * La base a contenu `2290166659009` (CRM) et `+2290166659009` (livreurs). Le
 * temps que la migration passe, une recherche doit retrouver les deux, sinon
 * une cliente disparaît du back-office selon la table qui l'a enregistrée.
 *
 * À utiliser dans les `where` : `{ phone: { in: phoneLookupVariants(saisie) } }`.
 */
export function phoneLookupVariants(raw: unknown): string[] {
  const result = normalizePhone(raw);
  if (!result.valid) return [];
  // Forme E.164, et même numéro sans le « + » (forme historique).
  return [...new Set([result.e164, result.e164.slice(1)])];
}
