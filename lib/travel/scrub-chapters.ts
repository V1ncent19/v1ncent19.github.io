"use client";

/**
 * Map a scrub fraction (0..1 along the bar) to the chapter under the
 * playhead, for the mobile progress slider (2026-10-24).
 *
 * The user asked for "拖动的时候，端点上可以浮现出一个方框，标示拖到的是哪个
 * 章节" — a box at the playhead naming the chapter you are dragging to. That
 * needs a fraction → chapter lookup, and BOTH bars (trip log + anitabi) have
 * to answer it identically, so it lives here rather than being written twice.
 *
 * `marks` is the same array the bar already uses to place its graduations:
 * `{ no, left }` where `left` is the mark's position as a PERCENTAGE along
 * the track, in the scroll domain the bar is drawn in. It is not sorted
 * by guarantee, so we sort defensively.
 *
 * Semantics: the chapter you get is the LAST mark at or before the
 * playhead — the nearest boundary you have passed. Dragging to 0 before the
 * first mark still yields the first chapter (there is no "before chapter 1"
 * state to show). Returns `null` for an empty array so callers can skip the
 * label entirely instead of showing `Day undefined`.
 *
 * `no` is `string | number` because the two pages key their chapters
 * differently: the trip log uses day numbers (1, 2, 3…), anitabi uses stop
 * ids ("osaka-castle"). The lookup never has to do arithmetic on it.
 */
export type ScrubMark = { no: string | number; left: number };

export function chapterAtFraction<T extends ScrubMark>(
  marks: readonly T[],
  fraction: number
): T | null {
  if (!marks.length) return null;
  const sorted = [...marks].sort((a, b) => a.left - b.left);
  const pct = Math.min(100, Math.max(0, fraction * 100));
  let found = sorted[0];
  for (const m of sorted) {
    if (m.left <= pct) found = m;
    else break;
  }
  return found;
}

/**
 * Inverse of `chapterAtFraction`: the fraction a chapter sits at, so the
 * slider's playhead can be positioned from the CURRENT chapter when a drag
 * begins (otherwise the handle would jump from the scroll position to the
 * pointer and the box would name the wrong chapter for one frame).
 */
export function fractionOfChapter(
  marks: readonly ScrubMark[],
  no: string | number
): number | null {
  const hit = marks.find((m) => m.no === no);
  return hit ? Math.min(1, Math.max(0, hit.left / 100)) : null;
}
