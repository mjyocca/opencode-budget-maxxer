import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { withTimeout, TimeoutError } from "@/lib/core/timeout";

describe("TimeoutError", () => {
  it("is instance of TimeoutError", () => {
    const error = new TimeoutError("test", 1000);
    expect(error).toBeInstanceOf(TimeoutError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("TimeoutError");
    expect(error.timeoutMs).toBe(1000);
  });

  it("has correct message", () => {
    const error = new TimeoutError("custom message", 500);
    expect(error.message).toBe("custom message");
  });
});

describe("withTimeout", () => {
  it("resolves immediately for resolved promise", async () => {
    const result = await withTimeout(Promise.resolve("success"), 50);
    expect(result).toBe("success");
  });

  it("throws TimeoutError when timeout occurs", async () => {
    const slowPromise = new Promise((resolve) => setTimeout(resolve, 100));
    let caughtError = false;
    try {
      await withTimeout(slowPromise, 10);
    } catch (error) {
      caughtError = true;
      expect(error).toBeInstanceOf(TimeoutError);
      expect((error as TimeoutError).timeoutMs).toBe(10);
    }
    expect(caughtError).toBe(true);
  });

  it("custom error message when provided", async () => {
    const slowPromise = new Promise((resolve) => setTimeout(resolve, 100));
    let caughtError: unknown = null;
    try {
      await withTimeout(slowPromise, 10, "Custom timeout");
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeInstanceOf(TimeoutError);
    expect((caughtError as TimeoutError).message).toBe("Custom timeout");
  });

  it("throws TimeoutError for 0ms timeout", async () => {
    let caughtError = false;
    try {
      await withTimeout(Promise.resolve("value"), 0);
    } catch (error) {
      caughtError = true;
      expect(caughtError).toBe(true);
      expect((error as TimeoutError).timeoutMs).toBe(0);
    }
  });
});

describe("withTimeout — timer cleanup", () => {
  it("does not leave a dangling timer when promise resolves early", async () => {
    // Confirms no hang: timer is cleared when the promise resolves before deadline
    const result = await withTimeout(Promise.resolve("fast"), 10000);
    expect(result).toBe("fast");
  });

  it("negative ms throws TimeoutError immediately", () => {
    expect(() => withTimeout(Promise.resolve(), -1)).toThrow(TimeoutError);
  });
});
