/**
 * tests/http-fetch.test.ts - Tests for HTTP utilities
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { HttpError, fetchWithRetry, fetchJson } from "@/lib/http/index";

describe("HttpError", () => {
  it("sets name correctly", () => {
    const err = new HttpError(404, "Not Found", "https://api.example.com/test");
    expect(err.name).toBe("HttpError");
  });

  it("exposes status, body, url", () => {
    const err = new HttpError(500, "Internal Server Error", "https://api.example.com/test");
    expect(err.status).toBe(500);
    expect(err.body).toBe("Internal Server Error");
    expect(err.url).toBe("https://api.example.com/test");
  });

  it("isClientError is true for 4xx", () => {
    const err = new HttpError(400, "Bad Request", "https://api.example.com/test");
    expect(err.isClientError).toBe(true);
  });

  it("isClientError is false for 2xx", () => {
    const err = new HttpError(200, "OK", "https://api.example.com/test");
    expect(err.isClientError).toBe(false);
  });

  it("isServerError is true for 5xx", () => {
    const err = new HttpError(500, "Internal Server Error", "https://api.example.com/test");
    expect(err.isServerError).toBe(true);
  });

  it("isServerError is false for 4xx", () => {
    const err = new HttpError(404, "Not Found", "https://api.example.com/test");
    expect(err.isServerError).toBe(false);
  });

  it("isRateLimit is true for 429", () => {
    const err = new HttpError(429, "Too Many Requests", "https://api.example.com/test");
    expect(err.isRateLimit).toBe(true);
  });

  it("isUnauthorized is true for 401", () => {
    const err = new HttpError(401, "Unauthorized", "https://api.example.com/test");
    expect(err.isUnauthorized).toBe(true);
  });
});

describe("fetchWithRetry", () => {
  it("returns response on first attempt when ok", async () => {
    const response = { ok: true, text: () => Promise.resolve(""), json: () => Promise.resolve({}) };
    const mockFn = vi.fn().mockResolvedValue(response);

    const result = await fetchWithRetry(mockFn, { attempts: 1 });
    expect(result.ok).toBe(true);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 until success", async () => {
    const successResponse = { ok: true, text: () => Promise.resolve(""), json: () => Promise.resolve({}) };
    let callCount = 0;
    const mockFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: false, status: 429, text: () => Promise.resolve(""), json: () => Promise.resolve({}) });
      }
      return Promise.resolve(successResponse);
    });

    const result = await fetchWithRetry(mockFn, { attempts: 3, baseDelayMs: 0 });
    expect(result.ok).toBe(true);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it("retries on 5xx until success", async () => {
    const successResponse = { ok: true, text: () => Promise.resolve(""), json: () => Promise.resolve({}) };
    let callCount = 0;
    const mockFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: false, status: 502, text: () => Promise.resolve(""), json: () => Promise.resolve({}) });
      }
      return Promise.resolve(successResponse);
    });

    const result = await fetchWithRetry(mockFn, { attempts: 3, baseDelayMs: 0 });
    expect(result.ok).toBe(true);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 403 (non-429 4xx)", async () => {
    const mockFn = vi.fn().mockResolvedValue({
      ok: false, status: 403, text: () => Promise.resolve(""), json: () => Promise.resolve({})
    });

    const result = await fetchWithRetry(mockFn, { attempts: 3, baseDelayMs: 0 });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("retries on TypeError (network error) until success", async () => {
    const successResponse = { ok: true, text: () => Promise.resolve(""), json: () => Promise.resolve({}) };
    let callCount = 0;
    const mockFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new TypeError("Network error");
      }
      return Promise.resolve(successResponse);
    });

    const result = await fetchWithRetry(mockFn, { attempts: 3, baseDelayMs: 0 });
    expect(result.ok).toBe(true);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it("retries on HttpError 5xx until success", async () => {
    const successResponse = { ok: true, text: () => Promise.resolve(""), json: () => Promise.resolve({}) };
    let callCount = 0;
    const mockFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new HttpError(502, "Bad Gateway", "https://api.example.com/test");
      }
      return Promise.resolve(successResponse);
    });

    const result = await fetchWithRetry(mockFn, { attempts: 3, baseDelayMs: 0 });
    expect(result.ok).toBe(true);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it("does not retry on HttpError 4xx (except 429)", async () => {
    const mockFn = vi.fn().mockRejectedValue(new HttpError(403, "Forbidden", "https://api.example.com/test"));

    await expect(fetchWithRetry(mockFn, { attempts: 3, baseDelayMs: 0 })).rejects.toBeDefined();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("exhausts all attempts and throws last error", async () => {
    const mockFn = vi.fn().mockRejectedValue(new TypeError("Network error"));

    await expect(
      fetchWithRetry(mockFn, { attempts: 3, baseDelayMs: 0 }),
    ).rejects.toBeDefined();
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it("uses custom shouldRetry", async () => {
    const successResponse = { ok: true, text: () => Promise.resolve(""), json: () => Promise.resolve({}) };
    let callCount = 0;
    const mockFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: false, status: 400, text: () => Promise.resolve(""), json: () => Promise.resolve({}) });
      }
      return Promise.resolve(successResponse);
    });

    const result = await fetchWithRetry(mockFn, {
      attempts: 3,
      baseDelayMs: 0,
      shouldRetry: (err) => {
        if (err instanceof HttpError && err.status === 400) return true;
        return false;
      },
    });
    expect(result.ok).toBe(true);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});

describe("fetchJson", () => {
  it("returns parsed body on 2xx", async () => {
    const expected = { key: "value", count: 42 };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(expected)),
      json: () => Promise.resolve(expected),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchJson<{ key: string; count: number }>("https://api.example.com/test", {});
    expect(result).toEqual(expected);
    vi.unstubAllGlobals();
  });

  it("throws HttpError on 4xx", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(fetchJson("https://api.example.com/test", {})).rejects.toThrow(HttpError);
    await expect(fetchJson("https://api.example.com/test", {})).rejects.toMatchObject({ status: 401 });
    vi.unstubAllGlobals();
  });
});
