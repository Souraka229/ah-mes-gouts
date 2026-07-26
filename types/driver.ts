export type DriverOrderView = {
  id: string;
  status: "prete" | "en_livraison";
  zoneName: string | null;
  deliveryAddress: string;
  landmark: string | null;
  clientPhone: string;
  clientFirstName: string;
  recipientName: string | null;
  isGift: boolean;
  total: number;
  collectOnDelivery: boolean;
  scheduledSlotStart: string | null;
  driverStartedAt: string | null;
  /** Marqueur « client injoignable » posé par le livreur, si présent. */
  unreachableAt: string | null;
};

export type DriverPortalData = {
  driver: {
    firstName: string;
    name: string;
  };
  orders: DriverOrderView[];
};

export type DriverHistoryOrder = {
  id: string;
  status: string;
  clientName: string;
  zoneName: string | null;
  total: number;
  createdAt: string;
  scheduledSlotStart: string | null;
  startedAt: string | null;
  deliveredAt: string | null;
  unreachableAt: string | null;
  durationMinutes: number | null;
};

export type DriverHistoryAction = {
  id: string;
  orderId: string | null;
  action: "assigned" | "started" | "unreachable" | "delivered" | "status";
  label: string;
  createdAt: string;
};

export type DriverHistoryData = {
  driver: {
    id: string;
    name: string;
    phone: string;
    isActive: boolean;
    createdAt: string;
  };
  summary: {
    totalOrders: number;
    deliveredOrders: number;
    activeOrders: number;
    lastOrderAt: string | null;
    averageDeliveryMinutes: number | null;
  };
  orders: DriverHistoryOrder[];
  actions: DriverHistoryAction[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
};
