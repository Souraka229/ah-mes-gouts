import { NextResponse } from "next/server";
import { z } from "zod";

import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { getAdminDisplayNameAsync } from "@/lib/server/admin-role";
import {
  deactivateOption,
  deactivateOptionGroup,
  deleteMessageCategoryIfUnused,
  deleteOptionGroupIfUnused,
  deleteOptionIfUnused,
  updateMessageCategory,
  updateOption,
  updateOptionGroup,
} from "@/lib/server/option-repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Modification et suppression d'un groupe, d'une option ou d'une carte.
 *
 * `kind` distingue les trois familles. Le prix est écrit tel que l'admin le
 * saisit : c'est la seule voie légitime pour le changer, et elle est réservée à
 * un administrateur authentifié.
 */

const patchSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("group"),
    name: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().max(280).optional(),
    selectionType: z.enum(["single", "multiple"]).optional(),
    minSelections: z.number().int().min(0).max(50).optional(),
    maxSelections: z.number().int().min(0).max(50).optional(),
    isRequired: z.boolean().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(999).optional(),
  }),
  z.object({
    kind: z.literal("option"),
    name: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().max(280).optional(),
    price: z.number().int().min(0).max(10_000_000).optional(),
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
  }),
  z.object({
    kind: z.literal("category"),
    name: z.string().trim().min(1).max(80).optional(),
    allowsCustomText: z.boolean().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(999).optional(),
    parentId: z.string().trim().min(1).max(60).nullable().optional(),
  }),
]);

const deleteSchema = z.object({
  kind: z.enum(["group", "option", "category"]),
  /**
   * `deactivate` (défaut) retire l'élément du site sans rien effacer.
   * `delete` n'est accepté que si aucune commande n'y fait référence.
   */
  mode: z.enum(["deactivate", "delete"]).default("deactivate"),
});

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { kind, ...patch } = parsed.data;
    const adminName = await getAdminDisplayNameAsync();

    if (kind === "group") {
      await updateOptionGroup(id, patch);
    } else if (kind === "option") {
      await updateOption(id, patch);
    } else {
      await updateMessageCategory(id, patch);
    }

    void appendAdminActionLog({
      adminName,
      source: "manual",
      action: `option_${kind}_update`,
      summary: `Options — ${kind} modifié (${Object.keys(patch).join(", ") || "aucun champ"})`,
      details: { id, kind, patch },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Modification impossible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const parsed = deleteSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { kind, mode } = parsed.data;
    const adminName = await getAdminDisplayNameAsync();

    // Désactivation : le geste par défaut, et le seul qui ne peut rien casser.
    if (mode === "deactivate") {
      if (kind === "group") await deactivateOptionGroup(id);
      else if (kind === "option") await deactivateOption(id);
      else await updateMessageCategory(id, { isActive: false });

      void appendAdminActionLog({
        adminName,
        source: "manual",
        action: `option_${kind}_deactivate`,
        summary: `Options — ${kind} désactivé`,
        details: { id, kind },
      });

      return NextResponse.json({ ok: true, mode: "deactivate" });
    }

    const result =
      kind === "group"
        ? await deleteOptionGroupIfUnused(id)
        : kind === "option"
          ? await deleteOptionIfUnused(id)
          : await deleteMessageCategoryIfUnused(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 409 });
    }

    void appendAdminActionLog({
      adminName,
      source: "manual",
      action: `option_${kind}_delete`,
      summary: `Options — ${kind} supprimé définitivement`,
      details: { id, kind },
    });

    return NextResponse.json({ ok: true, mode: "delete" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Suppression impossible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
