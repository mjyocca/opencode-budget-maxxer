import { mergeProviderConfig } from "@/providers/opencode-go/config-writer";

export async function writeZenConfigToConfigFile(
  workspaceId: string,
  authCookie: string,
): Promise<{ success: boolean; path: string; error?: string }> {
  return mergeProviderConfig("opencode", {
    workspaceId,
    authCookie: `{env:OPENCODE_GO_AUTH_COOKIE}`,
  });
}
