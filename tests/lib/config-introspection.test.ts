import { describe, expect, it } from "vitest";
import {
  extractPluginSpecs,
  extractProviderIds,
  hasProvider,
  getPluginSpecFromEntry,
  dedupeStrings,
} from "@/lib/core/config-introspection";

describe("dedupeStrings", () => {
  it("removes duplicates", () => {
    const result = dedupeStrings(["a", "b", "a", "c", "b"]);
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("handles empty array", () => {
    expect(dedupeStrings([])).toEqual([]);
  });

  it("returns original for already unique array", () => {
    const result = dedupeStrings(["a", "b", "c"]);
    expect(result).toEqual(["a", "b", "c"]);
  });
});

describe("getPluginSpecFromEntry", () => {
  it("returns string directly from plugin entry", () => {
    expect(getPluginSpecFromEntry("@scope/plugin")).toBe("@scope/plugin");
  });

  it("returns null for non-string entry", () => {
    expect(getPluginSpecFromEntry(null)).toBeNull();
    expect(getPluginSpecFromEntry("")).toBeNull();
  });

  it("handles complex plugin object", () => {
    const entry = { name: "complex-plugin" };
    expect(getPluginSpecFromEntry(entry)).toBe("complex-plugin");
  });
});

describe("extractPluginSpecs", () => {
  it("returns empty for null config", () => {
    expect(extractPluginSpecs(null)).toEqual([]);
  });

  it("returns empty for non-object config", () => {
    expect(extractPluginSpecs("string")).toEqual([]);
  });

  it("extracts plugin specs from plugin[]", () => {
    const config = {
      plugin: ["@scope/plugin1", { name: "plugin2" }, "plugin3"],
    };
    const result = extractPluginSpecs(config);
    expect(result).toContain("@scope/plugin1");
    expect(result).toContain("plugin2");
    expect(result).toContain("plugin3");
  });

  it("extracts plugin specs from tui[].plugin[]", () => {
    const config = { tui: { plugin: ["tui-plugin"] } };
    const result = extractPluginSpecs(config);
    expect(result).toContain("tui-plugin");
  });

  it("does not implicitly inject plugins when companion plugins exist", () => {
    const config = { companionPlugins: ["some-plugin"] };
    const result = extractPluginSpecs(config);
    expect(result).toContain("some-plugin");
    expect(result).not.toContain("qwen-code");
  });

  it("deduplicates plugin specs", () => {
    const config = { plugin: ["a", "b", "a"] };
    const result = extractPluginSpecs(config);
    const aCount = result.filter((s) => s === "a").length;
    expect(aCount).toBe(1);
  });
});

describe("extractProviderIds", () => {
  it("returns empty for null config", () => {
    expect(extractProviderIds(null)).toEqual([]);
  });

  it("returns empty for non-object config", () => {
    expect(extractProviderIds("string")).toEqual([]);
  });

  it("extracts provider IDs from providers[]", () => {
    const config = { providers: ["openai", "anthropic"] };
    const result = extractProviderIds(config);
    expect(result).toContain("openai");
    expect(result).toContain("anthropic");
  });

  it("extracts provider IDs from apiKeyProviders[]", () => {
    const config = { apiKeyProviders: [{ id: "cohere" }, { id: "xai" }] };
    const result = extractProviderIds(config);
    expect(result).toContain("cohere");
    expect(result).toContain("xai");
  });

  it("deduplicates provider IDs", () => {
    const config = { providers: ["a", "b", "a"] };
    const result = extractProviderIds(config);
    const aCount = result.filter((s) => s === "a").length;
    expect(aCount).toBe(1);
  });
});

describe("extractPluginSpecs — no implicit injection", () => {
  it("does not inject qwen-code when companion key is present", () => {
    const config = { companion: true, plugin: ["other-plugin"] };
    const specs = extractPluginSpecs(config);
    expect(specs).not.toContain("qwen-code");
  });

  it("does not inject any implicit plugins for companionPlugins", () => {
    const config = { companionPlugins: ["some-plugin"] };
    const specs = extractPluginSpecs(config);
    expect(specs).toEqual(["some-plugin"]);
  });
});

describe("hasProvider", () => {
  it("returns false for null config", () => {
    expect(hasProvider(null, "openai")).toBe(false);
  });

  it("returns true for existing provider", () => {
    const config = { providers: ["openai", "anthropic"] };
    expect(hasProvider(config, "openai")).toBe(true);
  });

  it("returns false for non-existing provider", () => {
    const config = { providers: ["openai", "anthropic"] };
    expect(hasProvider(config, "google")).toBe(false);
  });

  it("uses case-insensitive matching", () => {
    const config = { providers: ["OpenAI", "anthropic"] };
    expect(hasProvider(config, "openai")).toBe(true);
  });
});
