import { fetchJson } from "@/lib/http/fetch";
import { tryFetch } from "@/lib/provider/result-helpers";
import type { ProviderResult } from "@/lib/provider/types";
import { resolveGoToken, resolveGoWorkspaceId } from "./go.auth";
import type { GoRateLimit, GoWindow } from "./go.types";

const BASE = "https://go.opencode.ai/api/v1";

async function fetchWindow(
  token: string,
  workspaceId: string,
  window: string,
  timeoutMs: number,
): Promise<GoWindow | null> {
  const data = await fetchJson<{
    percentRemaining?: number;
    resetsAt?: string;
  }>(
    `${BASE}/workspaces/${workspaceId}/limits/${window}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
    timeoutMs,
  );

  if (data.percentRemaining === undefined) return null;

  return {
    percentRemaining: data.percentRemaining,
    resetsAt: data.resetsAt ? new Date(data.resetsAt) : null,
  };
}

export async function queryGoRateLimit(
  opts?: { timeoutMs?: number },
): Promise<ProviderResult<GoRateLimit>> {
  return tryFetch(async () => {
    const token = await resolveGoToken();
    if (!token) return null;

    const workspaceId = await resolveGoWorkspaceId();
    if (!workspaceId) return null;

    const timeout = opts?.timeoutMs ?? 5000;

    const [rolling5h, weekly, monthly] = await Promise.all([
      fetchWindow(token, workspaceId, "rolling-5h", timeout).catch(
        () => null,
      ),
      fetchWindow(token, workspaceId, "weekly", timeout).catch(() => null),
      fetchWindow(token, workspaceId, "monthly", timeout).catch(() => null),
    ]);

    return {
      rolling5h,
      weekly,
      monthly,
    } satisfies GoRateLimit;
  }, "OpenCode Go");
}
