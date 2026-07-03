import { fetchWithTimeout } from "@/lib/http/fetch";
import { tryFetch } from "@/lib/provider/result-helpers";
import type { ProviderResult } from "@/lib/provider/types";
import { resolveCopilotToken } from "./copilot.auth";
import type { CopilotUsage, CopilotQuotaSnapshot } from "./copilot.types";

const BASE = "https://api.github.com";

export async function queryCopilotUsage(
  opts?: { timeoutMs?: number },
): Promise<ProviderResult<CopilotUsage>> {
  return tryFetch(async () => {
    const token = await resolveCopilotToken();
    if (!token) return null;

    const timeout = opts?.timeoutMs ?? 8000;

    const res = await fetchWithTimeout(
      `${BASE}/copilot_internal/user`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) BudgetMaxxer/1.0",
        },
      },
      timeout,
    );

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("GitHub Copilot authentication failed. Refresh your token.");
      }
      throw new Error(`GitHub Copilot request failed with HTTP ${res.status}.`);
    }

    const data = (await res.json()) as Record<string, unknown>;

    const plan = asString(data.copilot_plan) ?? "unknown";
    const tokenBasedBilling = data.token_based_billing === true;
    const quotaResetDate = asString(data.quota_reset_date_utc) ?? asString(data.quota_reset_date) ?? null;

    const snapshots = (data.quota_snapshots ?? {}) as Record<string, unknown>;
    const premiumInteractions = parseSnapshot(snapshots.premium_interactions);
    const chat = parseSnapshot(snapshots.chat);
    const completions = parseSnapshot(snapshots.completions);

    const orgList = data.organization_list as Array<{ login?: string }> | undefined;
    const organizations = orgList
      ? orgList.map((o) => o.login ?? "").filter(Boolean)
      : [];

    const unlimited = premiumInteractions?.unlimited ?? true;

    return {
      plan,
      tokenBasedBilling,
      quotaResetDate,
      premiumInteractions,
      chat,
      completions,
      organizations,
      unlimited,
    } satisfies CopilotUsage;
  }, "GitHub Copilot");
}

function parseSnapshot(raw: unknown): CopilotQuotaSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const entitlement = asNumber(obj.entitlement);
  const remaining = asNumber(obj.remaining);
  const quotaRemaining = asNumber(obj.quota_remaining);
  const percentRemaining = asNumber(obj.percent_remaining);
  const unlimited = obj.unlimited === true;
  const hasQuota = obj.has_quota as boolean | undefined;
  const overagePermitted = obj.overage_permitted as boolean | undefined;

  if (entitlement === null && !unlimited) return null;

  return {
    entitlement: entitlement ?? 0,
    remaining: remaining ?? quotaRemaining ?? 0,
    quota_remaining: quotaRemaining ?? undefined,
    percent_remaining: percentRemaining ?? (unlimited ? 100 : 0),
    unlimited,
    has_quota: hasQuota,
    overage_permitted: overagePermitted,
  };
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}
