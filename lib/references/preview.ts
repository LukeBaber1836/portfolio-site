/**
 * Reference link previews. Screenshots are resolved once, server-side, when the
 * admin sends a link (Microlink API) and stored on the row — hover previews then
 * use the stored image, so they are instant and survive Microlink outages.
 */

export type LinkPreviewData = {
  title: string | null;
  screenshotUrl: string | null;
  faviconUrl: string | null;
};

/** Normalize user input to an absolute http(s) URL, or null when invalid. */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 2000) return null;
  if (/[\s<>]/.test(trimmed)) return null;
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  if (!host || host === "localhost" || host === "127.0.0.1" || host === "[::1]") return null;
  return parsed.toString();
}

export function faviconForUrl(url: string): string | null {
  try {
    return `https://www.google.com/s2/favicons?sz=64&domain=${new URL(url).hostname}`;
  } catch {
    return null;
  }
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** The project domain the portal hero shows: the featured one, else whichever URL is set. */
export function featuredSiteOf(p: { productionUrl: string | null; devUrl: string | null; featuredSite: "production" | "dev" }) {
  const prod = p.productionUrl ? { kind: "production" as const, url: p.productionUrl, label: "Live site" } : null;
  const dev = p.devUrl ? { kind: "dev" as const, url: p.devUrl, label: "Preview" } : null;
  return p.featuredSite === "dev" ? (dev ?? prod) : (prod ?? dev);
}

/**
 * Resolve a link's title + screenshot via Microlink. Never throws — any
 * failure (auth-walled staging link, rate limit, outage, timeout) yields
 * nulls and the card falls back to favicon + domain.
 */
export async function resolveLinkPreview(rawUrl: string): Promise<LinkPreviewData> {
  const url = normalizeUrl(rawUrl);
  const fallback: LinkPreviewData = { title: null, screenshotUrl: null, faviconUrl: url ? faviconForUrl(url) : null };
  if (!url) return { title: null, screenshotUrl: null, faviconUrl: null };
  try {
    const api = `https://api.microlink.io?${new URLSearchParams({ url, screenshot: "true", meta: "false" })}`;
    const res = await fetch(api, { signal: AbortSignal.timeout(9000) });
    if (!res.ok) return fallback;
    const json = (await res.json()) as {
      data?: { title?: unknown; screenshot?: { url?: unknown }; logo?: { url?: unknown } };
    };
    const data = json?.data ?? {};
    return {
      title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : null,
      screenshotUrl: typeof data.screenshot?.url === "string" ? data.screenshot.url : null,
      faviconUrl:
        typeof data.logo?.url === "string" && data.logo.url ? data.logo.url : fallback.faviconUrl,
    };
  } catch {
    return fallback;
  }
}
