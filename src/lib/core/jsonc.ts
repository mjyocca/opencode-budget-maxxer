/**
 * jsonc.ts - Parse JSON with comments and trailing commas
 *
 * Lightweight inline stripping that preserves string contents.
 */

/**
 * Strip JSONC syntax (comments + trailing commas) from a JSON string,
 * preserving string literals.
 *
 * - Single-line comments: // ...
 * - Multi-line comment markers: slash-asterisk ... asterisk-slash
 * - Trailing commas before closing brace or bracket
 */
function stripJsonc(input: string): string {
  const chars = input.split("");
  const len = chars.length;
  let out = "";
  let i = 0;

  while (i < len) {
    const ch = chars[i];

    // Handle strings (preserve content)
    if (ch === '"') {
      out += ch;
      i++;
      while (i < len) {
        const inner = chars[i];
        out += inner;
        if (inner === "\\") {
          i++;
          if (i < len) out += chars[i];
        } else if (inner === '"') {
          break;
        }
        i++;
      }
      i++;
      continue;
    }

    // Single-line comment (//)
    if (ch === "/" && chars[i + 1] === "/") {
      while (i < len && chars[i] !== "\n") i++;
      continue;
    }

    // Multi-line comment (opening with slash-asterisk)
    if (ch === "/" && chars[i + 1] === "*") {
      while (i < len) {
        if (chars[i] === "*" && chars[i + 1] === "/") {
          i += 2;
          break;
        }
        i++;
      }
      continue;
    }

    // Trailing comma: strip comma before closing brace or bracket
    if (ch === ",") {
      let j = i + 1;
      while (j < len && chars[j].match(/\s/)) j++;
      if (j < len && (chars[j] === "}" || chars[j] === "]")) {
        i++;
        continue;
      }
    }

    out += ch;
    i++;
  }

  return out;
}

// --- parseJsonOrJsonc ---

interface ParseResult {
  config: unknown;
  path: string;
  isJsonc: boolean;
}

/**
 * Parse a JSON string. If allowJsonc is true, strip comments/trailing commas first.
 */
function parseJsonOrJsonc(content: string, allowJsonc?: true): unknown;
function parseJsonOrJsonc(content: string, allowJsonc?: false): unknown;
function parseJsonOrJsonc(content: string, allowJsonc = false): unknown {
  const trimmed = content.trim();
  if (!trimmed) return undefined;

  if (allowJsonc) {
    const processed = stripJsonc(content);
    try {
      return JSON.parse(processed);
    } catch {
      return undefined;
    }
  }
  return JSON.parse(content);
}

/**
 * Parse a file as JSON or JSONC with metadata about how it was parsed.
 */
function parseJsonOrJsoncWithPath(content: string, path: string): ParseResult {
  const isJsonc = path.endsWith(".jsonc") || path.endsWith(".json5");
  const config = isJsonc
    ? parseJsonOrJsonc(content, true as const)
    : parseJsonOrJsonc(content);
  return { config, path, isJsonc };
}

export { stripJsonc, parseJsonOrJsonc, parseJsonOrJsoncWithPath };
export type { ParseResult };
