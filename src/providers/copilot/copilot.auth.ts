import { resolveCredential } from "@/lib/auth/credentials";
import { readAuthFileCached } from "@/lib/auth/auth-file";
import type { CopilotAuthEntry } from "./copilot.types";

export const COPILOT_AUTH_KEYS = [
  "github-copilot",
  "copilot",
  "copilot-chat",
  "github-copilot-chat",
] as const;

export async function resolveCopilotToken(): Promise<string | null> {
  const cred = await resolveCredential("copilot", {
    envVars: ["GITHUB_TOKEN", "COPILOT_TOKEN"],
    authKeys: [...COPILOT_AUTH_KEYS],
  });
  if (cred) return cred.value;

  const auth = await readAuthFileCached();
  if (auth) {
    for (const key of COPILOT_AUTH_KEYS) {
      const entry = auth[key] as CopilotAuthEntry | undefined;
      if (entry?.access && (!entry.expires || entry.expires > Date.now())) {
        return entry.access;
      }
    }
  }

  return null;
}
