"use client";

import { Fragment, useEffect, useMemo } from "react";
import type { TravelScene, TripInfo } from "@/lib/travel/types";
import TravelNav from "./TravelNav";

function timeRange(s: TravelScene): string {
  return `${s.startTime.slice(11, 16)} – ${s.endTime.slice(11, 16)}`;
}

function SegmentChip({ segment }: { segment: string }) {
  if (segment === "day" || segment === "title") return null;
  return <span className={`chip chip-${segment}`}>{segment}</span>;
}

const NIGHT_GAP_MS = 6 * 3_600_000; // >6h between scenes = an overnight stay

export default function TravelStory({
  trip,
  scenes,
  registerSection,
  activeSceneId,
}: {
  trip: TripInfo;
  scenes: TravelScene[];
  registerSection: (id: string, el: HTMLElement | null) => void;
  activeSceneId: string;
}) {
  // A (lit capsule): highlight when any unit of the day is active
  const activeDayNo = useMemo(() => {
    const m = activeSceneId.match(/^d(\d+)-/);
    return m ? +m[1] : -1;
  }, [activeSceneId]);

  // click a capsule to jump to its day, aligned like the nav drawer
  const jumpToDay = (no: number) => {
    const el = document.querySelector(`[data-scene-id="d${no}-0"]`);
    const target = el
      ? el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.475 + 4
      : 0;
    window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  };

  // B (day-progress fill): driven straight off the narrative spring
  // (window.__ttime, written by useStoryController) with direct CSS-var
  // writes — the story pane never re-renders on narrative time
  useEffect(() => {
    const ranges = new Map<number, [number, number]>();
    for (const s of scenes) {
      const no = s.dayNo ?? -1;
      if (no < 0) continue;
      const t0 = Date.parse(s.startTime);
      const t1 = Date.parse(s.endTime);
      if (!Number.isFinite(t0) || !Number.isFinite(t1)) continue;
      const r = ranges.get(no);
      if (r) {
        r[0] = Math.min(r[0], t0);
        r[1] = Math.max(r[1], t1);
      } else {
        ranges.set(no, [t0, t1]);
      }
    }
    let raf = 0;
    const step = () => {
      const t = (window as unknown as Record<string, unknown>).__ttime;
      if (typeof t === "number") {
        document.querySelectorAll<HTMLElement>(".day-capsule[data-day-no]").forEach((el) => {
          const r = ranges.get(Number(el.dataset.dayNo));
          if (!r || r[1] <= r[0]) return;
          const f = Math.max(0, Math.min(1, (t - r[0]) / (r[1] - r[0])));
          el.style.setProperty("--fill", (f * 100).toFixed(1) + "%");
          el.classList.toggle("done", f >= 0.999); // read days fade to gray
        });
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [scenes]);

  // Pinned detection (2026-09-28 user request): the ACTIVE day capsule must
  // only grow/overhang once it is actually stuck at its sticky top — while it
  // still travels mid-viewport it just lights up, so it can never reach into
  // the progress rail's lane. A sticky element is pinned when its rect.top
  // equals its computed sticky `top`. v10 (2026-09-28): the test is an
  // EXACT match (±2px), not "top at or above the threshold" — the old
  // one-sided test kept past capsules "pinned" forever while the next block
  // pushed them out, so a deactivated capsule could never shorten again.
  // With the exact test the capsule only lengthens while truly stuck and
  // shrinks the moment the next day block pushes it off (user: "保持加长
  // 直到被自然顶掉才变短"). Toggling on the .day-block wrapper lets BOTH
  // the capsule and its scene sections react (spine alignment follows).
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const blocks = document.querySelectorAll<HTMLElement>(".day-block");
      let stickyTop = NaN;
      for (const block of Array.from(blocks)) {
        const cap = block.querySelector<HTMLElement>(".day-capsule");
        if (!cap) continue;
        if (Number.isNaN(stickyTop)) {
          stickyTop = parseFloat(getComputedStyle(cap).top) || 0;
        }
        const capTop = cap.getBoundingClientRect().top;
        block.classList.toggle("pinned", Math.abs(capTop - stickyTop) <= 2);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // scenes grouped per day: the capsule is a sticky header spanning its whole
  // day block — it stays pinned under the trip progress bar until the next
  // day's block pushes it out (sticky's containing block = the day block)
  const dayGroups: { day: string; items: TravelScene[] }[] = [];
  for (const s of scenes) {
    const g = dayGroups[dayGroups.length - 1];
    if (g && g.day === s.day) g.items.push(s);
    else dayGroups.push({ day: s.day, items: [s] });
  }
  let prevEnd: string | null = null;
  let prevUnit: string | null = null;

  // v12 (2026-09-28 user request): night dividers between day groups render
  // at the END of the PREVIOUS group's block — visual order is unchanged
  // (night passes, then the next capsule arrives), but the previous day's
  // sticky capsule now keeps its containing block all through the night and
  // stays pinned until the next day's CAPSULE actually pushes it off. (With
  // the divider between the blocks, the previous block ended at the divider's
  // top and the capsule was pushed off while the night was still scrolling
  // past — "和下一个日期标题之间隔了一个night就被顶走".) nightAfter[i] is the
  // boundary BEFORE group i; a pre-pass mirrors the render pass's gap rules.
  const nightAfter: ({ from: string; to: string } | null)[] = [];
  {
    let pe: string | null = null;
    let pu: string | null = null;
    for (const g of dayGroups) {
      const first = g.items[0];
      const gapMs = pe !== null ? Date.parse(first.startTime) - Date.parse(pe) : 0;
      const isNight =
        pe !== null &&
        pu !== "title" &&
        pu !== "transit" && // the journey itself covers the night
        (gapMs > NIGHT_GAP_MS || (first.unit && gapMs > 1.5 * 3_600_000));
      nightAfter.push(
        isNight ? { from: pe!.slice(11, 16), to: first.startTime.slice(11, 16) } : null
      );
      for (const s of g.items) {
        pe = s.endTime;
        pu = s.unit ?? null;
      }
    }
  }

  return (
    <div className="story-pane">
      <TravelNav
        trip={trip}
        scenes={scenes}
        activeSceneId={activeSceneId}
      />
      {/* ---- trip overview ---- */}
      <section
        className="scene-section intro"
        data-scene-id="__intro__"
        ref={(el) => registerSection("__intro__", el)}
      >
        <div className="intro-inner">
          <p className="kicker">Travel log</p>
          <h1>{trip.title}</h1>
          <p className="intro-meta">
            {trip.start} → {trip.end} · {trip.days.length} days · {trip.stats.distanceKm.toLocaleString()} km ·{" "}
            {trip.stats.points.toLocaleString()} GPS points
          </p>
          <p className="intro-hint">
            Scroll the journal to start the trip and read the story.
          </p>
        </div>
        {/* v12 (2026-09-28 user request): bottom scroll cue. The intro used to
            end with the Day 0 capsule peeking in — odd as a first impression.
            A downward double chevron (user pick) with a looping drop animation
            plus "Scroll to read" now anchors the boot screen and teaches the
            reading gesture. Reduced motion: static chevrons. */}
        <div className="intro-scroll-hint" aria-hidden="true">
          <span className="hint-chevrons">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 8 6 6 6-6" />
            </svg>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 8 6 6 6-6" />
            </svg>
          </span>
          <span className="hint-text">Scroll to read</span>
        </div>
      </section>

      {/* ---- scenes, one sticky-capsule block per day ---- */}
      {dayGroups.map((g, gi) => {
        const dayNo = g.items[0].dayNo ?? trip.days.findIndex((d) => d.date === g.day) + 1;
        const dayMeta = trip.days.find((d) => d.date === g.day);
        return (
          <Fragment key={g.day}>
            <div className="day-block">
              <div
              className={"day-capsule" + (activeDayNo === dayNo ? " on" : "")}
              data-day-no={dayNo}
              role="button"
              tabIndex={0}
              title="Jump to this day"
              onClick={() => jumpToDay(dayNo)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  jumpToDay(dayNo);
                }
              }}
            >
              <span className="dc-fill" aria-hidden="true" />
              <span className="dc-dot" aria-hidden="true" />
              <span className="dc-label">Day {dayNo}</span>
              <span className="dc-date">{dayMeta?.label ?? g.day}</span>
              {dayMeta && (
                <span className="dc-km">
                  {(dayMeta.flightM ?? 0) > 0 && <span className="dc-plane">✈</span>}
                  {(dayMeta.distanceM / 1000).toFixed(0)} km
                </span>
              )}
            </div>
            {g.items[0].dayTitle && <p className="day-heading">{g.items[0].dayTitle}</p>}
            {g.items.map((s, i) => {
              // mid-day night divider only (i > 0): a day-boundary night gap
              // renders at the END of the previous block (v12); prevEnd/
              // prevUnit carry across day blocks
              const gapMs = prevEnd !== null ? Date.parse(s.startTime) - Date.parse(prevEnd) : 0;
              const nightGap =
                i > 0 &&
                prevUnit !== "title" &&
                prevUnit !== "transit" && // the journey itself covers the night
                gapMs > NIGHT_GAP_MS;
              const nightFrom = prevEnd ? prevEnd.slice(11, 16) : "";
              const nightTo = s.startTime.slice(11, 16);
              prevEnd = s.endTime;
              prevUnit = s.unit ?? null;
              const active = activeSceneId === s.id;
              return (
                <div key={s.id}>
                  {nightGap && (
                    <div className="night-divider" aria-hidden="true">
                      <span className="night-moon">☾</span>
                      <span className="night-text">
                        Night · {nightFrom} → {nightTo} · asleep at the hotel
                      </span>
                    </div>
                  )}
                  <section
                    className={`scene-section${s.unit === "title" ? " unit-title" : s.unit === "transit" ? " unit-transit" : ""}${active ? " active" : ""}`}
                    data-scene-id={s.id}
                    ref={(el) => registerSection(s.id, el)}
                  >
                    {s.unit !== "title" && (
                      <div className="scene-head">
                        <SegmentChip segment={s.segment} />
                        {s.title && <h2>{s.title}</h2>}
                        <div className="scene-meta">
                          {timeRange(s)}
                          {s.gps && <> · {(s.gps.distanceM / 1000).toFixed(1)} km traced</>}
                          {s.confidence.startsWith("inferred") && <span className="confidence">· time estimated</span>}
                        </div>
                      </div>
                    )}

                    {s.titleBody && (
                      <div className="scene-body day-body">
                        {s.titleBody.split("\n\n").map((p, j) => (
                          <p key={j}>{p}</p>
                        ))}
                      </div>
                    )}
                    {s.body ? (
                      <div className="scene-body">
                        {s.body.split("\n\n").map((p, j) => (
                          <p key={j}>{p}</p>
                        ))}
                      </div>
                    ) : s.unit ? null : s.segment === "transit" ? (
                      <p className="scene-note">Transit — the route is moving; the journal picks up at the next stop.</p>
                    ) : (
                      <p className="scene-note">Continuing the day — the journal entry is shown at the first scene of the day.</p>
                    )}

                    {s.attractions.map((a) => (
                      <article key={a.name} className="attraction">
                        <h3>
                          {a.name}
                          {a.visited === false && <span className="not-visited">planned only</span>}
                        </h3>
                        {a.match === "unresolved" && (
                          <p className="match-warning">place not matched to journal — needs manual mapping</p>
                        )}
                        {a.excerpt && <p className="excerpt">{a.excerpt}</p>}
                      </article>
                    ))}

                    {!s.gps && (
                      <p className="match-warning">no GPS coverage in this time window</p>
                    )}
                  </section>
                </div>
              );
            })}
            {/* v12.1 (2026-09-28 user report — "衔接关系还是没有改好"): the
                boundary divider must live INSIDE the .day-block, not after it.
                The sticky capsule's constraint rectangle is the day-block, so
                a divider placed after the block leaves the previous capsule
                pushed off BEFORE the night even scrolls (exactly the reported
                "隔了一个night就被顶走"). As the block's last child, the
                capsule stays pinned through the whole night and is only
                pushed off when the next day's capsule arrives. Visual order
                is unchanged: last scene → night → next capsule. */}
            {nightAfter[gi + 1] && (
              <div className="night-divider" aria-hidden="true">
                <span className="night-moon">☾</span>
                <span className="night-text">
                  Night · {nightAfter[gi + 1]!.from} → {nightAfter[gi + 1]!.to} · asleep at the hotel
                </span>
              </div>
            )}
            </div>
          </Fragment>
        );
      })}

      {/* v12 (2026-09-28 user request): the "End of the log..." gray footer
          is gone — its stats duplicated the finale line and the divider sat
          awkwardly far above the finale. The data-source note survives as a
          small caption inside the finale block. */}
      {/* scroll room so the band line can reach the final anchor (trip end) */}
      <div className="end-spacer" aria-hidden="true" />
      {/* ---- finale: the camera pulls back to the whole unfaded route ---- */}
      <section
        className={`scene-section finale${activeSceneId === "__finale__" ? " active" : ""}`}
        data-scene-id="__finale__"
        ref={(el) => registerSection("__finale__", el)}
      >
        <p className="kicker">Finale</p>
        <h2 className="finale-title">完结撒花 🎉</h2>
        <p className="finale-line">
          {trip.days.length} days · {trip.stats.distanceKm.toLocaleString()} km ·{" "}
          {trip.stats.points.toLocaleString()} GPS points logged. </p>
        <p className="finale-hint">
          感谢阅读 ~ See you on the next trip!
        </p>

      </section>

    </div>
  );
}
