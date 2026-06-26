import type {
  Hooks,
  AuthHook,
  ProviderHook,
  Config,
} from "@opencode-ai/plugin";

type HookFn = (...args: unknown[]) => Promise<void>;

type HookClass =
  | { kind: "dispose" }
  | { kind: "observer" }
  | { kind: "pipeline" };

// Stable — these hook names have not changed since the plugin system launched.
// New opencode hooks are TriggerName hooks (pipeline) by convention.
const DISPOSE_HOOKS = new Set<string>(["dispose"]);
const OBSERVER_HOOKS = new Set<string>(["event", "config"]);

function classify(key: string): HookClass {
  if (DISPOSE_HOOKS.has(key)) return { kind: "dispose" };
  if (OBSERVER_HOOKS.has(key)) return { kind: "observer" };
  return { kind: "pipeline" };
}

export interface ComposePluginOptions {
  /**
   * Composed trigger hooks — all fan-out hooks returned by composeHooks().
   */
  hooks?: Partial<Omit<Hooks, "auth" | "provider">>;

  /**
   * Auth hook for a single provider.
   * One registration per provider ID across all plugins.
   *
   * @example
   * auth: {
   *   provider: "github-copilot",
   *   methods: [{ type: "api", label: "GitHub Token" }],
   *   loader: async (getAuth) => {
   *     const stored = await getAuth();
   *     return { apiKey: stored?.key };
   *   },
   * }
   */
  auth?: AuthHook;

  /**
   * Provider hook — extends an existing provider's model list.
   * Multiple plugins with different id values coexist fine.
   *
   * @example
   * provider: {
   *   id: "github-copilot",
   *   models: async (providerDef, ctx) => ({
   *     "gpt-4o-custom": { ... },
   *   }),
   * }
   */
  provider?: ProviderHook;

  /**
   * Config hook — called once at startup with the full opencode config.
   * The runtime fans this out to all plugins; composePlugin wires it in as
   * a single function so the caller handles it once here.
   *
   * @example
   * config: async (cfg) => {
   *   const providerOpts = cfg.provider?.["my-provider"];
   *   if (providerOpts?.options?.baseUrl) {
   *     // use custom base URL from user config
   *   }
   * }
   */
  config?: (input: Config) => Promise<void>;
}

/**
 * Merge multiple partial hook objects into one.
 *
 * Hook classification (see classify() above):
 *
 *   dispose   — fire-all, errors collected into AggregateError
 *   event     — fire-all, errors propagate
 *   config    — fire-all, errors propagate
 *   tool      — key-merge: both sets of tool registrations survive
 *   all other function hooks (chat.params, chat.headers, tool.execute.*,
 *     shell.env, permission.ask, experimental.*, tool.definition, ...)
 *             — sequential pipeline against shared output object,
 *               matching opencode's plugin.trigger() call pattern
 *
 * auth and provider are excluded — pass them to composePlugin() instead.
 * They are configuration objects (not functions) consumed by separate
 * runtime subsystems, not called through the hook trigger pipeline.
 *
 * Note: "permission.ask" exists in the Hooks type but is not currently
 * wired in the opencode runtime. It is classified as pipeline here for
 * correctness when it is eventually connected.
 */
export function composeHooks(
  ...parts: Partial<Omit<Hooks, "auth" | "provider">>[]
): Omit<Hooks, "auth" | "provider"> {
  const result: Record<string, unknown> = {};
  const collectors: Record<string, HookFn[]> = {};

  for (const part of parts) {
    if (!part) continue;

    for (const [key, value] of Object.entries(part)) {
      if (value === undefined) continue;

      if (key === "tool" && result.tool) {
        // Key-merge: both sets of tools survive
        result.tool = { ...(result.tool as object), ...(value as object) };
      }
      else if (typeof value === "function") {
        // Collect for classification-based assembly below
        (collectors[key] ??= []).push(value as HookFn);
      }
      else {
        // last-wins for non-function values (auth, provider config objects)
        result[key] = value;
      }
    }
  }

  // Assemble collected handlers by classification
  for (const [key, handlers] of Object.entries(collectors)) {
    if (handlers.length === 0) continue;

    const cls = classify(key);

    if (cls.kind === "dispose") {
      result[key] = async () => {
        const errors: unknown[] = [];
        for (const h of handlers) {
          try {
            await h();
          }
          catch (err) {
            errors.push(err);
          }
        }
        if (errors.length === 1) throw errors[0];
        if (errors.length > 1) throw new AggregateError(errors, "Multiple dispose handlers failed");
      };
    }
    else if (cls.kind === "observer") {
      result[key] = async (input: unknown) => {
        const errors: unknown[] = [];
        for (const h of handlers) {
          try {
            await h(input);
          }
          catch (err) {
            errors.push(err);
          }
        }
        if (errors.length === 1) throw errors[0];
        if (errors.length > 1) throw new AggregateError(errors, `Multiple ${key} handlers failed`);
      };
    }
    else {
      // pipeline: sequential, shared output — matches runtime behavior
      result[key] = async (input: unknown, output: unknown) => {
        for (const h of handlers) {
          await h(input, output);
        }
      };
    }
  }

  return result as Omit<Hooks, "auth" | "provider">;
}

/**
 * Assemble the final Hooks object returned by a Plugin function.
 *
 * Separates the three singleton hooks (auth, provider, config) into
 * explicit named arguments rather than folding them into the variadic
 * composeHooks() call where their behavior is ambiguous.
 *
 * auth, provider, config are single-owner attributes — one registration
 * per provider ID across all plugins.
 *
 * Usage:
 *   export const MyPlugin: Plugin = async (ctx) => {
 *     const registry = new AdapterRegistry().register(new CopilotAdapter(ctx));
 *
 *     return composePlugin({
 *       auth: {
 *         provider: "github-copilot",
 *         methods: [{ type: "api", label: "GitHub Token" }],
 *       },
 *       provider: {
 *         id: "github-copilot",
 *         models: async (p, ctx) => ({ ... }),
 *       },
 *       config: async (cfg) => {
 *         // read cfg.provider["github-copilot"] etc
 *       },
 *       hooks: composeHooks(
 *         buildChatHeadersHook(registry, ctx),
 *         { tool: { session_stats: statsTool } },
 *         { event: handleEvent },
 *         buildSessionTracker(ctx),
 *       ),
 *     });
 *   };
 */
export function composePlugin(options: ComposePluginOptions): Hooks {
  const { hooks, auth, provider, config } = options;

  return {
    ...(hooks ?? {}),
    ...(auth !== undefined && { auth }),
    ...(provider !== undefined && { provider }),
    ...(config !== undefined && { config }),
  } as Hooks;
}
