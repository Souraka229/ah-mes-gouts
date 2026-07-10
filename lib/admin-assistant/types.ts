export type AdminRole = "administrateur" | "employe";

export type AdminActionType =
  | "create_product"
  | "update_product"
  | "update_stock"
  | "toggle_zone"
  | "update_zone_cost"
  | "update_schedule"
  | "create_promo"
  | "unknown";

export type ConfidenceLevel = "high" | "medium" | "low";

export type AssistantActionPayload = Record<string, unknown>;

export type ParsedAssistantAction = {
  action: AdminActionType;
  payload: AssistantActionPayload;
  summary: string;
  confidence: ConfidenceLevel;
};

export type ActionPreview = {
  parsed: ParsedAssistantAction;
  humanSummary: string;
  humanDetails: string[];
  canApply: boolean;
  formLink: string | null;
  blockedReason: string | null;
};

export type AssistantStep = "describe" | "copy" | "validate";
