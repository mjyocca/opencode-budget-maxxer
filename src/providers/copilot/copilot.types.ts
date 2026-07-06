export interface CopilotAuthEntry {
  type: string;
  access?: string;
  refresh?: string;
  expires?: number;
}

export interface CopilotQuotaSnapshot {
  entitlement: number;
  remaining: number;
  quota_remaining?: number;
  percent_remaining: number;
  unlimited: boolean;
  has_quota?: boolean;
  overage_permitted?: boolean;
}

export interface CopilotUsage {
  plan: string;
  tokenBasedBilling: boolean;
  quotaResetDate: string | null;
  premiumInteractions: CopilotQuotaSnapshot | null;
  chat: CopilotQuotaSnapshot | null;
  completions: CopilotQuotaSnapshot | null;
  organizations: string[];
  unlimited: boolean;
}
