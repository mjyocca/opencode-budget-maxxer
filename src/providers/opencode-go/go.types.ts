export interface GoCredentials {
  authCookie: string;
  workspaceId: string;
}

export interface GoWindow {
  usagePercent: number;
  resetInSec: number;
}

export interface GoRateLimit {
  rolling5h: GoWindow | null;
  weekly: GoWindow | null;
  monthly: GoWindow | null;
}
