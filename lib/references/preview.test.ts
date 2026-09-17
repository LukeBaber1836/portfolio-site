import { afterEach, describe, expect, it, vi } from "vitest";

import { faviconForUrl, hostOf, normalizeUrl, resolveLinkPreview } from "./preview";

describe("normalizeUrl", () => {
  it("adds https:// when no scheme is present", () => {
    expect(normalizeUrl("example.com/work")).toBe("https://example.com/work");
  });

  it("keeps explicit http and https URLs", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com/");
    expect(normalizeUrl("https://example.com/a?b=c")).toBe("https://example.com/a?b=c");
  });

  it("trims whitespace", () => {
    expect(normalizeUrl("  example.com  ")).toBe("https://example.com/");
  });

  it("rejects non-http schemes, garbage, and local hosts", () => {
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
    expect(normalizeUrl("ftp://example.com")).toBeNull();
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("http://localhost:3000/x")).toBeNull();
    expect(normalizeUrl("http://127.0.0.1/x")).toBeNull();
  });
});

describe("faviconForUrl / hostOf", () => {
  it("builds a Google S2 favicon URL from the domain", () => {
    expect(faviconForUrl("https://example.com/a?b=c")).toBe("https://www.google.com/s2/favicons?sz=64&domain=example.com");
    expect(faviconForUrl("garbage")).toBeNull();
  });

  it("extracts the hostname", () => {
    expect(hostOf("https://sub.example.com/x")).toBe("sub.example.com");
    expect(hostOf("garbage")).toBeNull();
  });
});

describe("resolveLinkPreview", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns title, screenshot, and logo from Microlink", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              title: "Example Studio",
              screenshot: { url: "https://cdn.example/shot.png" },
              logo: { url: "https://example.com/logo.png" },
            },
          }),
      }),
    );
    const result = await resolveLinkPreview("example.com");
    expect(result).toEqual({
      title: "Example Studio",
      screenshotUrl: "https://cdn.example/shot.png",
      faviconUrl: "https://example.com/logo.png",
    });
  });

  it("falls back to the S2 favicon when Microlink has no data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
    const result = await resolveLinkPreview("example.com");
    expect(result.title).toBeNull();
    expect(result.screenshotUrl).toBeNull();
    expect(result.faviconUrl).toBe("https://www.google.com/s2/favicons?sz=64&domain=example.com");
  });

  it("never throws on HTTP errors or timeouts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    expect((await resolveLinkPreview("example.com")).screenshotUrl).toBeNull();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Timeout", "TimeoutError")),
    );
    expect((await resolveLinkPreview("example.com")).screenshotUrl).toBeNull();
  });
});
