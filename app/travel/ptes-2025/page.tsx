import type { Metadata } from "next";
import TravelLog from "@/components/travel/TravelLog";

export const metadata: Metadata = { title: "Iberia 2025 — Portugal · Spain · Christmas" };

export default function Ptes2025Page() {
  return (
    <>
      {/*
        First-paint immersive (2026-09-26): TravelLog adds body.tl-immersive in
        a hydration-time effect, but the static export ships visible site
        chrome in the HTML — without this inline script (runs at parse time,
        before first paint) the header/footer flash for a frame on entry.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            'try{if(document.body){document.body.classList.add("tl-immersive");'
            + 'if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)'
            + 'document.body.classList.add("tl-veil-boot");}}catch(e){}',
        }}
      />
      {/*
        v11 entry veil (2026-09-28): tl-veil-boot paints the entry curtain via
        a body::before pseudo-element (globals.css). A CLASS is hydration-safe
        (tl-immersive precedent); a real DOM node appended pre-paint breaks
        React 19 hydration (#418 -> client re-render -> node deleted, seen in
        the v11 diag probe). TravelLog adds .tl-veil-open once data + map are
        ready; the retract animation's end then removes both classes.
      */}
      <TravelLog tripId="ptes-2025" backHref="/travel" backLabel="Back to Travel" />
    </>
  );
}
