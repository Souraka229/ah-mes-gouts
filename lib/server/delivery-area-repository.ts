import { getAreaPrice } from "@/lib/delivery-zones";
import { getPrisma } from "@/lib/prisma";

/**
 * Tarif de livraison d'un lieu.
 *
 * **Le prix est porté par le lieu**, pas par la zone : la grille réelle mélange
 * les tarifs au sein d'un même palier, et « Hors Cotonou » va de 2 000 à
 * 4 000 F. Facturer `DeliveryZone.cost` revenait donc à facturer le mauvais
 * montant dès qu'un quartier changeait de prix.
 *
 * Ordre de résolution — du plus autoritaire au plus dégradé :
 *   1. la base (`DeliveryArea`), que l'admin modifie sans redéploiement ;
 *   2. la grille du code (`lib/delivery-zones.ts`), qui amorce la base ;
 *   3. rien — l'appelant refuse alors la commande plutôt que d'inventer.
 *
 * Le repli sur le code couvre deux cas réels : une base pas encore semée, et
 * une base injoignable. Dans les deux cas on préfère la grille officielle à un
 * refus de vente.
 */
export async function resolveDeliveryAreaPrice(
  zoneId: string,
  locality: string | null | undefined,
): Promise<number | undefined> {
  const name = locality?.trim();
  if (!name) return undefined;

  try {
    const area = await getPrisma().deliveryArea.findFirst({
      where: {
        zoneId,
        name: { equals: name, mode: "insensitive" },
        isActive: true,
      },
      select: { price: true },
    });
    if (area) return area.price;
  } catch {
    // Base injoignable : on retombe sur la grille du code, jamais sur un refus.
  }

  return getAreaPrice(zoneId, name);
}
