import { resolveCredential } from "@/lib/auth/credentials";
import { readAuthFileCached } from "@/lib/auth/auth-file";
import type { GoAuthEntry } from "./go.types";

export const GO_AUTH_KEYS = ["opencode-go", "opencode_go", "go"] as const;

export async function resolveGoToken(): Promise<string | null> {
  const cred = await resolveCredential("opencode-go", {
    envVars: ["OPENCODE_GO_TOKEN", "GO_TOKEN"],
    authKeys: [...GO_AUTH_KEYS],
  });
  if (cred) return cred.value;

  const auth = await readAuthFileCached();
  if (auth) {
    for (const key of GO_AUTH_KEYS) {
      const entry = auth[key] as GoAuthEntry | undefined;
      if (entry?.access && (!entry.expires || entry.expires > Date.now())) {
        return entry.access;
      }
      if (entry?.key) {
        return entry.key;
      }
    }
  }

  return null;
}

export async function resolveGoWorkspaceId(): Promise<string | null> {
  const auth = await readAuthFileCached();
  if (auth) {
    for (const key of GO_AUTH_KEYS) {
      const entry = auth[key] as GoAuthEntry | undefined;
      if (entry?.workspaceId) {
        return entry.workspaceId;
      }
    }
  }
  return null;
}
