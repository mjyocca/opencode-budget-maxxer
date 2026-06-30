export interface GoAuthEntry {
  type: "oauth" | "api";
  access?: string;
  key?: string;
  workspaceId?: string;
  expires?: number;
}

export interface GoWindow {
  percentRemaining: number;
  resetsAt: Date | null;
}

export interface GoRateLimit {
  rolling5h: GoWindow | null;
  weekly: GoWindow | null;
  monthly: GoWindow | null;
}
