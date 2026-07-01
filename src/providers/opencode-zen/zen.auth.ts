import type { ZenCredentials } from "./zen.types";
import { resolveDashboardCredentials, getDashboardSetupInstructions } from "@/lib/auth/shared-auth";

/**
 * Resolve Zen credentials from environment variables.
 * Delegates to shared dashboard auth — both Go and Zen use the same
 * browser session cookie for dashboard scraping.
 */
export async function resolveZenCredentials(): Promise<ZenCredentials | null> {
  const shared = await resolveDashboardCredentials();
  if (!shared) return null;
  return { authCookie: shared.authCookie, workspaceId: shared.workspaceId };
}

export { getDashboardSetupInstructions as getSetupInstructions };
