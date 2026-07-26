export type BoutiqueSettings = {
  siteName: string;
  phone: string;
  address: string;
  hours: string;
  instagramHandle: string;
  updatedAt: string;
};

export const DEFAULT_BOUTIQUE_SETTINGS: BoutiqueSettings = {
  siteName: "Ah Mes Goûts",
  phone: "+229 01 97 31 07 42",
  address: "Fidjrosse, Cotonou, Bénin",
  hours: "Mar – Dim · 10h00 – 20h00",
  instagramHandle: "@ahmesgouts",
  updatedAt: "",
};
