/**
 * config-introspection.ts — Extract plugin specs and provider IDs from config
 *
 * Walks parsed config objects to extract plugin spec strings and provider
 * identifiers with companion plugin inference.
 */

function dedupeStrings(strings: string[]): string[] {
  return [...new Set(strings)];
}

/**
 * Extract a plugin spec string from a config array entry.
 *
 * Supported formats:
 *   - string → the string itself
 *   - object with `name` or `path` property
 *   - object with `plugin` nested object
 */
function getPluginSpecFromEntry(entry: unknown): string | null {
  if (typeof entry === "string" && entry.length > 0) return entry;
  if (!entry || typeof entry !== "object") return null;

  const obj = entry as Record<string, unknown>;

  if (typeof obj.name === "string") return obj.name;
  if (typeof obj.path === "string") return obj.path;

  if (
    obj.plugin &&
    typeof obj.plugin === "object" &&
    typeof (obj.plugin as Record<string, unknown>).name === "string"
  ) {
    return (obj.plugin as Record<string, unknown>).name as string;
  }

  return null;
}

/**
 * Extract plugin spec strings from parsed config.
 *
 * Searches `plugin[]`, `tui[].plugin[]`, `companionPlugins[]`, and
 * `companion_plugin[]` paths.
 */
function extractPluginSpecs(config: unknown): string[] {
  if (!config || typeof config !== "object") return [];
  const obj = config as Record<string, unknown>;
  const specs: string[] = [];

  const paths = ["plugin", "tui", "companionPlugins", "companion_plugin"];

  for (const key of paths) {
    const val = obj[key];
    if (!val) continue;

    if (Array.isArray(val)) {
      for (const entry of val) {
        const spec = getPluginSpecFromEntry(entry);
        if (spec) specs.push(spec);
      }
      continue;
    }

    if (typeof val === "object" && !Array.isArray(val)) {
      const tuiPlugin = val as Record<string, unknown>;
      const tuiArr = tuiPlugin.plugin;
      if (Array.isArray(tuiArr)) {
        for (const entry of tuiArr) {
          const spec = getPluginSpecFromEntry(entry);
          if (spec) specs.push(spec);
        }
      }
    }
  }

  return dedupeStrings(specs);
}

function extractProviderIds(config: unknown): string[] {
  if (!config || typeof config !== "object") return [];
  const obj = config as Record<string, unknown>;
  const ids: string[] = [];

  const providerPaths = [
    "providers",
    "apiKeys",
    "api_key_providers",
    "apiKeyProviders",
  ];

  for (const key of providerPaths) {
    const val = obj[key];
    if (!val) continue;

    if (Array.isArray(val)) {
      for (const entry of val) {
        if (typeof entry === "string") ids.push(entry);
        else if (
          entry &&
          typeof entry === "object" &&
          typeof (entry as Record<string, unknown>).id === "string"
        ) {
          ids.push((entry as Record<string, unknown>).id as string);
        }
      }
      continue;
    }

    if (typeof val === "object" && !Array.isArray(val)) {
      for (const subKey of Object.keys(val as Record<string, unknown>)) {
        const subVal = (val as Record<string, unknown>)[subKey];
        if (
          subVal &&
          typeof subVal === "object" &&
          typeof (subVal as Record<string, unknown>).type === "string"
        ) {
          ids.push(subKey);
        }
      }
      continue;
    }
  }

  if (!ids.length && obj.config) {
    const provIds = extractProviderIds(obj.config);
    ids.push(...provIds);
  }

  return dedupeStrings(ids);
}

function hasProvider(config: unknown, providerId: string): boolean {
  const ids = extractProviderIds(config);
  return ids.some((id) => id.toLowerCase() === providerId.toLowerCase());
}

export {
  dedupeStrings,
  getPluginSpecFromEntry,
  extractPluginSpecs,
  extractProviderIds,
  hasProvider,
};
