/**
 * env-template.ts — Resolve `{env:VAR_NAME}` templates in config values
 *
 * OpenCode's syntax for referencing environment variables in config values.
 */

const ENV_TEMPLATE_RE = /\{env:\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}/g;

interface AllowedEnv {
  readonly name: string;
  readonly category: string;
}

/**
 * Resolve `{env:VAR_NAME}` templates in a string value.
 *
 * @param value   — the config value to process
 * @param allowed — optional allowlist of env var names or `{name, category}` objects
 * @returns resolved string, or `null` if a disallowed env var is referenced
 */
function resolveEnvTemplate(
  value: string,
  allowed?: string[] | AllowedEnv[] | null,
): string | null {
  if (!value || typeof value !== "string") return value;

  const templates = value.match(ENV_TEMPLATE_RE);
  if (!templates) return value; // no templates — return as-is

  const parsed = templates.map((t) => {
    const match = t.match(/\{env:\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}/);
    return match ? match[1] : "";
  });

  if (parsed.length !== templates.length) return null;

  for (const name of parsed) {
    if (allowed) {
      const found = allowed.find((a) => {
        if (typeof a === "string") return a === name;
        return a.name === name;
      });
      if (!found) return null;
    }

    const val = process.env[name];
    if (val === undefined) return null;
  }

  return value.replace(ENV_TEMPLATE_RE, (full) => {
    const match = full.match(/\{env:\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}/);
    if (!match) return full;
    return process.env[match[1]] ?? full;
  });
}

export { resolveEnvTemplate };
export type { AllowedEnv };
