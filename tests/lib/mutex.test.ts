import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Mutex } from "@/lib/core/mutex";

describe("Mutex", () => {
  it("is locked after acquire", async () => {
    const mutex = new Mutex();
    expect(mutex.isLocked()).toBe(false);
    await mutex.acquire();
    expect(mutex.isLocked()).toBe(true);
    mutex.release();
  });

  it("is unlocked after release", async () => {
    const mutex = new Mutex();
    await mutex.acquire();
    mutex.release();
    expect(mutex.isLocked()).toBe(false);
  });

  it("runExclusive acquires and releases", async () => {
    const mutex = new Mutex();
    expect(mutex.isLocked()).toBe(false);
    await mutex.runExclusive(async () => {
      expect(mutex.isLocked()).toBe(true);
    });
    expect(mutex.isLocked()).toBe(false);
  });

  it("runExclusive returns result", async () => {
    const mutex = new Mutex();
    const result = await mutex.runExclusive(async () => {
      return "success";
    });
    expect(result).toBe("success");
  });

  it("runExclusive handles errors gracefully", async () => {
    const mutex = new Mutex();
    let caughtError: unknown = null;
    try {
      await mutex.runExclusive(async () => {
        throw new Error("test error");
      });
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe("test error");
    expect(mutex.isLocked()).toBe(false);
  });

  it("mutex is fair (FIFO)", async () => {
    const mutex = new Mutex();
    const order: string[] = [];

    const acquireAndRelease = (name: string) =>
      mutex.runExclusive(() => {
        order.push(name);
        return Promise.resolve();
      });

    await acquireAndRelease("first");
    await acquireAndRelease("second");
    expect(order).toEqual(["first", "second"]);
  });

  it("concurrent calls are serialized", async () => {
    const mutex = new Mutex();
    const order: string[] = [];

    const promises = [
      mutex.runExclusive(() => {
        order.push("a");
        return Promise.resolve();
      }),
      mutex.runExclusive(() => {
        order.push("b");
        return Promise.resolve();
      }),
    ];

    await Promise.all(promises);
    expect(order).toEqual(["a", "b"]);
  });

  it("isLocked returns correct state", async () => {
    const mutex = new Mutex();
    expect(mutex.isLocked()).toBe(false);
    await mutex.acquire();
    expect(mutex.isLocked()).toBe(true);
    mutex.release();
    expect(mutex.isLocked()).toBe(false);
  });
});

describe("Mutex — queue behavior", () => {
  it("queue entries are resolved in FIFO order under load", async () => {
    const mutex = new Mutex();
    const order: number[] = [];

    await mutex.acquire(); // hold the lock

    const p1 = mutex.acquire().then(() => {
      order.push(1);
      mutex.release();
    });
    const p2 = mutex.acquire().then(() => {
      order.push(2);
      mutex.release();
    });
    const p3 = mutex.acquire().then(() => {
      order.push(3);
      mutex.release();
    });

    mutex.release(); // start the chain
    await Promise.all([p1, p2, p3]);
    expect(order).toEqual([1, 2, 3]);
  });
});
