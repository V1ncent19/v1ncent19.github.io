/** Central site identity constants.
 * Personal/config data is later consolidated into content/profile.json
 * (see CONTENT_MODEL.md); this module is the interim single source used by the
 * layout shell until then. */
export const site = {
  givenName: "Tuorui",
  familyName: "Peng",
  handle: "v1ncent19",
  /**
   * header identity: `Tuorui "v1ncent19" Peng`
   * (the ASCII quotes are rendered around the handle by site-header.tsx so
   * they can sit inside the sky-blue region per the LaTeX mock)
   */
  nameParts: {
    before: "Tuorui ",
    handle: "v1ncent19",
    after: " Peng",
  },
  tagline: "En voyage dans l'espace de Hilbert.",
  github: "https://github.com/V1ncent19",
};

export type Theme = "light" | "dark" | "system";

export const themeStorageKey = "theme";
