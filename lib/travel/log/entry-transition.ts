"use client";

let cancelLaunch: (() => void) | null = null;

/** Keep the source covered until the destination's pre-paint curtain takes over. */
export function beginTravelEntry() {
  clearTravelEntry();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const body = document.body;
  body.classList.add("travel-log-launch");
  const cancel = () => {
    body.classList.remove("travel-log-launch");
    window.clearTimeout(timer);
    window.removeEventListener("popstate", cancel);
    window.removeEventListener("pageshow", cancel);
    if (cancelLaunch === cancel) cancelLaunch = null;
  };
  cancelLaunch = cancel;
  window.addEventListener("popstate", cancel);
  window.addEventListener("pageshow", cancel);
  // A failed/cancelled route must never leave the source hidden indefinitely.
  const timer = window.setTimeout(cancel, 6000);
}

export function clearTravelEntry() {
  cancelLaunch?.();
}
