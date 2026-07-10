export type FulfillmentType = "delivery" | "pickup";

export type DeliveryZoneConfig = {
  id: string;
  name: string;
  cost: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryScheduleConfig = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  type: FulfillmentType;
  isActive: boolean;
};

export type DeliveryConfig = {
  zones: DeliveryZoneConfig[];
  schedules: DeliveryScheduleConfig[];
};

export type TimeSlotOption = {
  start: string;
  end: string;
  label: string;
  slotKey: string;
};

export type ScheduledSlot = {
  start: string;
  end: string;
};
