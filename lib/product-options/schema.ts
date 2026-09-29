import { z } from "zod";

/**
 * Forme de la charge utile « options » envoyée par le navigateur.
 *
 * Partagée par le devis panier et la création de commande : les deux doivent
 * accepter exactement la même chose, sinon un panier validé au checkout
 * échouerait à la commande.
 *
 * Aucun champ de prix n'y figure — et il ne doit jamais en apparaître. Le
 * serveur relit le prix en base ; un montant envoyé par le client serait ignoré
 * de toute façon, mais mieux vaut qu'il ne puisse même pas être exprimé.
 */
export const optionSelectionSchema = z.object({
  /** Identifiant de l'option en base — ou son slug pour les paniers anciens. */
  optionId: z.string().trim().min(1).max(80),
  quantity: z.number().int().min(1).max(99).optional(),
  message: z.string().trim().max(1000).optional(),
  occasionCategorySlug: z.string().trim().max(80).optional(),
  customOccasion: z.string().trim().max(120).optional(),
});

export const optionSelectionsSchema = z
  .array(optionSelectionSchema)
  .max(30)
  .default([]);

export type OptionSelectionPayload = z.infer<typeof optionSelectionSchema>;
