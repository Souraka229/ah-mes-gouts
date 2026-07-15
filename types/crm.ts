import type { SavedOrder } from "@/types/order";

export type CustomerSort = "totalSpent" | "lastOrderAt" | "ordersCount";

export type AdminCustomerListItem = {
  id: string;
  phone: string;
  phoneDisplay: string;
  firstName: string;
  lastName: string;
  displayName: string;
  ordersCount: number;
  totalSpent: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  favoriteProducts: string[];
};

export type AdminCustomerDetail = AdminCustomerListItem & {
  devicesCount: number;
  orders: SavedOrder[];
  recentActivity: {
    id: string;
    type: string;
    productName: string | null;
    productSlug: string | null;
    createdAt: string;
  }[];
};
