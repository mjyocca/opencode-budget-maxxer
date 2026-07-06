import { spawn } from "node:child_process";
import { platform } from "node:os";
import { fetchWithTimeout } from "@/lib/http/fetch";

export async function openZenDashboard(): Promise<{ opened: boolean; url: string; error?: string }> {
  const url = "https://opencode.ai/zen";

  if (platform() === "darwin") {
    return spawnCommand("open", [url]).then(() => ({ opened: true, url }));
  }
  if (platform() === "linux") {
    return spawnCommand("xdg-open", [url]).then(() => ({ opened: true, url }));
  }
  if (platform() === "win32") {
    return spawnCommand("cmd", ["/c", "start", url]).then(() => ({ opened: true, url }));
  }

  return { opened: false, url, error: `Unsupported platform: ${platform()}` };
}

export async function validateZenCredentials(
  workspaceId: string,
  authCookie: string,
  timeoutMs = 8000,
): Promise<{ valid: boolean; windows: string[]; error?: string }> {
  try {
    const res = await fetchWithTimeout(
      `https://opencode.ai/workspace/${encodeURIComponent(workspaceId)}`,
      {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          Cookie: `auth=${authCookie}`,
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) BudgetMaxxer/1.0",
        },
      },
      timeoutMs,
    );

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { valid: false, windows: [], error: "Authentication failed — cookie may be expired." };
      }
      return { valid: false, windows: [], error: `Request failed with HTTP ${res.status}.` };
    }

    const html = await res.text();
    const windows: string[] = [];

    for (const name of ["balance", "monthlySpending", "monthlyLimit"]) {
      if (html.includes(name)) {
        windows.push(name);
      }
    }

    if (windows.length === 0) {
      return { valid: false, windows: [], error: "Dashboard loaded but no usage data found — page format may have changed." };
    }

    return { valid: true, windows };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, windows: [], error: msg };
  }
}

function spawnCommand(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { detached: true, stdio: "ignore" });
    proc.unref();
    proc.on("error", reject);
    proc.on("spawn", () => resolve());
  });
}
