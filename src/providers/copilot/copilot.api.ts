import { fetchJson } from "@/lib/http/fetch";
import { tryFetch } from "@/lib/provider/result-helpers";
import type { ProviderResult } from "@/lib/provider/types";
import { resolveCopilotToken } from "./copilot.auth";
import type { CopilotRateLimit } from "./copilot.types";

const BASE = "https://api.github.com";

export async function queryCopilotRateLimit(
  opts?: { timeoutMs?: number },
): Promise<ProviderResult<CopilotRateLimit>> {
  return tryFetch(async () => {
    const token = await resolveCopilotToken();
    if (!token) return null;

    await fetchJson<{
      copilot_ide_code_completions?: {
        total_suggestions_count?: number;
        total_acceptances_count?: number;
      };
    }>(
      `${BASE}/copilot_internal/user`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
      opts?.timeoutMs ?? 5000,
    );

    return {
      remaining: null,
      limit: null,
      resetsAt: null,
      unlimited: true,
    } satisfies CopilotRateLimit;
  }, "Copilot");
}
