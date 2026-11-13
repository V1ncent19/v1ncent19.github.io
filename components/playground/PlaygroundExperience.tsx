"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { windows } from "@/assets-src/playground/window-gallery.mjs";

const StainedGlassScene = dynamic(() => import("./StainedGlassScene"), {
  ssr: false,
  loading: () => <div className="playground-scene-loading" aria-label="Loading the scene" />,
});

export default function PlaygroundExperience() {
  return (
    <div className="playground-page">
      <div className="playground-scene">
        <StainedGlassScene />
      </div>
      <div className="playground-vignette" aria-hidden="true" />
      <header className="playground-header">
        <Link className="playground-home" href="/" aria-label="Back to home">← <span>Home</span></Link>
        <h1>Travel <em>in glass</em></h1>
        <span className="playground-pan-hint">Drag to pan</span>
      </header>
      <nav className="playground-logs" aria-label="Travel logs">
        {windows.map(({ id, title, href }) => (
          <Link key={id} href={href}>{title} <span aria-hidden="true">↗</span></Link>
        ))}
      </nav>
    </div>
  );
}
