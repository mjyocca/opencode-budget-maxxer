import { fetchWithTimeout } from "@/lib/http/fetch";
import { tryFetch } from "@/lib/provider/result-helpers";
import type { ProviderResult } from "@/lib/provider/types";
import { resolveZenCredentials } from "./zen.auth";
import type { ZenUsage } from "./zen.types";

const DASHBOARD_URL = "https://opencode.ai";

export async function queryZenUsage(
  opts?: { timeoutMs?: number },
): Promise<ProviderResult<ZenUsage>> {
  return tryFetch(async () => {
    const creds = await resolveZenCredentials();
    if (!creds) return null;

    const timeout = opts?.timeoutMs ?? 8000;

    const res = await fetchWithTimeout(
      `${DASHBOARD_URL}/workspace/${encodeURIComponent(creds.workspaceId)}`,
      {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          Cookie: `auth=${creds.authCookie}`,
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) BudgetMaxxer/1.0",
        },
      },
      timeout,
    );

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("OpenCode Zen authentication failed. Refresh your auth cookie.");
      }
      throw new Error(`OpenCode Zen request failed with HTTP ${res.status}.`);
    }

    const html = await res.text();

    // Zen billing data is in a single object like:
    // $R[37]={customerID:"...",balance:1069134971,reload:!1,reloadAmount:25,monthlyLimit:200,monthlyUsage:218828968,...}
    // Field order: balance, reload, ..., monthlyLimit, monthlyUsage
    const billingMatch = html.match(/\$R\[\d+\]=\{[^}]*balance\s*:\s*([^,}]+)[^}]*reload\s*:\s*([^,}]+)[^}]*monthlyLimit\s*:\s*([^,}]+)[^}]*monthlyUsage\s*:\s*([^,}]+)/);
    
    if (!billingMatch) {
      throw new Error("Could not parse usage data from the OpenCode Zen dashboard. The page format may have changed.");
    }

    const balance = asNumber(billingMatch[1]);
    const reloadRaw = billingMatch[2].trim();
    const autoReload = reloadRaw === "!0" || reloadRaw === "true";
    const monthlyLimit = asNumber(billingMatch[3]);
    const monthlyUsage = asNumber(billingMatch[4]);

    if (balance === null) {
      throw new Error("Could not parse usage data from the OpenCode Zen dashboard. The page format may have changed.");
    }

    // Zen billing values from HTML:
    // balance:3361900000 (100-millionths of a dollar → $33.62)
    // monthlyUsage:426000000 (100-millionths of a dollar → $4.26)
    // monthlyLimit:200 (already in dollars)
    const toDollars = (v: number | null): number | null => {
      if (v == null) return null;
      if (v > 10000000) return v / 100000000; // 100-millionths of a dollar
      if (v > 1000) return v / 100; // cents
      return v; // already dollars
    };

    // monthlyLimit is already in dollars (e.g., 200 = $200), don't convert
    const monthlyLimitDollars = monthlyLimit != null && monthlyLimit > 10000000
      ? monthlyLimit / 100000000
      : monthlyLimit;

    return {
      balance: toDollars(balance) ?? 0,
      monthlySpending: toDollars(monthlyUsage) ?? 0,
      monthlyLimit: monthlyLimitDollars,
      autoReload: autoReload ?? false,
    } satisfies ZenUsage;
  }, "OpenCode Zen");
}

function extractNumber(html: string, fieldName: string): number | null {
  const objectLiteral = extractObjectLiteral(html, fieldName);
  if (!objectLiteral) return null;

  const parsed = parseLooseObjectLiteral(objectLiteral) as Record<string, unknown>;
  return asNumber(parsed.value ?? parsed.amount ?? parsed.balance ?? parsed[fieldName]);
}

function extractNullableNumber(html: string, fieldName: string): number | null {
  const objectLiteral = extractObjectLiteral(html, fieldName);
  if (!objectLiteral) return null;

  const parsed = parseLooseObjectLiteral(objectLiteral) as Record<string, unknown>;
  return asNumber(parsed.value ?? parsed.amount ?? parsed.limit ?? parsed[fieldName]);
}

function extractBoolean(html: string, fieldName: string): boolean | null {
  const objectLiteral = extractObjectLiteral(html, fieldName);
  if (!objectLiteral) return null;

  const parsed = parseLooseObjectLiteral(objectLiteral) as Record<string, unknown>;
  const val = parsed.value ?? parsed.enabled ?? parsed[fieldName];
  if (typeof val === "boolean") return val;
  return null;
}

function extractObjectLiteral(html: string, fieldName: string): string | null {
  const patterns = [
    new RegExp(`${escapeRegExp(fieldName)}\\s*:\\s*\\$R\\[\\d+\\]\\s*=\\s*\\{`),
    new RegExp(`"${escapeRegExp(fieldName)}"\\s*:\\s*\\{`),
    new RegExp(`${escapeRegExp(fieldName)}\\s*:\\s*\\{`),
    new RegExp(`${escapeRegExp(fieldName)}\\s*=\\s*\\{`),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (!match || match.index === undefined) continue;

    const start = match.index + match[0].lastIndexOf("{");
    const objectLiteral = readObjectLiteral(html, start);
    if (objectLiteral) return objectLiteral;
  }

  return null;
}

function readObjectLiteral(html: string, start: number): string | null {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let escaped = false;

  for (let index = start; index < html.length; index += 1) {
    const char = html[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if ((inSingleQuote || inDoubleQuote || inBacktick) && char === "\\") {
      escaped = true;
      continue;
    }

    if (!inDoubleQuote && !inBacktick && char === "'") {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (!inSingleQuote && !inBacktick && char === '"') {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && char === "`") {
      inBacktick = !inBacktick;
      continue;
    }

    if (inSingleQuote || inDoubleQuote || inBacktick) continue;

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return html.slice(start, index + 1);
      }
    }
  }

  return null;
}

function parseLooseObjectLiteral(input: string): unknown {
  const normalized = input
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3')
    .replace(/'((?:\\.|[^'\\])*)'/g, (_, value: string) => {
      const escaped = value.replace(/"/g, '\\"');
      return `"${escaped}"`;
    })
    .replace(/("(?:\\.|[^"\\])*")|\bundefined\b/g, (match, quoted) => quoted ?? "null")
    .replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(normalized);
  } catch {
    throw new Error("Could not parse an OpenCode Zen usage payload.");
  }
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
