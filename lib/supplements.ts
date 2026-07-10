import type { SupplementOption } from "@/types/cart";

export const supplementOptions: SupplementOption[] = [
  { id: "chantilly", name: "Chantilly", price: 300 },
  { id: "chocolat", name: "Chocolat", price: 400 },
  { id: "caramel", name: "Caramel", price: 400 },
  { id: "double-boule", name: "Double boule", price: 1500 },
  { id: "coulis", name: "Coulis fruits", price: 350 },
  { id: "decoration", name: "Décoration premium", price: 500 },
];

export function getSupplementById(id: string): SupplementOption | undefined {
  return supplementOptions.find((option) => option.id === id);
}
