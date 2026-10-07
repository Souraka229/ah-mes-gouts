import {
  deliveryZones,
  findKnownLocality,
  getAreaPrice,
  resolveLocalityName,
} from "@/lib/delivery-zones";
import { resolveDeliveryAreaPrice } from "@/lib/server/delivery-area-repository";

export type ResolvedWhatsappLocality = {
  zoneId: string;
  area: string;
};

/** Quartier tapé par la cliente → zone + libellé officiel. */
export function resolveLocalityFromUserText(
  text: string,
): ResolvedWhatsappLocality | null {
  const known = findKnownLocality(text);
  if (!known) return null;

  for (const zone of deliveryZones) {
    const inZone = resolveLocalityName(zone.id, known);
    if (inZone) {
      return { zoneId: zone.id, area: inZone };
    }
    if (getAreaPrice(zone.id, known) !== undefined) {
      return { zoneId: zone.id, area: known };
    }
  }
  return null;
}

export async function deliveryFeeForLocality(
  zoneId: string,
  area: string,
): Promise<number | undefined> {
  return resolveDeliveryAreaPrice(zoneId, area);
}
