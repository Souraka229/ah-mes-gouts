/**
 * Options & compléments — règles métier **pures**.
 *
 * Rien ici ne touche la base ni le réseau : on reçoit des enregistrements déjà
 * lus et une demande client, on rend une décision. C'est ce qui rend les règles
 * testables sans Supabase, et c'est le module que `priceOrderItems` applique.
 *
 * Règle non négociable : **le prix ne vient jamais du client**. Le client envoie
 * un identifiant d'option et une quantité ; tout le reste est relu ici.
 *
 * Vocabulaire — à ne pas confondre avec `ProductVariant` :
 *   * variante = déclinaison du produit (taille) ; son prix REMPLACE le prix de base ;
 *   * option   = complément ; son prix S'AJOUTE au prix de base.
 */

export type SelectionType = "single" | "multiple";
export type PricingType = "fixed" | "per_unit";
export type RequirementMode = "none" | "optional" | "required";

/** Garde-fou : une option ne peut jamais être commandée en plus de 99 exemplaires. */
export const MAX_OPTION_QUANTITY = 99;

/** Longueur maximale appliquée si la base ne dit rien. */
export const DEFAULT_MESSAGE_MAX_LENGTH = 500;

export type OptionRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  pricingType: PricingType;
  unitLabel: string | null;
  /** Titre de sous-famille à l'écran (« Champagne avec alcool »). */
  subgroupLabel: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  /** `null` = aucun suivi de stock sur cette option. */
  stockRemaining: number | null;
  maxQuantity: number;
  messageMode: RequirementMode;
  messageMinLength: number | null;
  messageMaxLength: number | null;
  messagePlaceholder: string | null;
  occasionMode: RequirementMode;
  allowCustomOccasion: boolean;
};

export type OptionGroupRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  selectionType: SelectionType;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  options: OptionRecord[];
};

/** Un groupe **tel que rattaché à un produit** — bornes éventuellement surchargées. */
export type ProductOptionGroupRecord = {
  productId: string;
  groupId: string;
  /** `null` = on applique la borne du groupe. */
  minSelections: number | null;
  maxSelections: number | null;
  sortOrder: number;
  group: OptionGroupRecord;
};

export type MessageCategoryRecord = {
  id: string;
  slug: string;
  name: string;
  allowsCustomText: boolean;
  isActive: boolean;
  sortOrder: number;
  /** `null` = catégorie de premier niveau. Sinon, sous-occasion d'un parent. */
  parentId: string | null;
};

/** Catégories de premier niveau, chacune avec ses sous-occasions. */
export type MessageCategoryTree = MessageCategoryRecord & {
  children: MessageCategoryRecord[];
};

export function buildMessageCategoryTree(
  categories: MessageCategoryRecord[],
): MessageCategoryTree[] {
  return categories
    .filter((category) => category.parentId === null)
    .map((category) => ({
      ...category,
      children: categories.filter((child) => child.parentId === category.id),
    }));
}

/** Ce que le client a le droit d'envoyer — jamais un prix, jamais un libellé. */
export type RawOptionSelection = {
  optionId: string;
  quantity?: number;
  message?: string;
  occasionCategorySlug?: string;
  customOccasion?: string;
};

/** Décision rendue pour une option choisie — prête à être figée en base. */
export type ResolvedOptionSelection = {
  optionId: string;
  groupNameSnapshot: string;
  optionNameSnapshot: string;
  pricingType: PricingType;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  customMessage: string | null;
  messageCategorySnapshot: string | null;
  customOccasion: string | null;
};

export type OptionResolution =
  | { ok: true; selections: ResolvedOptionSelection[] }
  | { ok: false; issues: string[] };

/**
 * Bornes réellement applicables à un groupe pour un produit donné.
 *
 * La surcharge du produit l'emporte ; sinon on retombe sur le groupe. Un groupe
 * `single` ne peut jamais accepter plus d'un choix, même si sa borne dit 5 :
 * autoriser deux tailles de la même catégorie serait un bug de saisie, pas une
 * fonctionnalité.
 */
export function resolveGroupBounds(link: ProductOptionGroupRecord): {
  min: number;
  max: number;
} {
  const rawMin = link.minSelections ?? link.group.minSelections;
  const rawMax = link.maxSelections ?? link.group.maxSelections;

  const max =
    link.group.selectionType === "single" ? Math.min(rawMax, 1) : rawMax;

  // Une borne minimale supérieure au maximum rendrait le groupe insoluble :
  // on la ramène au maximum plutôt que de bloquer la vente.
  const min = Math.min(Math.max(rawMin, 0), Math.max(max, 0));

  return { min, max };
}

/** Nombre de choix différents autorisés dans ce groupe. */
export function isGroupRequired(link: ProductOptionGroupRecord): boolean {
  return link.group.isRequired || resolveGroupBounds(link).min > 0;
}

/**
 * Montant dû pour une option choisie.
 *
 *   * `fixed`    → le prix, une fois, quelle que soit la quantité ;
 *   * `per_unit` → le prix **par unité** (topper « Happy Birthday » à 50 F :
 *     3 unités = 150 F).
 */
export function computeOptionTotal(option: OptionRecord, quantity: number): number {
  if (option.pricingType === "per_unit") {
    return option.price * quantity;
  }
  return option.price;
}

/**
 * Ce groupe demande-t-il un texte à la cliente ?
 *
 * Sert à éviter deux champs de message sur la même fiche : quand une option
 * recueille déjà le mot (et le range avec la **ligne de commande**, ce qui est
 * plus précis que le mot global de la commande), l'ancien champ cadeau devient
 * redondant et doit céder la place.
 */
export function groupCarriesMessage(group: OptionGroupRecord): boolean {
  return group.options.some((option) => option.messageMode !== "none");
}

/** Longueur maximale de message applicable à une option. */
export function messageMaxLength(option: OptionRecord): number {
  return option.messageMaxLength ?? DEFAULT_MESSAGE_MAX_LENGTH;
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim();
}

/**
 * Valide une option choisie et rend la ligne à figer.
 *
 * Tout ce qui peut être refusé l'est **ici**, avant toute écriture : option
 * inconnue, inactive, non rattachée à ce produit, quantité hors bornes, stock
 * épuisé, message manquant ou trop long, occasion manquante ou inconnue.
 */
export function findOptionByKey(
  link: ProductOptionGroupRecord,
  key: string,
): OptionRecord | undefined {
  return (
    link.group.options.find((item) => item.id === key) ??
    link.group.options.find((item) => item.slug === key)
  );
}

/** Le groupe d'un produit qui contient cette option, s'il existe. */
export function findLinkByOptionKey(
  links: ProductOptionGroupRecord[],
  key: string,
): ProductOptionGroupRecord | undefined {
  return links.find((link) => findOptionByKey(link, key) !== undefined);
}

export function resolveOptionSelection(input: {
  link: ProductOptionGroupRecord;
  raw: RawOptionSelection;
  messageCategories: MessageCategoryRecord[];
}): { ok: true; data: ResolvedOptionSelection } | { ok: false; issue: string } {
  const { link, raw, messageCategories } = input;
  const option = findOptionByKey(link, raw.optionId);

  // 1. L'option doit exister **et** appartenir à ce produit. Un identifiant
  //    valide mais rattaché à un autre produit est refusé : sinon n'importe
  //    quelle option du catalogue deviendrait achetable partout.
  if (!option) {
    return { ok: false, issue: "Option indisponible pour ce produit." };
  }

  // 2. Une option désactivée disparaît du site et ne peut plus être facturée.
  if (!option.isActive) {
    return { ok: false, issue: `L'option « ${option.name} » n'est plus proposée.` };
  }

  // 3. Quantité : entière, dans les bornes de l'option.
  const quantity = raw.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, issue: `Quantité invalide pour « ${option.name} ».` };
  }
  if (quantity > option.maxQuantity) {
    return {
      ok: false,
      issue: `« ${option.name} » est limité à ${option.maxQuantity} par article.`,
    };
  }
  if (quantity > MAX_OPTION_QUANTITY) {
    return {
      ok: false,
      issue: `« ${option.name} » est limité à ${MAX_OPTION_QUANTITY} par article.`,
    };
  }

  // 4. Stock de l'option, quand elle en porte un.
  if (option.stockRemaining !== null && quantity > option.stockRemaining) {
    return {
      ok: false,
      issue:
        option.stockRemaining <= 0
          ? `« ${option.name} » vient d'être épuisé.`
          : `Stock insuffisant pour « ${option.name} » (${option.stockRemaining} restant${
              option.stockRemaining > 1 ? "s" : ""
            }).`,
    };
  }

  // 5. Message.
  const message = normalizeText(raw.message);
  if (option.messageMode === "required" && !message) {
    return { ok: false, issue: `Merci d'écrire votre message pour « ${option.name} ».` };
  }

  let customMessage: string | null = null;
  if (message && option.messageMode !== "none") {
    const max = messageMaxLength(option);
    if (message.length > max) {
      return {
        ok: false,
        issue: `Votre message est trop long : ${max} caractères maximum.`,
      };
    }
    const min = option.messageMinLength ?? 0;
    if (message.length < min) {
      return {
        ok: false,
        issue: `Votre message est trop court : ${min} caractères minimum.`,
      };
    }
    customMessage = message;
  }

  // 6. Occasion.
  let messageCategorySnapshot: string | null = null;
  let customOccasion: string | null = null;

  if (option.occasionMode !== "none") {
    const slug = normalizeText(raw.occasionCategorySlug);
    const freeText = normalizeText(raw.customOccasion);

    if (!slug) {
      if (option.occasionMode === "required") {
        return { ok: false, issue: `Merci de préciser l'occasion pour « ${option.name} ».` };
      }
    } else {
      const category = messageCategories.find(
        (item) => item.slug === slug && item.isActive,
      );
      if (!category) {
        return { ok: false, issue: "Cette occasion n'est plus proposée." };
      }
      messageCategorySnapshot = category.name;

      if (freeText) {
        // Deux verrous, et il faut les deux : l'option doit ouvrir la saisie
        // libre, **et** la catégorie choisie doit s'y prêter. « Autre » et
        // « Occasion spéciale » l'autorisent ; « Anniversaire » non.
        if (!option.allowCustomOccasion || !category.allowsCustomText) {
          return {
            ok: false,
            issue: `Précisez l'occasion dans « ${category.name} » ou choisissez « Autre ».`,
          };
        }
        customOccasion = freeText.slice(0, 120);
      }
    }
  }

  return {
    ok: true,
    data: {
      optionId: option.id,
      groupNameSnapshot: link.group.name,
      optionNameSnapshot: option.name,
      pricingType: option.pricingType,
      unitPrice: option.price,
      quantity,
      totalPrice: computeOptionTotal(option, quantity),
      customMessage,
      messageCategorySnapshot,
      customOccasion,
    },
  };
}

/**
 * Valide l'ensemble des choix d'un produit et rend les lignes à figer.
 *
 * Contrôle aussi les **règles de groupe** (minimum / maximum de choix), qui ne
 * peuvent se juger qu'une fois tous les choix connus.
 */
export function resolveProductOptions(input: {
  links: ProductOptionGroupRecord[];
  selections: RawOptionSelection[];
  messageCategories: MessageCategoryRecord[];
}): OptionResolution {
  const { links, selections, messageCategories } = input;
  const issues: string[] = [];
  const resolved: ResolvedOptionSelection[] = [];

  // Un identifiant d'option ne peut pas être choisi deux fois : pour en avoir
  // plusieurs, c'est la **quantité** qui monte (topper × 3), pas la ligne.
  const seen = new Set<string>();

  for (const raw of selections) {
    const link = findLinkByOptionKey(links, raw.optionId);

    if (!link) {
      issues.push("Option indisponible pour ce produit.");
      continue;
    }

    // L'unicité se juge sur l'option **résolue**, pas sur la clé reçue : un
    // même choix peut arriver par identifiant d'un côté et par slug de l'autre.
    const option = findOptionByKey(link, raw.optionId);
    if (!option) {
      issues.push("Option indisponible pour ce produit.");
      continue;
    }
    if (seen.has(option.id)) {
      issues.push("Une même option a été envoyée plusieurs fois.");
      continue;
    }
    seen.add(option.id);

    const result = resolveOptionSelection({ link, raw, messageCategories });
    if (!result.ok) {
      issues.push(result.issue);
      continue;
    }
    resolved.push(result.data);
  }

  // Règles de groupe — jugées sur l'ensemble, donc après la boucle.
  for (const link of links) {
    const bounds = resolveGroupBounds(link);
    const chosen = resolved.filter(
      (selection) =>
        link.group.options.some((option) => option.id === selection.optionId),
    ).length;

    if (chosen < bounds.min) {
      issues.push(
        bounds.min === 1
          ? `Choisissez une option dans « ${link.group.name} ».`
          : `Choisissez au moins ${bounds.min} options dans « ${link.group.name} ».`,
      );
      continue;
    }

    if (chosen > bounds.max) {
      issues.push(
        `Vous ne pouvez choisir que ${bounds.max} option${
          bounds.max > 1 ? "s" : ""
        } dans « ${link.group.name} ».`,
      );
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, selections: resolved };
}

/** Somme des options d'une ligne — ajoutée au prix du produit. */
export function sumOptionTotals(selections: ResolvedOptionSelection[]): number {
  return selections.reduce((total, selection) => total + selection.totalPrice, 0);
}

/**
 * Prix affiché d'une option dans le sélecteur.
 *
 * Estimation locale, comme le reste du panier : le serveur refacture. Pour une
 * option à l'unité, on annonce « 50 F / unité » plutôt qu'un total qui
 * changerait à chaque clic.
 */
export function formatOptionPrice(option: OptionRecord): string {
  // Une option à 0 F ne coûte rien : annoncer « +0 F » ferait croire à un
  // supplément. C'est le cas du porteur de message, dont le prix est déjà dans
  // les variantes de la fiche carte.
  if (option.price === 0) return "";

  const price = `${option.price.toLocaleString("fr-FR")} F`;
  return option.pricingType === "per_unit"
    ? `${price} / ${option.unitLabel ?? "unité"}`
    : `+${price}`;
}

/** Options d'un groupe, regroupées par sous-famille, dans l'ordre d'affichage. */
export function groupOptionsBySubgroup(
  group: OptionGroupRecord,
): { label: string | null; options: OptionRecord[] }[] {
  const sections: { label: string | null; options: OptionRecord[] }[] = [];

  for (const option of group.options) {
    const label = option.subgroupLabel ?? null;
    const section = sections.find((entry) => entry.label === label);

    if (section) {
      section.options.push(option);
    } else {
      sections.push({ label, options: [option] });
    }
  }

  return sections;
}
