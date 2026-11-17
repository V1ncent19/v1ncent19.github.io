export type TravelLogOrigin = { href: string; inHistory: boolean };

const HISTORY_KEY = "travelLogOrigin";
let pending: { trip: string; href: string; started: number } | null = null;

function routePath(url: URL) {
  return url.pathname.replace(/\/+$/, "") || "/";
}

function sameSiteOrigin(address: unknown, trip: string) {
  if (typeof address !== "string" || !address) return null;
  try {
    const url = new URL(address, window.location.href);
    if (url.origin === window.location.origin && !url.pathname.startsWith("//") && routePath(url) !== trip) {
      return url.pathname + url.search + url.hash;
    }
  } catch { /* optional referrer or history state */ }
  return null;
}

/** Record a same-tab link before Next adds the destination history entry. */
export function rememberTravelLogSource(href: string) {
  pending = null;
  if (!href.startsWith("/travel/")) return;
  const target = new URL(href, window.location.href);
  const trip = routePath(target);
  pending = target.origin === window.location.origin && trip !== "/travel/zh" && /^\/travel\/(?:zh\/)?[^/]+$/.test(trip)
    ? { trip, href: window.location.href, started: performance.now() }
    : null;
}

export function resolveTravelLogOrigin(): TravelLogOrigin | null {
  const trip = routePath(new URL(window.location.href));
  const { state } = window.history;
  const arrival = pending;
  pending = null;
  const source = arrival?.trip === trip && performance.now() - arrival.started < 30000
    ? sameSiteOrigin(arrival.href, trip) : null;
  if (source) {
    try {
      window.history.replaceState({ ...state, [HISTORY_KEY]: { trip, href: source } }, "");
    } catch { /* returning within this visit still works */ }
    return { href: source, inHistory: true };
  }
  const saved = state?.[HISTORY_KEY];
  const savedSource = saved?.trip === trip ? sameSiteOrigin(saved.href, trip) : null;
  if (savedSource) return { href: savedSource, inHistory: true };
  const [navigation] = performance.getEntriesByType("navigation");
  if (!navigation || routePath(new URL(navigation.name)) !== trip) return null;
  const referrer = sameSiteOrigin(document.referrer, trip);
  return referrer ? { href: referrer, inHistory: false } : null;
}
