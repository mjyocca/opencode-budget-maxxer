import { fetchWithTimeout } from "@/lib/http/fetch";
import { tryFetch } from "@/lib/provider/result-helpers";
import type { ProviderResult } from "@/lib/provider/types";
import { resolveGoCredentials } from "./go.auth";
import type { GoRateLimit, GoWindow } from "./go.types";

const DASHBOARD_URL = "https://opencode.ai";

export async function queryGoRateLimit(
  opts?: { timeoutMs?: number },
): Promise<ProviderResult<GoRateLimit>> {
  return tryFetch(async () => {
    const creds = await resolveGoCredentials();
    if (!creds) return null;

    const timeout = opts?.timeoutMs ?? 8000;

    const res = await fetchWithTimeout(
      `${DASHBOARD_URL}/workspace/${encodeURIComponent(creds.workspaceId)}/go`,
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
        throw new Error("OpenCode Go authentication failed. Refresh your auth cookie.");
      }
      throw new Error(`OpenCode Go request failed with HTTP ${res.status}.`);
    }

    const html = await res.text();

    const rolling = extractWindow(html, "rollingUsage");
    const weekly = extractWindow(html, "weeklyUsage");
    const monthly = extractWindow(html, "monthlyUsage");

    if (!rolling && !weekly && !monthly) {
      throw new Error("Could not parse quota data from the OpenCode Go dashboard. The page format may have changed.");
    }

    return { rolling5h: rolling, weekly, monthly } satisfies GoRateLimit;
  }, "OpenCode Go");
}

function extractWindow(html: string, fieldName: string): GoWindow | null {
  const objectLiteral = extractObjectLiteral(html, fieldName);
  if (!objectLiteral) return null;

  const parsed = parseLooseObjectLiteral(objectLiteral) as Record<string, unknown>;
  const usagePercent = asNumber(parsed.usagePercent);
  const resetInSec = asNumber(parsed.resetInSec);

  if (usagePercent === null || resetInSec === null) return null;

  return {
    usagePercent: Math.round(usagePercent),
    resetInSec: Math.max(0, Math.round(resetInSec)),
  };
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
    throw new Error("Could not parse an OpenCode Go quota payload.");
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
