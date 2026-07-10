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
};

export type DriverPortalData = {
  driver: {
    firstName: string;
    name: string;
  };
  orders: DriverOrderView[];
};
