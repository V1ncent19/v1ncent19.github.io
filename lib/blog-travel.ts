/**
 * Travel logs as Blog index entries (2026-10-17, user request: "the trips
 * should also show up on /blog").
 *
 * There are two ways to do this and only one of them is honest:
 *
 *   ✗ Write a markdown stub per trip in `content/blog/`. That duplicates every
 *     blurb into a second file, and the copy immediately drifts from
 *     `card.json` — the trip's real metadata — while `getBlogPosts()` would
 *     publish a second URL for a page that already exists.
 *
 *   ✓ Merge at read time, here. `card.json` stays the single source: the card
 *     title is its title, the excerpt its blurb, the date its `start`, and the
 *     link goes straight to /travel/<id>. Nothing is duplicated, and adding a
 *     trip adds a blog entry with no extra work.
 *
 * The Blog index is bilingual; the trips are too (`{en, zh}` through `pick()`),
 * so `/blog/zh` lists Chinese titles and blurbs while the md posts keep their
 * single-language bodies — the index has always mixed languages by design.
 *
 * `blogIndexCards()` is the single entry point for both index pages: it merges
 * the md posts with the trips and sorts the union newest-first, because the
 * "Latest" stat reads `posts[0]` and a trip can be newer than the newest post.
 */

import { copy, type Lang } from "@/lib/i18n";
import { getBlogPosts, type BlogPostCard } from "@/lib/blog";
import { toBlogCard } from "@/lib/lede-math";
import { pick } from "@/lib/localized";
import { tripCards, tripFacts, type TripCard } from "@/lib/travel/trips";

/** One trip → one index card. Plain-text parts: a trip title has no math. */
function tripCardAsPost(trip: TripCard, lang: Lang): BlogPostCard {
  const title = pick(trip.title, lang);
  const blurb = pick(trip.blurb, lang);
  return {
    slug: `travel/${trip.id}`,
    title,
    /** Anchor date — the same one the /travel timeline sorts by. */
    date: trip.start,
    category: "travel",
    lang,
    titleParts: [{ kind: "text", value: title }],
    excerptParts: [{ kind: "text", value: blurb }],
    titleText: title,
    excerptText: blurb,
    href: lang === "zh" ? `/travel/zh/${trip.id}` : `/travel/${trip.id}`,
    /** "17 days · 18,039.7 km · 21,863 GPS pts" instead of a read time. */
    meta: tripFacts(trip, lang).join(" · "),
    cta: copy[lang].blog.readTravel,
  };
}

/** Every trip as an index card, in `card.json` order (oldest departure first). */
export function tripCardsAsPosts(lang: Lang): BlogPostCard[] {
  return tripCards.map((trip) => tripCardAsPost(trip, lang));
}

/**
 * The full Blog index feed: md posts + travel logs, newest first.
 * Both `/blog` and `/blog/zh` call this and nothing else.
 */
export function blogIndexCards(lang: Lang): BlogPostCard[] {
  return [...getBlogPosts().map(toBlogCard), ...tripCardsAsPosts(lang)].sort(
    (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0),
  );
}
