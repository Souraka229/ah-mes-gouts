import { describe, expect, it } from "vitest";

import {
  buildMessageCategoryTree,
  computeOptionTotal,
  findOptionByKey,
  isGroupRequired,
  resolveGroupBounds,
  resolveProductOptions,
  sumOptionTotals,
  type MessageCategoryRecord,
  type OptionGroupRecord,
  type OptionRecord,
  type ProductOptionGroupRecord,
  type RawOptionSelection,
} from "@/lib/product-options/options";

/**
 * Options & compléments — règles métier.
 *
 * Ces tests couvrent les vingt situations du cahier des charges. Ils portent
 * sur du calcul **pur** : aucune base, aucun réseau. C'est précisément ce qui
 * permet de vérifier la facturation sans monter Supabase.
 */

// ─── Fabriques ──────────────────────────────────────────────────────────────

function option(overrides: Partial<OptionRecord> & { id: string }): OptionRecord {
  return {
    slug: overrides.id,
    name: overrides.id,
    description: "",
    price: 1000,
    pricingType: "fixed",
    unitLabel: null,
    subgroupLabel: null,
    imageUrl: null,
    isActive: true,
    sortOrder: 0,
    stockRemaining: null,
    maxQuantity: 1,
    messageMode: "none",
    messageMinLength: null,
    messageMaxLength: null,
    messagePlaceholder: null,
    occasionMode: "none",
    allowCustomOccasion: false,
    ...overrides,
  };
}

function group(
  overrides: Partial<OptionGroupRecord> & { id: string; options: OptionRecord[] },
): OptionGroupRecord {
  return {
    slug: overrides.id,
    name: overrides.id,
    description: "",
    selectionType: "single",
    minSelections: 0,
    maxSelections: 1,
    isRequired: false,
    isActive: true,
    sortOrder: 0,
    ...overrides,
  };
}

function link(
  g: OptionGroupRecord,
  overrides: Partial<ProductOptionGroupRecord> = {},
): ProductOptionGroupRecord {
  return {
    productId: "p1",
    groupId: g.id,
    minSelections: null,
    maxSelections: null,
    sortOrder: 0,
    group: g,
    ...overrides,
  };
}

function messageCategory(
  overrides: Partial<MessageCategoryRecord> & { id: string; slug: string },
): MessageCategoryRecord {
  return {
    name: overrides.slug,
    allowsCustomText: false,
    isActive: true,
    sortOrder: 0,
    parentId: null,
    ...overrides,
  };
}

const MESSAGE_CATEGORIES: MessageCategoryRecord[] = [
  messageCategory({ id: "c1", slug: "anniversaire", name: "Anniversaire", sortOrder: 0 }),
  messageCategory({ id: "c2", slug: "amour", name: "Amour", sortOrder: 1 }),
  messageCategory({ id: "c3", slug: "felicitations", name: "Félicitations", sortOrder: 2 }),
  messageCategory({
    id: "c4",
    slug: "occasion-speciale",
    name: "Occasion spéciale",
    allowsCustomText: true,
    sortOrder: 3,
  }),
  messageCategory({ id: "c5", slug: "fete-speciale", name: "Fête spéciale", sortOrder: 4 }),
  messageCategory({ id: "c6", slug: "noel", name: "Noël", parentId: "c5", sortOrder: 0 }),
  messageCategory({ id: "c7", slug: "autre", name: "Autre", allowsCustomText: true, sortOrder: 5 }),
];

/** Catalogue de référence — reflète ce que le seed pose en base. */
const CARTE_COURTE = option({
  id: "opt-court",
  slug: "carte-message-court",
  name: "Carte message court",
  price: 1000,
  messageMode: "required",
  messageMaxLength: 150,
  // Même réglage que le seed : carte choisie ⇒ occasion obligatoire.
  occasionMode: "required",
  allowCustomOccasion: true,
});

const CARTE_LONGUE = option({
  id: "opt-long",
  slug: "carte-message-long",
  name: "Carte message long",
  price: 1500,
  messageMode: "required",
  messageMaxLength: 500,
  occasionMode: "required",
  allowCustomOccasion: true,
});

/** Raccourci : un message suppose désormais une carte (donc une occasion). */
function carteLongue(
  extra: Partial<RawOptionSelection> = {},
): RawOptionSelection {
  return {
    optionId: "opt-long",
    message: "Un mot doux",
    occasionCategorySlug: "anniversaire",
    ...extra,
  };
}

const MESSAGES_GROUP = group({
  id: "grp-messages",
  name: "Votre message",
  options: [CARTE_COURTE, CARTE_LONGUE],
});

const CHAMPAGNE_GROUP = group({
  id: "grp-champagne",
  name: "Champagne sans alcool",
  options: [
    option({ id: "opt-champ-enfant", slug: "enfant", name: "Enfant", price: 3000 }),
    option({ id: "opt-champ-adulte", slug: "adulte", name: "Adulte", price: 10000 }),
  ],
});

const TOPPER_GROUP = group({
  id: "grp-topper",
  name: "Topper",
  options: [
    option({
      id: "opt-topper",
      slug: "happy-birthday",
      name: "Happy Birthday",
      price: 50,
      pricingType: "per_unit",
      unitLabel: "unité",
      maxQuantity: 10,
    }),
  ],
});

const ALL_LINKS = [
  link(MESSAGES_GROUP),
  link(CHAMPAGNE_GROUP),
  link(TOPPER_GROUP),
];

function resolve(
  selections: RawOptionSelection[],
  links: ProductOptionGroupRecord[] = ALL_LINKS,
) {
  return resolveProductOptions({
    links,
    selections,
    messageCategories: MESSAGE_CATEGORIES,
  });
}

// ─── 1-3. Produit sans option, carte courte, carte longue ───────────────────

describe("produit sans option", () => {
  it("n'exige rien et ne facture rien", () => {
    const result = resolve([], []);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selections).toEqual([]);
    expect(sumOptionTotals(result.selections)).toBe(0);
  });
});

describe("carte message", () => {
  it("facture la carte courte 1 000 F", () => {
    const result = resolve([
      {
        optionId: "opt-court",
        message: "Joyeux anniversaire ❤️",
        occasionCategorySlug: "anniversaire",
      },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selections[0].totalPrice).toBe(1000);
    expect(result.selections[0].optionNameSnapshot).toBe("Carte message court");
  });

  it("facture la carte longue 1 500 F", () => {
    const result = resolve([
      carteLongue({ message: "Joyeux anniversaire maman, je t'aime…" }),
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selections[0].totalPrice).toBe(1500);
  });

  it("conserve le texte écrit par la cliente dans le snapshot", () => {
    const result = resolve([
      carteLongue({ message: "  Bonne fête maman  " }),
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Le texte est nettoyé de ses espaces, mais jamais tronqué en silence.
    expect(result.selections[0].customMessage).toBe("Bonne fête maman");
  });
});

// ─── 4-6. Message obligatoire, trop long, occasion ──────────────────────────

describe("règles de message", () => {
  it("refuse une carte sans message alors qu'il est obligatoire", () => {
    const result = resolve([{ optionId: "opt-court" }]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]).toContain("Merci d'écrire votre message");
  });

  it("refuse un message plus long que la limite de la carte", () => {
    const result = resolve([
      { optionId: "opt-court", message: "a".repeat(151) },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]).toContain("150 caractères maximum");
  });

  it("accepte un message à la longueur exacte de la limite", () => {
    const result = resolve([
      {
        optionId: "opt-court",
        message: "a".repeat(150),
        occasionCategorySlug: "anniversaire",
      },
    ]);

    expect(result.ok).toBe(true);
  });

  it("ignore un message envoyé sur une option qui n'en porte pas", () => {
    // Le client ne doit pas pouvoir faire stocker du texte là où la fiche n'en
    // prévoit pas : le champ est écarté, pas facturé.
    const result = resolve([{ optionId: "opt-champ-enfant", message: "coucou" }]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selections[0].customMessage).toBeNull();
  });
});

describe("occasion", () => {
  it("enregistre la catégorie d'occasion choisie", () => {
    const result = resolve([
      {
        optionId: "opt-long",
        message: "Joyeux anniversaire",
        occasionCategorySlug: "anniversaire",
      },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selections[0].messageCategorySnapshot).toBe("Anniversaire");
    expect(result.selections[0].customOccasion).toBeNull();
  });

  it("accepte une occasion libre sur « Occasion spéciale »", () => {
    const result = resolve([
      {
        optionId: "opt-long",
        message: "Toutes mes félicitations",
        occasionCategorySlug: "occasion-speciale",
        customOccasion: "Baptême",
      },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selections[0].messageCategorySnapshot).toBe("Occasion spéciale");
    expect(result.selections[0].customOccasion).toBe("Baptême");
  });

  it("refuse une occasion libre sur une catégorie qui ne la prévoit pas", () => {
    const result = resolve([
      {
        optionId: "opt-long",
        message: "Joyeux anniversaire",
        occasionCategorySlug: "anniversaire",
        customOccasion: "Baptême",
      },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]).toContain("Autre");
  });

  it("refuse une catégorie d'occasion inconnue", () => {
    const result = resolve([
      {
        optionId: "opt-long",
        message: "Coucou",
        occasionCategorySlug: "slug-invente",
      },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]).toContain("occasion");
  });
});

// ─── 7-10. Champagne et topper ──────────────────────────────────────────────

describe("champagne sans alcool", () => {
  it("facture le format enfant 3 000 F", () => {
    const result = resolve([{ optionId: "opt-champ-enfant" }]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selections[0].totalPrice).toBe(3000);
  });

  it("facture le format adulte 10 000 F", () => {
    const result = resolve([{ optionId: "opt-champ-adulte" }]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selections[0].totalPrice).toBe(10000);
  });
});

describe("topper à l'unité", () => {
  it("facture 50 F pour une unité", () => {
    const result = resolve([{ optionId: "opt-topper", quantity: 1 }]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selections[0].totalPrice).toBe(50);
  });

  it("facture 250 F pour cinq unités", () => {
    const result = resolve([{ optionId: "opt-topper", quantity: 5 }]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selections[0].quantity).toBe(5);
    expect(result.selections[0].totalPrice).toBe(250);
  });

  it("ne multiplie pas une option au forfait", () => {
    // `fixed` = dû une fois, quelle que soit la quantité. Sans cette règle, une
    // carte à 1 500 F envoyée en quantité 3 serait facturée 4 500 F.
    const result = resolve([carteLongue({ optionId: "opt-court" })]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(computeOptionTotal(CARTE_COURTE, 9)).toBe(1000);
  });
});

// ─── 11-13. Quantité, option inactive, option non rattachée ─────────────────

describe("quantités invalides", () => {
  it("refuse une quantité nulle ou négative", () => {
    for (const quantity of [0, -1]) {
      const result = resolve([{ optionId: "opt-topper", quantity }]);
      expect(result.ok).toBe(false);
    }
  });

  it("refuse une quantité non entière", () => {
    const result = resolve([{ optionId: "opt-topper", quantity: 2.5 }]);

    expect(result.ok).toBe(false);
  });

  it("refuse une quantité au-delà du maximum de l'option", () => {
    const result = resolve([{ optionId: "opt-topper", quantity: 11 }]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]).toContain("10");
  });
});

describe("option inactive", () => {
  it("refuse une option désactivée", () => {
    const inactive = option({
      id: "opt-off",
      name: "Carte retirée",
      isActive: false,
      messageMode: "required",
    });
    const links = [link(group({ id: "g-off", options: [inactive] }))];

    const result = resolve([{ optionId: "opt-off", message: "Coucou" }], links);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]).toContain("n'est plus proposée");
  });
});

describe("option non rattachée au produit", () => {
  it("refuse une option qui existe mais appartient à un autre produit", () => {
    // Le topper existe bien au catalogue — mais ce produit-ci ne le propose
    // pas. Sans ce contrôle, n'importe quelle option serait achetable partout.
    const links = [link(MESSAGES_GROUP)];

    const result = resolve([{ optionId: "opt-topper", quantity: 1 }], links);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]).toContain("indisponible pour ce produit");
  });

  it("refuse un identifiant d'option totalement inventé", () => {
    const result = resolve([{ optionId: "nawak" }]);

    expect(result.ok).toBe(false);
  });
});

// ─── 14-16. Prix serveur, historique, calcul ────────────────────────────────

describe("le prix vient de la base, jamais du client", () => {
  it("facture le prix de la base, pas celui que le panier affichait", () => {
    // La cliente a mis la carte au panier quand elle valait 1 000 F ; le prix
    // passe à 2 000 F en base ; elle valide. C'est le prix **actuel** qui est
    // facturé — le panier d'un navigateur n'est jamais une source de prix.
    const carteAugmentee: OptionRecord = { ...CARTE_COURTE, price: 2000 };
    const links = [link(group({ id: "g", options: [carteAugmentee] }))];

    const result = resolve([carteLongue({ optionId: "opt-court" })], links);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selections[0].unitPrice).toBe(2000);
    expect(result.selections[0].totalPrice).toBe(2000);
  });

  it("n'accepte aucun prix dans la charge utile du client", () => {
    // Un client malveillant ajoute `price`. Le type ne le prévoit pas, et la
    // résolution l'ignore : le total reste celui du catalogue.
    const hostile = {
      optionId: "opt-topper",
      quantity: 3,
      price: 1,
    } as unknown as RawOptionSelection;

    const result = resolve([hostile]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selections[0].totalPrice).toBe(150);
  });
});

describe("historique de commande", () => {
  it("fige libellé et prix dans le snapshot", () => {
    const result = resolve([
      carteLongue({ message: "Bonne fête" }),
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const snapshot = result.selections[0];
    // Tout ce qui est facturé ou affiché est recopié : désactiver l'option, la
    // renommer ou changer son prix ne réécrira jamais cette commande.
    expect(snapshot).toMatchObject({
      optionId: "opt-long",
      groupNameSnapshot: "Votre message",
      optionNameSnapshot: "Carte message long",
      pricingType: "fixed",
      unitPrice: 1500,
      quantity: 1,
      totalPrice: 1500,
    });
  });
});

describe("calcul d'ensemble", () => {
  it("additionne produit et options comme le veut le cahier des charges", () => {
    // Entremets 15 000 + carte longue 1 500 + champagne enfant 3 000 + topper ×3
    const result = resolve([
      carteLongue({ message: "Joyeux anniversaire" }),
      { optionId: "opt-champ-enfant" },
      { optionId: "opt-topper", quantity: 3 },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const optionsTotal = sumOptionTotals(result.selections);
    expect(optionsTotal).toBe(1500 + 3000 + 150);
    expect(15000 + optionsTotal).toBe(19650);
  });

  it("signale toutes les erreurs d'un coup, pas seulement la première", () => {
    const result = resolve([
      { optionId: "opt-court" },
      { optionId: "opt-topper", quantity: 99 },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.length).toBeGreaterThan(1);
  });
});

// ─── Règles de groupe ───────────────────────────────────────────────────────

describe("règles de groupe", () => {
  it("refuse un groupe obligatoire laissé vide", () => {
    const required = group({
      id: "g-requis",
      name: "Taille",
      isRequired: true,
      minSelections: 1,
      options: [option({ id: "opt-s", name: "Petit", price: 5000 })],
    });

    const result = resolve([], [link(required)]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]).toContain("Taille");
  });

  it("accepte le groupe obligatoire une fois servi", () => {
    const required = group({
      id: "g-requis",
      name: "Taille",
      isRequired: true,
      minSelections: 1,
      options: [option({ id: "opt-s", name: "Petit", price: 5000 })],
    });

    const result = resolve([{ optionId: "opt-s" }], [link(required)]);

    expect(result.ok).toBe(true);
  });

  it("un groupe « single » n'accepte jamais deux choix", () => {
    const single = group({
      id: "g-single",
      name: "Boisson",
      selectionType: "single",
      minSelections: 0,
      maxSelections: 5,
      options: [
        option({ id: "opt-a", name: "A", price: 100 }),
        option({ id: "opt-b", name: "B", price: 200 }),
      ],
    });

    const result = resolve(
      [{ optionId: "opt-a" }, { optionId: "opt-b" }],
      [link(single)],
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]).toContain("1 option");
  });

  it("la surcharge du produit l'emporte sur la borne du groupe", () => {
    const multiple = group({
      id: "g-multi",
      name: "Topper",
      selectionType: "multiple",
      minSelections: 0,
      maxSelections: 2,
      options: [
        option({ id: "opt-x", name: "X", price: 50, maxQuantity: 10 }),
        option({ id: "opt-y", name: "Y", price: 60 }),
        option({ id: "opt-z", name: "Z", price: 70 }),
      ],
    });

    // Le produit autorise trois toppers différents là où le groupe en limite 2.
    const result = resolve(
      [{ optionId: "opt-x" }, { optionId: "opt-y" }, { optionId: "opt-z" }],
      [link(multiple, { maxSelections: 3 })],
    );

    expect(result.ok).toBe(true);
  });

  it("refuse la même option envoyée deux fois", () => {
    const result = resolve([
      { optionId: "opt-topper", quantity: 1 },
      { optionId: "opt-topper", quantity: 1 },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]).toContain("plusieurs fois");
  });
});

describe("bornes de groupe", () => {
  it("ramène à 1 le maximum d'un groupe « single »", () => {
    const g = group({ id: "g", selectionType: "single", minSelections: 0, maxSelections: 5, options: [] });

    expect(resolveGroupBounds(link(g)).max).toBe(1);
  });

  it("ne rend jamais un groupe insoluble (minimum > maximum)", () => {
    const g = group({ id: "g", selectionType: "single", minSelections: 3, maxSelections: 1, options: [] });

    const bounds = resolveGroupBounds(link(g));
    expect(bounds.min).toBeLessThanOrEqual(bounds.max);
  });

  it("déduit qu'un groupe est obligatoire de son minimum", () => {
    const g = group({ id: "g", minSelections: 1, options: [] });

    expect(isGroupRequired(link(g))).toBe(true);
  });
});

// ─── Résolution par slug (paniers d'avant les options) ──────────────────────

describe("compatibilité des paniers anciens", () => {
  it("résout une option par son slug, pas seulement par son identifiant", () => {
    // Les paniers ouverts avant le système d'options envoient « chantilly »,
    // pas un cuid. Sans cette résolution, leur checkout échouerait.
    const legacy = group({
      id: "g-supplements",
      name: "Suppléments",
      selectionType: "multiple",
      maxSelections: 6,
      options: [
        option({ id: "cuid-chantilly", slug: "chantilly", name: "Chantilly", price: 300 }),
      ],
    });

    const result = resolve([{ optionId: "chantilly" }], [link(legacy)]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selections[0].totalPrice).toBe(300);
    expect(result.selections[0].optionNameSnapshot).toBe("Chantilly");
  });

  it("préfère l'identifiant au slug quand les deux pourraient matcher", () => {
    const g = group({
      id: "g",
      options: [
        option({ id: "opt-1", slug: "opt-1", name: "Par identifiant", price: 111 }),
        option({ id: "opt-2", slug: "opt-1", name: "Par slug", price: 222 }),
      ],
    });

    expect(findOptionByKey(link(g), "opt-1")?.name).toBe("Par identifiant");
  });
});

// ─── Back-office : le système est piloté par les données ────────────────────

describe("cartes et occasions", () => {
  it("accepte chacune des cartes de la liste", () => {
    for (const slug of ["anniversaire", "amour", "felicitations", "occasion-speciale"]) {
      const result = resolve([
        { optionId: "opt-long", message: "Un mot doux", occasionCategorySlug: slug },
      ]);

      expect(result.ok, `carte ${slug}`).toBe(true);
    }
  });

  it("accepte une sous-occasion de « Fête spéciale »", () => {
    // Noël vit en base sous « Fête spéciale » : aucune valeur de fête n'est
    // écrite dans le code, l'admin peut en ajouter.
    const result = resolve([
      { optionId: "opt-long", message: "Joyeux Noël", occasionCategorySlug: "noel" },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selections[0].messageCategorySnapshot).toBe("Noël");
  });

  it("refuse une carte laissée vide alors qu'elle est obligatoire", () => {
    // La carte se choisit AVANT le message : sans occasion, l'équipe ne sait
    // pas sur quelle carte écrire.
    const result = resolve([{ optionId: "opt-long", message: "Un mot doux" }]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]).toContain("occasion");
  });

  it("range les sous-occasions sous leur parent", () => {
    const tree = buildMessageCategoryTree(MESSAGE_CATEGORIES);
    const feteSpeciale = tree.find((category) => category.slug === "fete-speciale");

    expect(tree.every((category) => category.parentId === null)).toBe(true);
    expect(feteSpeciale?.children.map((child) => child.slug)).toEqual(["noel"]);
  });
});

describe("le catalogue est piloté par les données", () => {
  it("une option inventée après coup est facturée sans toucher au code", () => {
    // Le test des six mois : « Bougie anniversaire, 500 F » doit être vendable
    // dès qu'elle existe en base, sans aucune modification de code.
    const bougie = option({
      id: "opt-bougie",
      slug: "bougie-anniversaire",
      name: "Bougie anniversaire",
      price: 500,
      pricingType: "per_unit",
      unitLabel: "bougie",
      maxQuantity: 5,
    });
    const g = group({ id: "g-deco", name: "Décoration", options: [bougie] });

    const result = resolve([{ optionId: "opt-bougie", quantity: 4 }], [link(g)]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selections[0].totalPrice).toBe(2000);
  });
});
