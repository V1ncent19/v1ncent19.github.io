import type { Metadata } from "next";
import { SectionMark } from "@/components/layout/section-mark";
import { HubHoverLink } from "@/components/travel/hub-hover-link";
import { GalleryView, type GalleryStoryTile } from "@/components/gallery/gallery-view";
import { getGalleryItems, getTravel } from "@/lib/content";
import { blogPostPath, getBlogPosts } from "@/lib/blog";
import { tripCards } from "@/lib/travel/trips";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Travel",
  description:
    "A draggable globe of every place visited, right beside the title — then a masonry flow that leads with the pinned interactive trip log (Beta), slots the Paris restaurant notes into its 2024-03-20 spot, and continues as the curated photo wall.",
};

/* The Paris cuisine blog post surfaced as a story tile (image-less, so no
   cover needed — the tile is typographic). */
const PARIS_SLUG = "fr2024-cuisine";

/**
 * /travel hub (2026-09-25 v3, user-approved): the globe sits to the right of
 * the page title (no separate § Places section — both main elements, globe
 * and waterfall, are visible on arrival), the checklist stays below as a
 * collapsed one-row legend (TravelBoard in hideGlobe mode), and the masonry
 * flow leads with typographic story tiles (no covers) followed by the photo
 * wall (same tiles, toolbar and lightbox as /gallery).
 */
export default function TravelPage() {
  const galleryItems = getGalleryItems();
  const travel = getTravel();

  const storyTiles: GalleryStoryTile[] = tripCards.map((trip) => ({
    id: `story-trip-${trip.id}`,
    href: `/travel/${trip.id}`,
    /* Anchor date for chronological numbering below (and for any future
       unpinned trip tiles). */
    date: trip.start,
    title: trip.title.en,
    /* v2 (2026-09-26): basic metainfo only — the blurb excerpt is dropped
       (user request); hover circle-reveal cover mirrors the home gateway. */
    meta: "Interactive map log",
    tags: trip.stops?.en,
    facts: [
      `${trip.days} days`,
      `${trip.distanceKm.toLocaleString("en-US", { maximumFractionDigits: 1 })} km`,
      `${trip.gpsPoints.toLocaleString("en-US")} GPS pts`,
    ],
    cta: "Read the log",
    badge: trip.beta ? "Beta" : undefined,
    cover: trip.cover,
    /* The interactive trip log is pinned to the front of the flow (2026-09-25
       user request); the food diary below instead slots into the timeline. */
    pinned: true,
  }));

  const paris = getBlogPosts().find((p) => p.slug === PARIS_SLUG);
  if (paris) {
    storyTiles.push({
      id: "story-paris-cuisine",
      href: blogPostPath(paris),
      title: paris.title,
      meta: "Blog",
      tags: ["Paris", "Cuisine"],
      /* The meal date (user-specified anchor), not the post's publish date —
         the tile sits at 2024-03-20 in the timeline below. */
      facts: ["2024.03.20"],
      cta: "Read the post",
      /* Not pinned: it rides the photo timeline at its own date. Louvre
         sunset thumb for the hover orb (2026-09-26). */
      cover: "/assets/gallery/thumb/img-0462.webp",
      date: "2024-03-20",
    });
  }

  /* Numbering is chronological across ALL story tiles (2026-09-26 user
     request): sort a shallow copy by anchor date and hand out 01, 02, … —
     the Paris diary (2024-03) is 01, the Iberia log (2025-12) is 02, even
     though the pinned tile still leads the flow visually. */
  const numbered = storyTiles
    .slice()
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  numbered.forEach((t, i) => {
    t.index = String(i + 1).padStart(2, "0");
  });
  /* Tag cell beside the index on the most recent post (user 2026-09-26). */
  const latestTile = numbered[numbered.length - 1];
  if (latestTile) latestTile.latest = copy.en.travel.latestBadge;

  return (
    <section className="shell pb-24">
      <div className="mx-auto max-w-5xl">
        {/* ---- Header: title + lead left, the draggable globe right (user
            request: both main elements visible on arrival, no extra section).
            Mobile: the globe drops below the title, centred. ---- */}
        <header className="pb-10 pt-2 sm:pt-4">
          {/* v12.1 (2026-09-28): the grid + globe + legend board moved into
              HubHoverLink (client) so the globe and the checklist rows share
              one hover state — the restored globe↔list hover link. Only the
              title + blurb stay server-rendered here. items-start (2026-09-26):
              the globe is top-anchored to the h1, so expanding a checklist
              below does NOT shift it vertically — the user wants an absolute
              position for the globe. pb-10 matches the shared PageHeader
              rhythm used by every other top-level page. */}
          <HubHoverLink lang="en" travel={travel}>
            <h1 className="flex items-center gap-3 text-balance text-4xl tracking-tight sm:text-5xl">
              <SectionMark id="travel" size="1.5rem" />
              <span>Travel</span>
            </h1>
            {/* Width anchor: 62ch at the blurb's 1.05rem font sizes the
                column exactly like the lead paragraph; the checklists below
                fill the same box, so title + blurb + lists read as one
                block with the globe to its right (2026-09-26 user request). */}
            <div className="mt-4 max-w-[62ch] text-[1.05rem]">
              <p className="leading-relaxed text-muted">
                The map of everywhere I have been — and the stories from the
                road! You are welcome to join my adventures, and I hope you enjoy the view.
              </p>
            </div>
          </HubHoverLink>
        </header>

        {/* ---- Stories & frames: image-less story tiles lead, then the
            /gallery experience embedded in place (same tiles, toolbar,
            lightbox). ---- */}
        <section className="mt-12" aria-label="Stories and frames">
          <div className="mb-6 border-b border-line pb-3">
            <h2 className="flex scroll-mt-28 items-center gap-3.5 text-2xl font-semibold tracking-tight">
              <SectionMark id="stories-and-frames" />
              Stories &amp; frames
            </h2>
            {/* <p className="mt-3 max-w-[62ch] leading-relaxed text-muted">
              The pinned trip log leads; the food diary sits at its own date in
              the stream. Every frame opens its story, coordinates and
              full-resolution download.
            </p> */}
          </div>
          <GalleryView
            lang="en"
            items={galleryItems}
            storyTiles={storyTiles}
            embedded
          />
        </section>

        {/* The "More travel" cross-link section is gone (user 2026-09-28):
            the full gallery experience already lives in the Stories & frames
            flow above, and the standalone /gallery pages were removed. */}
      </div>
    </section>
  );
}
