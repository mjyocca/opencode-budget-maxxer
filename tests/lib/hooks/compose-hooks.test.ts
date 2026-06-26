import { describe, expect, it } from "vitest";
import { composeHooks } from "@/lib/hooks/compose";

describe("composeHooks", () => {
  it("merges disjoint hooks", () => {
    const result = composeHooks(
      { event: async () => {} },
      { dispose: async () => {} },
    ) as any;
    expect(result.event).toBeDefined();
    expect(result.dispose).toBeDefined();
  });

  it("merges tool registrations", () => {
    const toolA = { a: async () => {} } as any;
    const toolB = { b: async () => {} } as any;
    const result = composeHooks({ tool: toolA }, { tool: toolB }) as any;
    expect(result.tool).toBeDefined();
    expect(Object.keys(result.tool)).toHaveLength(2);
  });

  it("skips undefined values", () => {
    const result = composeHooks({ event: undefined as any });
    expect(result.event).toBeUndefined();
  });

  it("handles empty parts", () => {
    const result = composeHooks();
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("handles null parts", () => {
    const result = composeHooks(null as any);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("chains multiple event handlers in registration order", async () => {
    const order: number[] = [];
    const h1 = async () => { order.push(1); };
    const h2 = async () => { order.push(2); };
    const result = composeHooks({ event: h1 }, { event: h2 }) as any;
    await result?.event({ event: { type: "test" } });
    expect(order).toEqual([1, 2]);
  });

  it("produces a single composed event fn when multiple handlers registered", () => {
    const result = composeHooks(
      { event: async () => {} },
      { event: async () => {} },
    );
    expect(result.event).toBeDefined();
    expect(typeof result.event).toBe("function");
  });

  it("event: all handlers run even if one throws (fire-all)", async () => {
    const order: number[] = [];
    const h1 = async () => {
      order.push(1);
      throw new Error("boom");
    };
    const h2 = async () => {
      order.push(2);
    };
    const result = composeHooks({ event: h1 }, { event: h2 }) as any;
    await expect(result.event?.({ event: { type: "test" } })).rejects.toThrow(
      "boom",
    );
    expect(order).toEqual([1, 2]);
  });

  it("event: multiple errors thrown as AggregateError", async () => {
    const h1 = async () => { throw new Error("first"); };
    const h2 = async () => { throw new Error("second"); };
    const result = composeHooks({ event: h1 }, { event: h2 }) as any;
    await expect(result.event?.({ event: { type: "test" } })).rejects.toThrow(
      "Multiple event handlers failed",
    );
  });

  it("event: single error re-thrown directly (not wrapped)", async () => {
    const original = new Error("original error");
    const h1 = async () => { throw original; };
    const result = composeHooks({ event: h1 }) as any;
    let caught: unknown;
    try {
      await result.event?.({ event: { type: "test" } });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBe(original);
  });

  it("chains multiple dispose handlers in registration order", async () => {
    const order: number[] = [];
    const h1 = async () => { order.push(1); };
    const h2 = async () => { order.push(2); };
    const result = composeHooks({ dispose: h1 }, { dispose: h2 });
    await result.dispose?.();
    expect(order).toEqual([1, 2]);
  });

  it("dispose: all handlers run even if one throws (fire-all)", async () => {
    const order: number[] = [];
    const h1 = async () => {
      order.push(1);
      throw new Error("boom");
    };
    const h2 = async () => {
      order.push(2);
    };
    const result = composeHooks({ dispose: h1 }, { dispose: h2 });
    await expect(result.dispose?.()).rejects.toThrow("boom");
    expect(order).toEqual([1, 2]);
  });

  it("dispose: multiple errors thrown as AggregateError", async () => {
    const h1 = async () => { throw new Error("first"); };
    const h2 = async () => { throw new Error("second"); };
    const result = composeHooks({ dispose: h1 }, { dispose: h2 });
    await expect(result.dispose?.()).rejects.toThrow(
      "Multiple dispose handlers failed",
    );
  });

  it("dispose: single error re-thrown directly (not wrapped)", async () => {
    const original = new Error("original error");
    const h1 = async () => { throw original; };
    const result = composeHooks({ dispose: h1 });
    let caught: unknown;
    try {
      await result.dispose?.();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBe(original);
  });

  // ── trigger fan-out hooks ──────────────────────────

  it("fan-out: multiple chat.params hooks run sequentially", async () => {
    const order: string[] = [];
    const h1 = async (_i: any, _o: any) => { order.push("h1"); };
    const h2 = async (_i: any, _o: any) => { order.push("h2"); };
    const result = composeHooks({ "chat.params": h1 }, { "chat.params": h2 });
    await (result as any)["chat.params"]?.({}, {});
    expect(order).toEqual(["h1", "h2"]);
  });

  it("fan-out: multiple chat.headers hooks run sequentially", async () => {
    const order: string[] = [];
    const h1 = async (_i: any, _o: any) => { order.push("h1"); };
    const h2 = async (_i: any, _o: any) => { order.push("h2"); };
    const result = composeHooks({ "chat.headers": h1 }, { "chat.headers": h2 });
    await (result as any)["chat.headers"]?.({}, {});
    expect(order).toEqual(["h1", "h2"]);
  });

  it("fan-out: config collects and runs multiple handlers", async () => {
    const order: string[] = [];
    const h1 = async (cfg: any) => { order.push("h1:" + cfg._); };
    const h2 = async (cfg: any) => { order.push("h2:" + cfg._); };
    const result = composeHooks({ config: h1 }, { config: h2 });
    await (result as any).config?.({ _: "x" });
    expect(order).toEqual(["h1:x", "h2:x"]);
  });

  it("config: all handlers run even if one throws (fire-all)", async () => {
    const order: string[] = [];
    const h1 = async () => {
      order.push("h1");
      throw new Error("boom");
    };
    const h2 = async () => {
      order.push("h2");
    };
    const result = composeHooks({ config: h1 }, { config: h2 });
    await expect((result as any).config?.({ _: "x" })).rejects.toThrow("boom");
    expect(order).toEqual(["h1", "h2"]);
  });

  // ── classify() — pipeline default ──────────────────

  it("pipeline: permission.ask runs both handlers sequentially", async () => {
    const order: string[] = [];
    const h1 = async (_i: any, o: any) => { order.push("h1"); };
    const h2 = async (_i: any, o: any) => { order.push("h2"); };
    const result = composeHooks(
      { "permission.ask": h1 },
      { "permission.ask": h2 },
    ) as any;
    await result["permission.ask"]?.({}, { status: "ask" });
    expect(order).toEqual(["h1", "h2"]);
  });

  it("pipeline: unknown future hook keys get pipeline treatment by default", async () => {
    // Verifies that new opencode hooks added in future SDK versions are
    // automatically classified as pipeline without any code changes here.
    const order: string[] = [];
    const h1 = async (_i: any, _o: any) => { order.push("h1"); };
    const h2 = async (_i: any, _o: any) => { order.push("h2"); };
    const result = composeHooks(
      { "future.hook": h1 } as any,
      { "future.hook": h2 } as any,
    ) as any;
    await result["future.hook"]?.({}, {});
    expect(order).toEqual(["h1", "h2"]);
  });
});
