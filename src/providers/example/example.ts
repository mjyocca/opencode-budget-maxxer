/**
 * ExampleAdapter - reference implementation of OpenCodeAdapter.
 *
 * Copy this file to src/providers/your-provider/your-provider.ts
 * and adapt to your provider's auth scheme.
 */

import type {
  OpenCodeAdapter,
  AdapterContext,
  AdapterAuth,
} from "@/lib/adapter/types";
import { resolveCredential } from "@/lib/auth/credentials";

export class ExampleAdapter implements OpenCodeAdapter {
  readonly id = "example";
  readonly displayName = "Example Provider";

  /**
   * loadAuth is called in auth.loader.
   * Returns credentials opencode needs to make requests to this provider.
   *
   * resolveCredential() checks in order:
   *   1. process.env.EXAMPLE_API_KEY
   *   2. opencode config: provider.example.options.apiKey (supports {env:VAR})
   *   3. auth.json: auth['example'].key or auth['example'].access
   */
  async loadAuth(_ctx: AdapterContext): Promise<AdapterAuth> {
    const cred = await resolveCredential(this.id, {
      envVars: ["EXAMPLE_API_KEY"],
      authKeys: ["example"],
    });

    if (!cred) return {}; // no credentials found - opencode will fall back

    return {
      apiKey: cred.value,
      baseURL: "https://api.example.com/v1",
    };
  }
}
