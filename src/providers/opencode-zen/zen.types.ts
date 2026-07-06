export interface ZenCredentials {
  authCookie: string;
  workspaceId: string;
}

export interface ZenUsage {
  balance: number;
  monthlySpending: number;
  monthlyLimit: number | null;
  autoReload: boolean;
}
