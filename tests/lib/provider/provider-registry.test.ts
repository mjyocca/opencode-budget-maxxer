import { describe, expect, it } from "vitest";
import { ProviderRegistry } from "@/lib/provider/registry";
import type { Provider, ProviderContext, ProviderAuth, ProviderResult, TuiCommand } from "@/lib/provider/types";

class MockProvider implements Provider {
  readonly id = "mock";
  readonly displayName = "Mock Provider";
  async loadAuth(): Promise<ProviderAuth> { return {}; }
  async fetchProviderApi<T>(): Promise<ProviderResult<T>> {
    return { attempted: false, data: null, error: null };
  }
  async isConfigured(): Promise<boolean> { return true; }
  async inspect(): Promise<Record<string, unknown>> { return {}; }
}

describe("ProviderRegistry", () => {
  it("register adds provider by id", async () => {
    const registry = new ProviderRegistry();
    registry.register(new MockProvider());
    await registry.startupAll({ plugin: {} as any });
    expect(registry.ids()).toContain("mock");
  });

  it("get returns provider by id", () => {
    const registry = new ProviderRegistry();
    const provider = new MockProvider();
    registry.register(provider);
    expect(registry.get("mock")).toBe(provider);
  });

  it("get returns null for unknown id", () => {
    const registry = new ProviderRegistry();
    expect(registry.get("unknown")).toBeNull();
  });

  it("all returns all registered providers", async () => {
    const registry = new ProviderRegistry();
    const p1 = new MockProvider();
    registry.register(p1);
    await registry.startupAll({ plugin: {} as any });
    expect(registry.all()).toEqual([p1]);
  });

  it("ids returns all registered ids", async () => {
    const registry = new ProviderRegistry();
    const p1 = new MockProvider();
    const p2 = new (class implements Provider {
      readonly id = "other";
      readonly displayName = "Other";
      async loadAuth(): Promise<ProviderAuth> { return {}; }
      async fetchProviderApi<T>(): Promise<ProviderResult<T>> {
        return { attempted: false, data: null, error: null };
      }
      async isConfigured(): Promise<boolean> { return true; }
      async inspect(): Promise<Record<string, unknown>> { return {}; }
    })();
    registry.register(p1, p2);
    await registry.startupAll({ plugin: {} as any });
    expect(registry.ids()).toContain("mock");
    expect(registry.ids()).toContain("other");
  });

  it("register is fluent (returns this)", () => {
    const registry = new ProviderRegistry();
    const result = registry.register(new MockProvider());
    expect(result).toBe(registry);
  });

  it("register overwrites on duplicate id", () => {
    const registry = new ProviderRegistry();
    const p1 = new MockProvider();
    const p2 = new (class implements Provider {
      readonly id = "mock";
      readonly displayName = "Other";
      async loadAuth(): Promise<ProviderAuth> { return {}; }
      async fetchProviderApi<T>(): Promise<ProviderResult<T>> {
        return { attempted: false, data: null, error: null };
      }
      async isConfigured(): Promise<boolean> { return true; }
      async inspect(): Promise<Record<string, unknown>> { return {}; }
    })();
    registry.register(p1);
    registry.register(p2);
    expect(registry.get("mock")).toBe(p2);
  });

  it("startupAll skips unconfigured providers", async () => {
    const registry = new ProviderRegistry();
    const configured = new MockProvider();
    const unconfigured = new (class implements Provider {
      readonly id = "unconfigured";
      readonly displayName = "Unconfigured";
      async loadAuth(): Promise<ProviderAuth> { return {}; }
      async fetchProviderApi<T>(): Promise<ProviderResult<T>> {
        return { attempted: false, data: null, error: null };
      }
      async isConfigured(): Promise<boolean> { return false; }
      async inspect(): Promise<Record<string, unknown>> { return {}; }
    })();
    registry.register(configured, unconfigured);
    await registry.startupAll({ plugin: {} as any });
    expect(registry.all()).toEqual([configured]);
    expect(registry.allRegistered()).toEqual([configured, unconfigured]);
  });

  it("startupAll handles isConfigured errors gracefully", async () => {
    const registry = new ProviderRegistry();
    const failing = new (class implements Provider {
      readonly id = "failing";
      readonly displayName = "Failing";
      async loadAuth(): Promise<ProviderAuth> { return {}; }
      async fetchProviderApi<T>(): Promise<ProviderResult<T>> {
        return { attempted: false, data: null, error: null };
      }
      async isConfigured(): Promise<boolean> { throw new Error("Config error"); }
      async inspect(): Promise<Record<string, unknown>> { return {}; }
    })();
    const working = new MockProvider();
    registry.register(failing, working);
    await registry.startupAll({ plugin: {} as any });
    expect(registry.all()).toEqual([working]);
    expect(registry.allRegistered()).toEqual([failing, working]);
  });

  it("cleanupAll only cleans active providers", async () => {
    const registry = new ProviderRegistry();
    const cleanupCalls: string[] = [];
    const configured = new (class implements Provider {
      readonly id = "configured";
      readonly displayName = "Configured";
      async loadAuth(): Promise<ProviderAuth> { return {}; }
      async fetchProviderApi<T>(): Promise<ProviderResult<T>> {
        return { attempted: false, data: null, error: null };
      }
      async isConfigured(): Promise<boolean> { return true; }
      async cleanup(): Promise<void> { cleanupCalls.push("configured"); }
      async inspect(): Promise<Record<string, unknown>> { return {}; }
    })();
    const unconfigured = new (class implements Provider {
      readonly id = "unconfigured";
      readonly displayName = "Unconfigured";
      async loadAuth(): Promise<ProviderAuth> { return {}; }
      async fetchProviderApi<T>(): Promise<ProviderResult<T>> {
        return { attempted: false, data: null, error: null };
      }
      async isConfigured(): Promise<boolean> { return false; }
      async cleanup(): Promise<void> { cleanupCalls.push("unconfigured"); }
      async inspect(): Promise<Record<string, unknown>> { return {}; }
    })();
    registry.register(configured, unconfigured);
    await registry.startupAll({ plugin: {} as any });
    await registry.cleanupAll();
    expect(cleanupCalls).toEqual(["configured"]);
  });

  it("collectSetupCommands collects commands from all registered providers", () => {
    const registry = new ProviderRegistry();
    const provider1 = new (class implements Provider {
      readonly id = "p1";
      readonly displayName = "Provider 1";
      async loadAuth(): Promise<ProviderAuth> { return {}; }
      async fetchProviderApi<T>(): Promise<ProviderResult<T>> {
        return { attempted: false, data: null, error: null };
      }
      async isConfigured(): Promise<boolean> { return true; }
      async inspect(): Promise<Record<string, unknown>> { return {}; }
      setupCommand(): TuiCommand { return { namespace: "palette", name: "p1.cmd", title: "P1 Cmd", desc: "desc", category: "Cat", slashName: "p1_cmd", run: () => {} }; }
    })();
    const provider2 = new (class implements Provider {
      readonly id = "p2";
      readonly displayName = "Provider 2";
      async loadAuth(): Promise<ProviderAuth> { return {}; }
      async fetchProviderApi<T>(): Promise<ProviderResult<T>> {
        return { attempted: false, data: null, error: null };
      }
      async isConfigured(): Promise<boolean> { return false; }
      async inspect(): Promise<Record<string, unknown>> { return {}; }
      setupCommand(): TuiCommand { return { namespace: "palette", name: "p2.cmd", title: "P2 Cmd", desc: "desc", category: "Cat", slashName: "p2_cmd", run: () => {} }; }
    })();
    const provider3 = new (class implements Provider {
      readonly id = "p3";
      readonly displayName = "Provider 3";
      async loadAuth(): Promise<ProviderAuth> { return {}; }
      async fetchProviderApi<T>(): Promise<ProviderResult<T>> {
        return { attempted: false, data: null, error: null };
      }
      async isConfigured(): Promise<boolean> { return true; }
      async inspect(): Promise<Record<string, unknown>> { return {}; }
    })();
    registry.register(provider1, provider2, provider3);
    const commands = registry.collectSetupCommands({});
    expect(commands).toHaveLength(2);
    expect(commands[0].name).toBe("p1.cmd");
    expect(commands[1].name).toBe("p2.cmd");
  });
});
