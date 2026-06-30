export interface CopilotAuthEntry {
  type: string;
  access?: string;
  refresh?: string;
  expires?: number;
}

export interface CopilotRateLimit {
  remaining: number | null;
  limit: number | null;
  resetsAt: Date | null;
  unlimited: boolean;
}
