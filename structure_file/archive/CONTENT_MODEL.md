# Content Model Draft

## Goals

The content system should make routine edits easy without touching layout code. Personal details, navigation labels, CV links, gallery metadata, tags, and projects should be centralized where possible.

The structure should support static generation and future AI-assisted editing.

## Proposed Folder Structure

```text
content/
  profile.json
  navigation.ts
  tags.ts
  blog/
    2026/
      stat-summary-note.mdx
  gallery/
    items.json
    badge-presets.json
  cv/
    cv.en.mdx
    cv.zh.mdx
    entries.ts
  project/
    stat-summary-note.mdx
    some-engineering-project.mdx
public/
  assets/
    profile/
      avatar.jpg
    cv/
      v1ncent19-cv-en.pdf
      v1ncent19-cv-zh.pdf
    gallery/
      thumb/
      large/
      badges/
```

This is a planning structure. The final implementation may use TypeScript modules, JSON, YAML, or frontmatter depending on the chosen content tooling.

## Profile

Purpose:

- Centralize identity, avatar, CV links, and contact information.
- Keep future maintenance simple.

Example:

```json
{
  "handle": "v1ncent19",
  "displayName": {
    "en": "v1ncent19",
    "zh": "v1ncent19"
  },
  "avatar": "/assets/profile/avatar.jpg",
  "cv": {
    "en": "/assets/cv/v1ncent19-cv-en.pdf",
    "zh": null
  },
  "links": [
    {
      "label": "GitHub",
      "href": "https://github.com/v1ncent19"
    }
  ],
  "legacyStats": {
    "sitePvBaseline": 0,
    "siteUvBaseline": 0
  }
}
```

## Navigation

Navigation should be data-driven so sections can be added without rewriting layout components.

Example:

```ts
export const sections = [
  {
    id: "about",
    order: 1,
    href: "/about",
    hrefZh: "/about/zh",
    label: { en: "About", zh: "关于" },
    summary: {
      en: "Personal notes and fun facts.",
      zh: "个人介绍与一些 fun facts。"
    }
  }
];
```

Confirmed homepage order:

1. About
2. CV
3. Gallery
4. Blog
5. Project

## Blog Posts

Blog posts should be written in Markdown or MDX.

Required metadata:

```yaml
title: "Stat Summary Note"
slug: "stat-summary-note"
date: "2026-01-01"
lang: "en"
tags:
  - documentation
  - statistics
summary: "Short summary for list pages and search."
cover: null
translationKey: null
comments: true
```

Recommended route:

```text
/blog/[year]/[slug]
```

Language rule:

- A blog post has one original language.
- Blog indexes in both English and Chinese can show all posts.
- If a translation is manually created later, connect versions with `translationKey`.

## Tags

Tags should have stable IDs and localized display labels.

Example:

```ts
export const tags = {
  documentation: {
    label: { en: "Documentation", zh: "文档" }
  },
  cooking: {
    label: { en: "Cooking", zh: "做饭" }
  },
  linguistics: {
    label: { en: "Linguistics", zh: "语言学" }
  },
  knowledge: {
    label: { en: "Knowledge", zh: "知识" }
  }
};
```

Blog index requirements:

- Search box.
- Clickable tag filter area.
- Clear selected tag state.
- Works with static search indexing.

## Gallery Items

Each photo should be a separate card.

Recommended image strategy:

```text
original/   local-only source image, not necessarily committed or deployed
large/      compressed high-resolution web image
thumb/      masonry thumbnail image
```

Example:

```json
{
  "id": "taipei-2026-01",
  "placeId": "taipei-2026",
  "title": {
    "en": "Taipei street view",
    "zh": "台北街景"
  },
  "location": {
    "city": {
      "en": "Taipei",
      "zh": "台北市",
      "local": "臺北市"
    },
    "region": {
      "en": "Taiwan",
      "zh": "台湾地区"
    }
  },
  "date": "2026-08",
  "thumb": "/assets/gallery/thumb/taipei-2026-01.webp",
  "large": "/assets/gallery/large/taipei-2026-01.webp",
  "aspectRatio": 1.5,
  "badgePreset": "taipei-2026",
  "alt": {
    "en": "Travel photo taken in Taipei.",
    "zh": "拍摄于台北的旅行照片。"
  }
}
```

## Gallery Badge Presets

Badges should be a reusable design system, not fully AI-rendered images with text.

Recommended rule:

- Badge layout, text, border, and colors are rendered by code.
- AI-generated assets should be limited to icon or landmark artwork.
- Text should use real web fonts, not image text.

Example:

```json
{
  "id": "taipei-2026",
  "accent": "blue",
  "icon": "/assets/gallery/badges/taipei.svg",
  "stampShape": "rounded-rectangle",
  "rotation": -1.5
}
```

## CV

The CV should support both structured entries and downloadable PDFs.

Current state:

- English PDF exists.
- Chinese PDF may be added later.

Recommended fields:

```ts
type CvEntry = {
  id: string;
  section: "education" | "experience" | "research" | "publication" | "award" | "skill";
  title: string;
  institution?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  links?: Array<{ label: string; href: string }>;
};
```

Research experiences should be shown as cards under the CV page rather than mixed into Project by default.

## Projects

Projects can include ongoing notes, completed projects, collaborations, tools, and archives.

Recommended metadata:

```yaml
title: "Stat Summary Note"
slug: "stat-summary-note"
type: "note"
status: "active"
startedAt: "2024-01"
updatedAt: "2026-09"
featured: true
tags:
  - statistics
  - documentation
links:
  - label: "Open"
    href: "/project/stat-summary-note"
summary: "A long-running statistics summary note."
```

Suggested values:

```ts
status: "active" | "completed" | "paused" | "archived"
type: "note" | "tool" | "collaboration" | "essay" | "archive"
```

Presentation rules:

- Active projects can show latest update date and be sorted near the top.
- Completed projects can show completion year and final links.
- Archived projects can be visually quieter.
- Featured projects can appear on the homepage or top of the Project page.

## Search

Recommended direction:

- Use a static search index, likely Pagefind or a similar static-site search tool.
- Search should cover blog posts and possibly project pages.
- Chinese and Japanese search behavior should be tested before final selection.

## Comments

Recommended direction:

- Use giscus for blog comments.
- Comments are not a core feature, so avoid building a custom comment backend.

## Visitor Counts

Recommended direction:

- Store old visible count as a baseline in configuration.
- Add new runtime count from the chosen counter service.
- Display baseline plus new count for visual continuity.

This should be presented as a public-facing continuity counter, not necessarily a precise analytics system.
