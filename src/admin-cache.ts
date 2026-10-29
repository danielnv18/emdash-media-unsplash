import type { MediaListResult } from "emdash/media";
import { isUnsplashImageUrl } from "./utils/urls.js";

/** The first instant after 23:59 in the browser's current timezone, including DST. */
export function unsplashAdminCacheExpiresAt(timestamp = Date.now()): number {
  const date = new Date(timestamp);
  date.setHours(24, 0, 0, 0);
  return date.getTime();
}

export const unsplashAdminQueryCacheOptions = {
  staleTime: (query: { state: { dataUpdatedAt: number } }) => {
    const timestamp = query.state.dataUpdatedAt;
    return timestamp ? unsplashAdminCacheExpiresAt(timestamp) - timestamp : 0;
  },
  refetchOnWindowFocus: true,
  refetchInterval: () => Math.max(1000, unsplashAdminCacheExpiresAt() - Date.now()),
};
const STORAGE_KEY = "emdash:unsplash:admin-results:v1";
const MAX_PAGES = 40;
const MAX_STORAGE_CHARS = 1_000_000;

interface CachedPage {
  expires: number;
  touched: number;
  result: MediaListResult;
}

/** Public photo metadata only; credentials and content drafts never enter this cache. */
export function createUnsplashAdminCache(options: {
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  now?: () => number;
} = {}) {
  const now = options.now ?? Date.now;
  const pages = new Map<string, CachedPage>();
  const pending = new Map<string, Promise<MediaListResult>>();
  let initialized = false;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  const storage = () => {
    try { return options.storage ?? (typeof window !== "undefined" ? window.localStorage : undefined); }
    catch { return undefined; }
  };
  const prune = () => {
    const endOfDay = unsplashAdminCacheExpiresAt(now());
    for (const [key, page] of pages) if (page.expires <= now() || page.expires !== endOfDay) pages.delete(key);
    while (pages.size > MAX_PAGES) {
      const oldest = [...pages].sort((a, b) => a[1].touched - b[1].touched)[0];
      pages.delete(oldest[0]);
    }
  };
  const persist = () => {
    prune();
    let encoded = JSON.stringify([...pages]);
    while (encoded.length > MAX_STORAGE_CHARS && pages.size) {
      const oldest = [...pages].sort((a, b) => a[1].touched - b[1].touched)[0];
      pages.delete(oldest[0]);
      encoded = JSON.stringify([...pages]);
    }
    try {
      if (pages.size) storage()?.setItem(STORAGE_KEY, encoded);
      else storage()?.removeItem(STORAGE_KEY);
    } catch { /* Browsing still works when storage is full or disabled. */ }
    if (expiryTimer !== undefined) clearTimeout(expiryTimer);
    if (pages.size && typeof window !== "undefined") {
      expiryTimer = setTimeout(() => { expiryTimer = undefined; persist(); }, Math.max(1, unsplashAdminCacheExpiresAt(now()) - now()));
    }
  };
  const initialize = () => {
    if (initialized) return;
    initialized = true;
    try {
      const encoded = storage()?.getItem(STORAGE_KEY);
      if (!encoded || encoded.length > MAX_STORAGE_CHARS) return;
      const records: unknown = JSON.parse(encoded);
      if (!Array.isArray(records)) return;
      for (const record of records) {
        if (!Array.isArray(record) || record.length !== 2 || typeof record[0] !== "string") continue;
        const page = record[1] as CachedPage | undefined;
        if (!page || !Number.isFinite(page.expires) || !Number.isFinite(page.touched) || page.expires <= now() || page.expires !== unsplashAdminCacheExpiresAt(now())) continue;
        if (!page.result || !Array.isArray(page.result.items) || page.result.items.length > 30) continue;
        if (!page.result.items.every((item) => item && typeof item.id === "string" && typeof item.filename === "string" && typeof item.mimeType === "string" && isUnsplashImageUrl(item.previewUrl))) continue;
        pages.set(record[0], page);
      }
      prune();
      persist();
    } catch { /* Corrupt or unavailable browser storage is a cache miss. */ }
  };
  return {
    async get(key: string, load: () => Promise<MediaListResult>): Promise<MediaListResult> {
      initialize();
      const previousSize = pages.size;
      prune();
      if (pages.size !== previousSize) persist();
      const page = pages.get(key);
      if (page) {
        page.touched = now();
        persist();
        return structuredClone(page.result);
      }
      const existing = pending.get(key);
      if (existing) return structuredClone(await existing);
      const request = Promise.resolve().then(load).then((result) => {
        // Cache successes only, including empty searches. Failed requests remain retryable.
        pages.set(key, { expires: unsplashAdminCacheExpiresAt(now()), touched: now(), result: structuredClone(result) });
        persist();
        return result;
      }).finally(() => pending.delete(key));
      pending.set(key, request);
      return structuredClone(await request);
    },
  };
}

const resultsCache = createUnsplashAdminCache();

/** Prime the normal HTTP image cache using the exact hotlinked thumbnail URLs. */
export function createUnsplashPreviewPreloader(request: typeof fetch = fetch, now = Date.now) {
  const ready = new Map<string, number>();
  const queued = new Set<string>();
  const queue: string[] = [];
  let active = 0;
  const drain = () => {
    while (active < 4 && queue.length) {
      const url = queue.shift()!;
      active++;
      // no-cors matches a normal cross-origin img request; no Blob URLs or local media copies.
      Promise.resolve().then(() => request.call(globalThis, url, {
        mode: "no-cors", credentials: "omit", cache: "force-cache", signal: AbortSignal.timeout(15_000),
      })).then((response) => {
        if (response.ok || response.type === "opaque") {
          ready.delete(url);
          ready.set(url, unsplashAdminCacheExpiresAt(now()));
          while (ready.size > 500) ready.delete(ready.keys().next().value!);
        }
      }).catch(() => { /* A failed prefetch never prevents the normal img from loading. */ }).finally(() => {
        active--;
        queued.delete(url);
        drain();
      });
    }
  };
  return (result: MediaListResult) => {
    for (const item of result.items) {
      const url = item.previewUrl;
      if (!isUnsplashImageUrl(url) || ready.get(url) === unsplashAdminCacheExpiresAt(now()) || queued.has(url)) continue;
      if (queue.length >= 120) break;
      queued.add(url);
      queue.push(url);
    }
    drain();
  };
}

const preload = createUnsplashPreviewPreloader();

export async function cachedUnsplashAdminResults(key: string, load: () => Promise<MediaListResult>) {
  // Imported by the admin bundle only. SSR must not share browser-local results between users.
  if (typeof window === "undefined") return load();
  const result = await resultsCache.get(key, load);
  preload(result);
  return result;
}
