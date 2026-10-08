/** Central site identity constants.
 * Single source of truth is content/profile.json (consolidated 2026-09-28 —
 * this module used to duplicate the values inline). The layout shell and
 * components keep importing `site`; the shape below is derived, not authored.
 */
import profile from "@/content/profile.json";

const github =
  profile.links.find((l) => l.label.toLowerCase() === "github")?.href ?? "";

export const site = {
  givenName: profile.givenName,
  familyName: profile.familyName,
  handle: profile.handle,
  /**
   * header identity: `Tuorui "v1ncent19" Peng`
   * (the ASCII quotes are rendered around the handle by site-header.tsx so
   * they can sit inside the sky-blue region per the LaTeX mock)
   */
  nameParts: {
    before: `${profile.givenName} `,
    handle: profile.handle,
    after: ` ${profile.familyName}`,
  },
  tagline: profile.tagline,
  github,
} as const;

export type Theme = "light" | "dark" | "system";

export const themeStorageKey = "theme";
