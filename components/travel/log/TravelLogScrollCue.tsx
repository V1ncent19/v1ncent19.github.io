import type { LogLang } from "@/lib/travel/log/types";

/** One opening-screen reading affordance for all travel-log variants. */
export default function TravelLogScrollCue({ lang }: { lang: LogLang }) {
  return <div className="travel-log-scroll-cue">
    <p className="travel-log-scroll-copy">
      {lang === "zh"
        ? "向下滚动，沿着这条路线开始这趟旅程，一路读下去。"
        : "Scroll the journal to start the trip and read the story."}
    </p>
    <div className="travel-log-scroll-motion" aria-hidden="true">
      <span className="travel-log-scroll-chevrons">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 8 6 6 6-6" />
        </svg>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 8 6 6 6-6" />
        </svg>
      </span>
      <span className="travel-log-scroll-label">{lang === "zh" ? "向下滚动" : "Scroll to read"}</span>
    </div>
  </div>;
}
