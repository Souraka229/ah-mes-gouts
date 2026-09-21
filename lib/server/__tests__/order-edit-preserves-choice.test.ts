import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Éditer une commande ne doit JAMAIS effacer le choix de la cliente.
 *
 * `updateServerOrderDetails` remplace les articles (`deleteMany` puis `create`).
 * Tant que le formulaire admin ne renvoyait que nom / quantité / prix, corriger
 * une adresse effaçait la taille du nounours, le `slug` catalogue et les
 * suppléments : la commande ne gardait qu'un libellé et un montant.
 *
 * Ces tests tiennent la propriété inverse, dans les deux sens :
 *   — ce que le patch porte est écrit ;
 *   — ce qu'il ne porte pas est repris de la ligne existante.
 */

const ORDER_ITEM_EXISTANT = {
  id: "item-1",
  orderId: "GE-TEST",
  slug: "nounours-teddy",
  name: "Nounours Teddy — 30 cm",
  quantity: 1,
  unitPrice: 25_000,
  supplements: ["Carte"],
  variantId: "variant-30",
  variantLabel: "30 cm",
};

const createdItems: unknown[] = [];

const prismaMock = {
  order: {
    findUnique: vi.fn(async () => ({
      id: "GE-TEST",
      deliveryFee: 1_000,
      items: [ORDER_ITEM_EXISTANT],
    })),
    update: vi.fn(async ({ data }: { data: { items: { create: unknown[] } } }) => {
      createdItems.push(...data.items.create);
      return {};
    }),
  },
  orderItem: { deleteMany: vi.fn(async () => ({ count: 1 })) },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
};

vi.mock("@/lib/prisma", () => ({ getPrisma: () => prismaMock }));

// `getServerOrder` relit la commande après écriture : on court-circuite la
// relecture, elle n'est pas ce qu'on vérifie ici.
vi.mock("@/lib/server/order-mapper", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/order-mapper")>();
  return { ...actual, fromPrismaOrder: () => ({ id: "GE-TEST" }) };
});

const { updateServerOrderDetails } = await import("@/lib/server/order-repository");

const client = {
  firstName: "Awa",
  lastName: "Dossou",
  phone: "+22990000000",
};

describe("édition d'une commande — le choix survit", () => {
  beforeEach(() => {
    createdItems.length = 0;
    vi.clearAllMocks();
  });

  it("reprend la variante et le slug quand le patch ne les porte pas", async () => {
    await updateServerOrderDetails("GE-TEST", {
      client,
      items: [{ name: "Nounours Teddy — 30 cm", quantity: 1, unitPrice: 25_000 }],
    });

    expect(createdItems).toHaveLength(1);
    expect(createdItems[0]).toMatchObject({
      slug: "nounours-teddy",
      variantId: "variant-30",
      variantLabel: "30 cm",
      supplements: ["Carte"],
    });
  });

  it("écrit la variante quand le patch la porte", async () => {
    await updateServerOrderDetails("GE-TEST", {
      client,
      items: [
        {
          name: "Nounours Teddy — 150 cm",
          quantity: 1,
          unitPrice: 100_000,
          variantId: "variant-150",
          variantLabel: "150 cm",
        },
      ],
    });

    expect(createdItems[0]).toMatchObject({
      variantId: "variant-150",
      variantLabel: "150 cm",
    });
  });

  it("accepte un libellé saisi à la main sur une commande prise au téléphone", async () => {
    await updateServerOrderDetails("GE-TEST", {
      client,
      items: [
        {
          name: "Nounours Stitch",
          quantity: 1,
          unitPrice: 40_000,
          variantLabel: "90 cm",
        },
      ],
    });

    expect(createdItems[0]).toMatchObject({ variantLabel: "90 cm" });
  });

  it("n'invente ni variante ni supplément sur une ligne ajoutée à la main", async () => {
    await updateServerOrderDetails("GE-TEST", {
      client,
      items: [
        // La ligne existante est conservée…
        { name: "Nounours Teddy — 30 cm", quantity: 1, unitPrice: 25_000 },
        // … et une ligne neuve n'hérite de rien.
        { name: "Tiramisu Caramel", quantity: 2, unitPrice: 5_000 },
      ],
    });

    expect(createdItems).toHaveLength(2);
    expect(createdItems[1]).toMatchObject({
      slug: null,
      variantId: null,
      variantLabel: null,
      supplements: [],
    });
  });
});
