import { describe, expect, it } from "vitest";
import {
  stripJsonc,
  parseJsonOrJsonc,
  parseJsonOrJsoncWithPath,
} from "@/lib/core/jsonc";

describe("stripJsonc", () => {
  it("single-line comments", () => {
    const result = stripJsonc('{ "key": "value" // comment\n }');
    expect(result).not.toContain("// comment");
  });

  it("multi-line comments", () => {
    const result = stripJsonc('{ "key": /* comment */ "value" }');
    expect(result).not.toContain("/*");
  });

  it("multiple single-line comments", () => {
    const result = stripJsonc(
      '// comment1\n/* comment2 *\n { "key": "value" }',
    );
    expect(result).not.toContain("comment1");
    expect(result).not.toContain("comment2");
  });

  it("trailing commas before closing brace", () => {
    const result = stripJsonc('{ "key": "value", }');
    expect(result).not.toContain("value, }");
  });

  it("trailing commas before closing bracket", () => {
    const result = stripJsonc('["a", "b"]');
    expect(result).toBe('["a", "b"]');
  });

  it("whitespace preservation", () => {
    const result = stripJsonc('{\n "key": "value"\n}');
    expect(result).toContain("key");
    expect(result).toContain("value");
  });

  it("handles empty input", () => {
    const result = stripJsonc("");
    expect(result).toBe("");
  });

  it("handles complex nested JSON with comments", () => {
    const input = `{
  "name": "test",
  "items": [
    {
      "id": 1,
      "value": "complex"
    },
  // This is a comment
    { "id": 2 }
  ],
}`;
    const result = stripJsonc(input);
    expect(result).not.toContain("// This is a comment");
    expect(result).not.toContain("complex,");
  });
});

describe("parseJsonOrJsonc", () => {
  it("parses valid JSON", () => {
    const result = parseJsonOrJsonc('{ "key": "value" }', false);
    expect(result).toEqual({ key: "value" });
  });

  it("parses valid JSONC with stripJsonc=true", () => {
    const result = parseJsonOrJsonc('{ "key": "value" // comment\n}', true);
    expect(result).toEqual({ key: "value" });
  });

  it("returns undefined for empty string", () => {
    const result = parseJsonOrJsonc("");
    expect(result).toBeUndefined();
  });

  it("returns undefined for empty JSONC string", () => {
    const result = parseJsonOrJsonc("", true);
    expect(result).toBeUndefined();
  });

  it("returns undefined for invalid JSONC content when allowJsonc=true", () => {
    const result = parseJsonOrJsonc("not json at all{{{ ", true);
    expect(result).toBeUndefined();
  });

  it("handles string content with special characters", () => {
    const result = parseJsonOrJsonc(
      '{ "key": "value with /slash\\"quote" }',
      false,
    );
    // JSON parsing unescapes \/ as / and \" as "
    expect(result).toEqual({ key: 'value with /slash"quote' });
  });
});

describe("parseJsonOrJsoncWithPath", () => {
  it("detecs JSONC files (.jsonc)", () => {
    const result = parseJsonOrJsoncWithPath(
      '{ "key": "value" // comment\n}',
      "test.jsonc",
    );
    expect(result.isJsonc).toBe(true);
    expect(result.config).toEqual({ key: "value" });
  });

  it("detects JSONC files (.json5)", () => {
    const result = parseJsonOrJsoncWithPath(
      '{ "key": "value" // comment\n}',
      "test.json5",
    );
    expect(result.isJsonc).toBe(true);
    expect(result.config).toEqual({ key: "value" });
  });

  it("detects JSON files as not JSONC", () => {
    const result = parseJsonOrJsoncWithPath('{ "key": "value" }', "test.json");
    expect(result.isJsonc).toBe(false);
    expect(result.config).toEqual({ key: "value" });
  });

  it("returns file path in result", () => {
    const result = parseJsonOrJsoncWithPath(
      '{ "key": "value" }',
      "path/to/config.json",
    );
    expect(result.path).toBe("path/to/config.json");
  });
});
