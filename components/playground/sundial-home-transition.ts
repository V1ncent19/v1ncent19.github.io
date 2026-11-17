export function carrySundialLightToHome(onCancel: () => void) {
  const veil = document.createElement("div");
  veil.className = "sundial-home-veil";
  veil.setAttribute("aria-hidden", "true");

  const listeners = new AbortController();
  const { signal } = listeners;
  const timeout = window.setTimeout(cancel, 12000);

  function finish() {
    window.clearTimeout(timeout);
    listeners.abort();
    veil.remove();
  }

  function cancel() {
    finish();
    onCancel();
  }

  veil.addEventListener("animationend", finish, { once: true, signal });
  window.addEventListener("popstate", cancel, { signal });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) cancel();
  }, { signal });

  // The homepage starts fading this veil after its route content has arrived.
  document.body.append(veil);
}
