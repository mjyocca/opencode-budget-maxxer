/**
 * shared-auth.ts — Shared dashboard credential resolution for Go and Zen.
 *
 * Both OpenCode Go and OpenCode Zen require dashboard HTML scraping with a
 * browser session cookie (Fe26.2**) — there is no public REST API for quota
 * or usage data. The credentials are identical since both dashboards live on
 * opencode.ai under the same workspace.
 *
 * TODO: Rename env vars from OPENCODE_GO_* to OPENCODE_DASHBOARD_* once
 * downstream consumers are updated.
 */

export interface DashboardCredentials {
  authCookie: string;
  workspaceId: string;
}

/**
 * Resolve dashboard credentials from environment variables.
 * Returns null if either the auth cookie or workspace ID is missing.
 */
export async function resolveDashboardCredentials(): Promise<DashboardCredentials | null> {
  const authCookie = process.env["OPENCODE_GO_AUTH_COOKIE"]?.trim() ?? null;
  const workspaceId = process.env["OPENCODE_GO_WORKSPACE_ID"]?.trim() ?? null;
  if (!authCookie || !workspaceId) return null;
  return { authCookie, workspaceId };
}

export function getDashboardSetupInstructions(): string {
  return [
    "OpenCode dashboard credentials not found. Set via environment variables:",
    "  export OPENCODE_GO_WORKSPACE_ID=<workspace-id>",
    "  export OPENCODE_GO_AUTH_COOKIE=<auth-cookie>",
    "",
    "Getting credentials:",
    "  - Workspace ID: Visit https://opencode.ai/workspace/<id> — the wrk_xxx part is your ID",
    "  - Auth cookie: Browser DevTools → Application → Cookies → opencode.ai → copy 'auth' value",
    "    (starts with Fe26.2**, expires periodically)",
  ].join("\n");
}
