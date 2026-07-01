import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { writeGoConfigToConfigFile, mergeProviderConfig } from "@/providers/opencode-go/config-writer";
import { readFileSync, existsSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import os from "node:os";

describe("writeGoConfigToConfigFile", () => {
  let testDir: string;
  let originalHome: string | undefined;
  let originalConfigDir: string | undefined;

  beforeEach(() => {
    testDir = join(os.tmpdir(), `budget-maxxer-test-${Date.now()}-${Math.random()}`);
    mkdirSync(testDir, { recursive: true });
    originalHome = process.env.HOME;
    originalConfigDir = process.env.OPENCODE_CONFIG_DIR;
    process.env.HOME = testDir;
    process.env.OPENCODE_CONFIG_DIR = testDir;
  });

  afterEach(() => {
    if (originalHome !== undefined) process.env.HOME = originalHome;
    else delete process.env.HOME;
    if (originalConfigDir !== undefined) process.env.OPENCODE_CONFIG_DIR = originalConfigDir;
    else delete process.env.OPENCODE_CONFIG_DIR;
    try { rmSync(testDir, { recursive: true, force: true }); } catch {}
  });

  it("creates config file with provider section when none exists", async () => {
    const result = await writeGoConfigToConfigFile("wrk-test-123", "Fe26.2**test");

    expect(result.success).toBe(true);
    expect(result.path).toBe(resolve(testDir, "opencode.jsonc"));
    expect(existsSync(result.path)).toBe(true);

    const content = readFileSync(result.path, "utf-8");
    const config = JSON.parse(content.replace(/\/\/.*$/gm, ""));
    expect(config.provider).toBeDefined();
    expect(config.provider["opencode-go"]).toBeDefined();
    expect(config.provider["opencode-go"].options.workspaceId).toBe("wrk-test-123");
    expect(config.provider["opencode-go"].options.authCookie).toBe("{env:OPENCODE_GO_AUTH_COOKIE}");
  });

  it("preserves existing config when adding provider section", async () => {
    const existingConfig = { theme: "dark", agent: "build" };
    writeFileSync(join(testDir, "opencode.jsonc"), JSON.stringify(existingConfig, null, 2));

    const result = await writeGoConfigToConfigFile("wrk-test-456", "Fe26.2**test2");

    expect(result.success).toBe(true);
    const content = readFileSync(result.path, "utf-8");
    const config = JSON.parse(content.replace(/\/\/.*$/gm, ""));
    expect(config.theme).toBe("dark");
    expect(config.agent).toBe("build");
    expect(config.provider["opencode-go"].options.workspaceId).toBe("wrk-test-456");
  });
});

describe("mergeProviderConfig", () => {
  let testDir: string;
  let originalHome: string | undefined;
  let originalConfigDir: string | undefined;

  beforeEach(() => {
    testDir = join(os.tmpdir(), `budget-maxxer-merge-${Date.now()}-${Math.random()}`);
    mkdirSync(testDir, { recursive: true });
    originalHome = process.env.HOME;
    originalConfigDir = process.env.OPENCODE_CONFIG_DIR;
    process.env.HOME = testDir;
    process.env.OPENCODE_CONFIG_DIR = testDir;
  });

  afterEach(() => {
    if (originalHome !== undefined) process.env.HOME = originalHome;
    else delete process.env.HOME;
    if (originalConfigDir !== undefined) process.env.OPENCODE_CONFIG_DIR = originalConfigDir;
    else delete process.env.OPENCODE_CONFIG_DIR;
    try { rmSync(testDir, { recursive: true, force: true }); } catch {}
  });

  it("deep-merges options into existing provider config", async () => {
    const existingConfig = {
      provider: {
        "opencode-go": {
          options: {
            workspaceId: "wrk-old",
            customHeader: "keep-me",
          },
        },
      },
    };
    writeFileSync(join(testDir, "opencode.jsonc"), JSON.stringify(existingConfig, null, 2));

    const result = await mergeProviderConfig("opencode-go", {
      workspaceId: "wrk-new",
      authCookie: "{env:OPENCODE_GO_AUTH_COOKIE}",
    });

    expect(result.success).toBe(true);
    const content = readFileSync(result.path, "utf-8");
    const config = JSON.parse(content.replace(/\/\/.*$/gm, ""));
    expect(config.provider["opencode-go"].options.workspaceId).toBe("wrk-new");
    expect(config.provider["opencode-go"].options.authCookie).toBe("{env:OPENCODE_GO_AUTH_COOKIE}");
    expect(config.provider["opencode-go"].options.customHeader).toBe("keep-me");
  });

  it("preserves other provider sections", async () => {
    const existingConfig = {
      provider: {
        copilot: { options: { apiKey: "ghp_xxx" } },
        ollama: { options: { baseURL: "http://localhost:11434" } },
      },
    };
    const configPath = join(testDir, "opencode.jsonc");
    writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));

    const result = await mergeProviderConfig("opencode-go", {
      workspaceId: "wrk-test",
      authCookie: "{env:OPENCODE_GO_AUTH_COOKIE}",
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe(resolve(testDir, "opencode.jsonc"));
    const content = readFileSync(result.path, "utf-8");
    const config = JSON.parse(content) as Record<string, unknown>;
    expect(config.provider.copilot).toBeDefined();
    expect(config.provider.copilot.options.apiKey).toBe("ghp_xxx");
    expect(config.provider.ollama).toBeDefined();
    expect(config.provider.ollama.options.baseURL).toBe("http://localhost:11434");
    expect(config.provider["opencode-go"]).toBeDefined();
  });

  it("creates provider section when none exists for that provider", async () => {
    const existingConfig = { theme: "dark" };
    writeFileSync(join(testDir, "opencode.jsonc"), JSON.stringify(existingConfig, null, 2));

    await mergeProviderConfig("opencode-go", {
      workspaceId: "wrk-test",
      authCookie: "{env:OPENCODE_GO_AUTH_COOKIE}",
    });

    const content = readFileSync(join(testDir, "opencode.jsonc"), "utf-8");
    const config = JSON.parse(content.replace(/\/\/.*$/gm, ""));
    expect(config.theme).toBe("dark");
    expect(config.provider["opencode-go"].options.workspaceId).toBe("wrk-test");
  });
});
