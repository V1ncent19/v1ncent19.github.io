import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./prose.css";
import "katex/dist/katex.min.css";
import { ThemeScript } from "@/components/theme/theme-script";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { BackToTop } from "@/components/layout/back-to-top";
import { site } from "@/lib/site";

const baseTitle = 'Tuorui "v1ncent19" Peng';

export const metadata: Metadata = {
  title: {
    default: baseTitle,
    template: `%s · v1ncent19`,
  },
  description: `${baseTitle} — ${site.tagline}`,
  authors: [{ name: baseTitle, url: site.github }],
  creator: baseTitle,
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5fafd" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1219" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="flex min-h-svh flex-col bg-canvas font-serif text-ink antialiased">
        <ThemeScript />
        <a
          href="#main"
          className="ui-text sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-ink focus:shadow-lift"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <BackToTop />
      </body>
    </html>
  );
}
