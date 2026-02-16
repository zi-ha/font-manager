import { readFontFileBase64 } from "@/lib/tauri";

const MAX_CACHE = 50;
const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();
const prefetchTimers = new Map<string, number>();

function touch(key: string) {
  const v = cache.get(key);
  if (v == null) return;
  cache.delete(key);
  cache.set(key, v);
}

function evictIfNeeded() {
  while (cache.size > MAX_CACHE) {
    const first = cache.keys().next().value as string | undefined;
    if (!first) return;
    cache.delete(first);
  }
}

export async function getFontPreviewSrc(path: string): Promise<string> {
  const cached = cache.get(path);
  if (cached) {
    touch(path);
    return cached;
  }

  const existing = inflight.get(path);
  if (existing) return existing;

  const p = (async () => {
    const { base64, mime } = await readFontFileBase64(path);
    const src = `data:${mime};base64,${base64}`;
    cache.set(path, src);
    evictIfNeeded();
    return src;
  })();

  inflight.set(path, p);
  try {
    return await p;
  } finally {
    inflight.delete(path);
  }
}

export function prefetchFontPreviewSrc(path: string) {
  if (cache.has(path) || inflight.has(path)) return;
  if (typeof window === "undefined") return;

  const existing = prefetchTimers.get(path);
  if (existing) window.clearTimeout(existing);

  const id = window.setTimeout(() => {
    prefetchTimers.delete(path);
    void getFontPreviewSrc(path).catch(() => {});
  }, 120);

  prefetchTimers.set(path, id);
}
