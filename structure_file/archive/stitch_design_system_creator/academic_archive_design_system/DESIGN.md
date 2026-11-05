---
name: Academic & Archive Design System
colors:
  surface: '#f5fafd'
  surface-dim: '#d5dbde'
  surface-bright: '#f5fafd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4f8'
  surface-container: '#e9eff2'
  surface-container-high: '#e3e9ec'
  surface-container-highest: '#dee3e7'
  on-surface: '#171c1f'
  on-surface-variant: '#3d484e'
  inverse-surface: '#2b3134'
  inverse-on-surface: '#ecf1f5'
  outline: '#6d797f'
  outline-variant: '#bcc8cf'
  surface-tint: '#006783'
  primary: '#006783'
  on-primary: '#ffffff'
  primary-container: '#41cfff'
  on-primary-container: '#00556d'
  inverse-primary: '#62d4ff'
  secondary: '#376476'
  on-secondary: '#ffffff'
  secondary-container: '#b9e6fc'
  on-secondary-container: '#3c687b'
  tertiary: '#825500'
  on-tertiary: '#ffffff'
  tertiary-container: '#feb136'
  on-tertiary-container: '#6d4600'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bce9ff'
  primary-fixed-dim: '#62d4ff'
  on-primary-fixed: '#001f29'
  on-primary-fixed-variant: '#004d63'
  secondary-fixed: '#bce9ff'
  secondary-fixed-dim: '#a0cde2'
  on-secondary-fixed: '#001f29'
  on-secondary-fixed-variant: '#1d4c5e'
  tertiary-fixed: '#ffddb3'
  tertiary-fixed-dim: '#ffb952'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#633f00'
  background: '#f5fafd'
  on-background: '#171c1f'
  surface-variant: '#dee3e7'
typography:
  display:
    fontFamily: Eb Garamond
    fontSize: 2.5rem
    fontWeight: '600'
    lineHeight: 3rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Eb Garamond
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Eb Garamond
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.875rem
    letterSpacing: 0.005em
  label-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
---

## Brand & Style

This design system establishes a quiet, rigorous, and literary atmosphere tailored for a personal academic and archival site. It bridges the intellectual gravity of mathematical and statistical scholarship with the warm, curated sensibility of a researcher’s personal cabinet of curiosities—spanning course notes, culinary adventures, and field notes.

### Visual Style: Editorial Academic Minimalist
- **Core Philosophy:** Structure over decoration, legibility over flair, and deliberate editorial rhythm. It refuses the sterile look of typical SaaS dashboards and the cluttered noise of social feeds.
- **Atmosphere:** Calm, ordered, and archival. Reminiscent of academic journals, fine press publications, and museum archives with modern digital precision.
- **Travel Stamp & Archive Identity:** As inspired by curated passport and location stamps, visual accents incorporate monoline bordered stamps, crisp badges, and precise typographic indexing metadata (e.g., country codes, coordinates, publication dates).

## Colors

The palette is anchored in an authoritative deep cyan blue derived from classical mathematics repositories and university heraldry. Muted secondary and tertiary tones provide archival classification without distracting from long-form reading.

### Color Roles & Tonal Strategy

- **Primary (`#02b9e9` - Academic Cyan):** Primary navigation anchors, prominent action highlights, key text links, and stamp keylines.
- **Secondary (`#517d90` - Deep Slate Teal):** Research papers, statistical coursework, verified datasets, and archival taxonomy tags.
- **Tertiary (`#feb136` - Soft Amber / Old Gold):** Ephemeral notes, culinary writings, status accents, and warm highlighted metadata.
- **Neutral Surface & Ink:**
  - *Light Mode:* Background surfaces evoke heavy cream and parchment paper (`#f9f9ff` base surface, `#ffffff` card container, `#111c2d` primary ink, `#434655` secondary body).
  - *Dark Mode:* Deep archival library slate (`#0b0f17` background, `#131b2e` card container, `#e2e8f0` crisp body ink, `#94a3b8` muted secondary text).
- **Surface Borders & Dividers:** Subtle, low-opacity strokes delivering structured geometric delineation without visual weight.

## Typography

Typography establishes the academic rigor and cross-lingual balance between English and Chinese literary forms.

### Hierarchy & Pairings
- **Headings & Long-Form Essays:** Handled by classical serifs. The English font stack leverages Eb Garamond, Georgia, and related literary serifs. For Chinese glyphs, it seamlessly falls back to Noto Serif SC, Source Han Serif, and Songti to retain calligraphic grace and high horizontal-vertical contrast.
- **Body Text:** Crafted for extended sustained reading. Set with generous line-heights (`1.75` to `1.875`) using Eb Garamond to emulate university presses and mathematical monographs.
- **Labels, Navigation, & Code:** Handled by `Inter` for maximum monoline clarity in index tags, search bars, category indicators, and metadata dates.
- **Stamp & Emblem Metadata:** Uses uppercase monoline characters with expanded tracking (`0.08em`) to mirror archival accession stamps and passport marks.

## Layout & Spacing

The layout is built upon an editorial column philosophy with a constrained reading container to maintain an optimal 65–75 character count per line.

### Rhythm & Proportions
- **Reading Measure:** A deliberate `container-reading` (672px / 42rem) guarantees deep reading comfort for essays and mathematical summaries.
- **Broad Index Measure:** The `container-max` (864px / 54rem) hosts gallery grids, navigation tiles, and card listings.
- **Adaptive Breakpoints:**
  - *Mobile (< 640px):* Single column flow with `1rem` safe margins; 2-column compact badge/tile grids.
  - *Tablet (640px – 1024px):* 2-column card layouts, search bars with integrated shortcut badges.
  - *Desktop (> 1024px):* Centered reading canvas with generous side gutters, providing a calm, uncluttered sanctuary.

## Elevation & Depth

Visual hierarchy avoids heavy drop shadows, relying instead on tactile paper tiers, crisp hair-line strokes, and frosted optical layers.

### Elevation Principles
- **Base Level (Canvas):** Flat parchment or dark ink slate. Minimal to no shadow.
- **Resting Cards & Tiles:** Delineated with a crisp, low-contrast 1px border. No muddy shadow, preserving clean margins.
- **Hover Lift:** On interaction, cards shift subtly upward by `2px` accompanied by an ultra-soft, diffused shadow.
- **Frosted Glass / Vignette Overlays:** Gallery cards and culinary vignettes use backdrop filters (`backdrop-filter: blur(12px)`) with semi-transparent gradient overlays ensuring overlayed serif typography remains legible against photographic backgrounds.

## Shapes

The geometric personality blends timeless rectangular book forms with pill-shaped modern archival tokens.

### Corner Radius System
- **Cards & Visual Containers (`rounded-lg` / 16px):** Delivers a tactile, welcoming frame for coursework previews, blog links, and profile photos without veering into playful cartoonishness.
- **Pill & Stamp Badges (`rounded-full` / 9999px & `rounded-md` / 8px):** Category indicators, dates, and passport stamp seals use dedicated 2px monoline rounded borders reflecting the geometry of physical travel stamps.
- **Action Buttons & Inputs (`rounded-md` / 8px):** Search inputs and PDF download badges utilize precise, dependable 8px corners.

## Components

### 1. Travel & Archival Stamp Badges
- **Form:** Enclosed rectangular rounded-corner tiles (`rounded-md` to `rounded-lg`) framed by a distinct `1.5px` or `2px` solid stroke in primary or secondary tones.
- **Content:** Monoline location/category icons flanked by high-density metadata.
- **Usage:** Footers of posts, travel archive section, and location milestones.

### 2. Search & Filter Bar
- **Input:** Centered, pill-soft or 8px rounded box with a delicate `1px` border, neutral parchment fill, and an internal search icon. Subtle focus state with a 2px primary halo ring.
- **Category Chips:** Low-tint slate and amber chips with `0.5rem` horizontal padding, shifting to solid fill upon active filtering.

### 3. Archive Cards & Topic Navigators
- **Structure:** 2-column responsive layout. Background images feature full-bleed imagery veiled by a bottom-weighted gradient and frosted glass title bar.
- **Typography:** Serif title in white or high-contrast ink, paired with a sub-label in monoline sans (`label-sm`).
- **Interaction:** Smooth 200ms ease transition on hover: slight 2px vertical translation and stroke tint intensification.

### 4. PDF Download & Action Modules
- **Layout:** Horizontal row container with an unmistakable file indicator icon on the right margin.
- **Styling:** Clear Eb Garamond title, monoline file size tag, and a dedicated outlined PDF stamp icon in primary color that turns solid with inverted white icon on hover.

### 5. Academic List Entries
- **Bullet Treatment:** Replaced with delicate monoline rings (`4px` diameter) or arrow accents in tertiary amber or primary blue.
- **Metadata:** Author and date markers set in italicized `body-sm` serif, separated by quiet middle-dots (`·`).