import type { DeliveryZone } from "@/types/order";

export const deliveryZones: DeliveryZone[] = [
  {
    id: "zone-e",
    code: "E",
    name: "Destinations E",
    price: 500,
    areas: ["Fidjrossè", "Bord de mer", "Zones côtières proches"],
  },
  {
    id: "zone-d",
    code: "D",
    name: "Destinations D",
    price: 700,
    areas: ["Agla", "Godomey", "Akogbato", "Environs"],
  },
  {
    id: "zone-c",
    code: "C",
    name: "Destinations C",
    price: 800,
    areas: ["Guinkomey", "Tokpa", "St Michel", "Akpakpa (parties)"],
  },
  {
    id: "zone-b",
    code: "B",
    name: "Destinations B",
    price: 1000,
    areas: ["Cadjehoun", "Haie Vive", "Cocotiers", "Quartiers centraux premium"],
  },
  {
    id: "zone-a",
    code: "A",
    name: "Destinations A",
    price: 1500,
    areas: ["Abomey-Calavi", "Akpakpa (éloigné)", "Zones périphériques"],
  },
];

export function getDeliveryZoneById(id: string): DeliveryZone | undefined {
  return deliveryZones.find((zone) => zone.id === id);
}
