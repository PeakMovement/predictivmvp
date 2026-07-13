import { lazy, type ComponentType } from "react";

/**
 * Like React.lazy, but recovers from stale-chunk failures. After a new deploy,
 * the browser may hold references to old chunk filenames; a dynamic import then
 * throws (ChunkLoadError) and white-screens the app. On the first such failure
 * we reload once to fetch the fresh manifest. A successful load clears the flag
 * so genuine, persistent errors still surface.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  const RELOAD_KEY = "pv_chunk_reloaded";
  return lazy(async () => {
    try {
      const mod = await factory();
      try { window.sessionStorage.removeItem(RELOAD_KEY); } catch { /* ignore */ }
      return mod;
    } catch (err) {
      let alreadyReloaded = false;
      try { alreadyReloaded = window.sessionStorage.getItem(RELOAD_KEY) === "1"; } catch { /* ignore */ }
      if (!alreadyReloaded) {
        try { window.sessionStorage.setItem(RELOAD_KEY, "1"); } catch { /* ignore */ }
        window.location.reload();
        // Hold the import open while the page reloads.
        return await new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}
