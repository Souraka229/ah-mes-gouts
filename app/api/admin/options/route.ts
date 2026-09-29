import { NextResponse } from "next/server";
import { z } from "zod";

import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { getAdminDisplayNameAsync } from "@/lib/server/admin-role";
import {
  createMessageCategory,
  createOption,
  createOptionGroup,
  getAllOptionGroups,
  getMessageCategories,
} from "@/lib/server/option-repository";

export const dynamic = "force-dynamic";

/**
 * Catalogue des options & compléments — lecture et création.
 *
 * Une seule route pour les trois familles (groupe, option, carte), distinguées
 * par `kind` : elles se gèrent toujours ensemble, depuis un seul écran, et
 * éclater cela en neuf fichiers n'apporterait rien.
 *
 * Aucune écriture sans `isAdminAuthorizedAsync()` : le rôle anonyme ne doit
 * jamais pouvoir créer ni modifier un prix. La policy RLS interdit de toute
 * façon l'écriture directe depuis le navigateur.
 */

const groupSchema = z.object({
  kind: z.literal("group"),
  slug: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(280).optional(),
  selectionType: z.enum(["single", "multiple"]).optional(),
  minSelections: z.number().int().min(0).max(50).optional(),
  maxSelections: z.number().int().min(0).max(50).optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

const optionSchema = z.object({
  kind: z.literal("option"),
  groupId: z.string().trim().min(1).max(60),
  slug: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(280).optional(),
  /** Le prix est **saisi par l'admin** et écrit en base — jamais calculé ici. */
  price: z.number().int().min(0).max(10_000_000),
  pricingType: z.enum(["fixed", "per_unit"]).optional(),
  unitLabel: z.string().trim().max(30).nullable().optional(),
  subgroupLabel: z.string().trim().max(60).nullable().optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  stockRemaining: z.number().int().min(0).max(100_000).nullable().optional(),
  maxQuantity: z.number().int().min(1).max(99).optional(),
  messageMode: z.enum(["none", "optional", "required"]).optional(),
  messageMinLength: z.number().int().min(0).max(2000).nullable().optional(),
  messageMaxLength: z.number().int().min(1).max(2000).nullable().optional(),
  messagePlaceholder: z.string().trim().max(200).nullable().optional(),
  occasionMode: z.enum(["none", "optional", "required"]).optional(),
  allowCustomOccasion: z.boolean().optional(),
});

const categorySchema = z.object({
  kind: z.literal("category"),
  slug: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(80),
  allowsCustomText: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  /** Renseigné pour une sous-occasion (« Noël » sous « Fête spéciale »). */
  parentId: z.string().trim().min(1).max(60).nullable().optional(),
});

const createSchema = z.discriminatedUnion("kind", [
  groupSchema,
  optionSchema,
  categorySchema,
]);

export async function GET() {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [groups, categories] = await Promise.all([
    getAllOptionGroups(),
    getMessageCategories(false),
  ]);

  return NextResponse.json({ groups, categories });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const input = parsed.data;
    const adminName = await getAdminDisplayNameAsync();

    if (input.kind === "group") {
      const group = await createOptionGroup(input);
      void appendAdminActionLog({
        adminName,
        source: "manual",
        action: "option_group_create",
        summary: `Groupe d'options créé — ${group.name}`,
        details: { groupId: group.id, slug: group.slug },
      });
      return NextResponse.json({ group }, { status: 201 });
    }

    if (input.kind === "option") {
      const option = await createOption(input);
      void appendAdminActionLog({
        adminName,
        source: "manual",
        action: "option_create",
        summary: `Option créée — ${option.name} (${option.price} F)`,
        details: { optionId: option.id, groupId: input.groupId },
      });
      return NextResponse.json({ option }, { status: 201 });
    }

    const category = await createMessageCategory(input);
    void appendAdminActionLog({
      adminName,
      source: "manual",
      action: "message_category_create",
      summary: `Carte créée — ${category.name}`,
      details: { categoryId: category.id, parentId: category.parentId },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Création impossible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
