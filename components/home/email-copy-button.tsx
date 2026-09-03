"use client";

import { Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Homepage contact-email button with a hover→click micro-interaction
 * (user direction 2026-09-04): resting label "Contact Email"; on hover the text
 * reads "copy to clipboard"; clicking copies the address and shows a short
 * "√ email clipped" confirmation before reverting. Copy prefers the async
 * Clipboard API and falls back to a hidden textarea for non-secure contexts.
 */
type Mode = "idle" | "copy" | "copied";

const LABEL: Record<Mode, string> = {
  idle: "Contact Email",
  copy: "copy to clipboard",
  copied: "√ email clipped",
};

export function EmailCopyButton({ email }: { email: string }) {
  const [mode, setMode] = useState<Mode>("idle");
  const hovered = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function showCopy() {
    hovered.current = true;
    setMode((m) => (m === "copied" ? m : "copy"));
  }
  function hideCopy() {
    hovered.current = false;
    setMode((m) => (m === "copied" ? m : "idle"));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // non-secure / blocked context → hidden-textarea fallback
      const ta = document.createElement("textarea");
      ta.value = email;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* give up silently — the button still works as a mailto reminder */
      }
      ta.remove();
    }
    setMode("copied");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => setMode(hovered.current ? "copy" : "idle"),
      1800,
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      onMouseEnter={showCopy}
      onMouseLeave={hideCopy}
      title={email}
      aria-label={`${email}. Click to copy the address.`}
      className="ui-text inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink whitespace-nowrap transition hover:-translate-y-0.5 hover:bg-surface-tint hover:text-ink hover:no-underline"
    >
      <Mail className="h-[18px] w-[18px] text-tertiary" aria-hidden />
      <span>{LABEL[mode]}</span>
      <span aria-live="polite" className="sr-only">
        {mode === "copied" ? "Email address copied to clipboard." : ""}
      </span>
    </button>
  );
}
