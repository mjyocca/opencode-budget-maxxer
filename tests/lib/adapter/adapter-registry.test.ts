import { describe, expect, it } from "vitest";
import { AdapterRegistry } from "@/lib/adapter/registry";

class MockAdapter {
  readonly id = "mock";
  readonly displayName = "Mock Adapter";
  async loadAuth() { return {}; }
}

describe("AdapterRegistry", () => {
  it("register adds adapter by id", () => {
    const registry = new AdapterRegistry();
    registry.register(new MockAdapter());
    expect(registry.ids()).toContain("mock");
  });

  it("get returns adapter by id", () => {
    const registry = new AdapterRegistry();
    const adapter = new MockAdapter();
    registry.register(adapter);
    expect(registry.get("mock")).toBe(adapter);
  });

  it("get returns null for unknown id", () => {
    const registry = new AdapterRegistry();
    expect(registry.get("unknown")).toBeNull();
  });

  it("all returns all registered adapters", () => {
    const registry = new AdapterRegistry();
    const a1 = new MockAdapter();
    registry.register(a1);
    expect(registry.all()).toEqual([a1]);
  });

  it("ids returns all registered ids", () => {
    const registry = new AdapterRegistry();
    const a1 = new MockAdapter();
    const a2 = new (class { readonly id = "other"; readonly displayName = "Other"; loadAuth() { return Promise.resolve({}); } })();
    registry.register(a1, a2);
    expect(registry.ids()).toContain("mock");
    expect(registry.ids()).toContain("other");
  });

  it("register is fluent (returns this)", () => {
    const registry = new AdapterRegistry();
    const result = registry.register(new MockAdapter());
    expect(result).toBe(registry);
  });

  it("register overwrites on duplicate id", () => {
    const registry = new AdapterRegistry();
    const a1 = new MockAdapter();
    const a2 = new (class { readonly id = "mock"; readonly displayName = "Other"; loadAuth() { return Promise.resolve({}); } })();
    registry.register(a1);
    registry.register(a2);
    expect(registry.get("mock")).toBe(a2);
  });
});
