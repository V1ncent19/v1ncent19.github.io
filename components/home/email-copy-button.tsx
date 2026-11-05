"use client";

import { Check, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Homepage contact-email button with a stacked three-state animation
 * (reference 2026-09-04): resting label "Email me"; on hover the text swaps to
 * "click to copy" as the idle label slides up; clicking copies the address,
 * fills the button with the success green and slides in a check + "copied",
 * then reverts after a short delay.
 *
 * The base look (radius, border, surface card, paddings, hover lift) matches
 * the hero action-row buttons; only the transient copied fill introduces the
 * success green #20a05a that the locked v1 palette otherwise does not contain.
 * Animation + fill live in the `.email-copy` rules in app/globals.css; this
 * component only toggles the `copied` state used to drive them.
 *
 * Copy prefers the async Clipboard API and falls back to a hidden textarea for
 * non-secure contexts.
 */

export function EmailCopyButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

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
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={
        copied ? "Email copied" : `${email}. Click to copy the address.`
      }
      className={`email-copy ui-text rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink ${
        copied ? "is-copied" : ""
      }`}
    >
      <span className="email-copy__state email-copy__idle" aria-hidden="true">
        <Mail className="h-[18px] w-[18px] text-tertiary" aria-hidden="true" />
        <span>Email me</span>
      </span>
      <span className="email-copy__state email-copy__hover" aria-hidden="true">
        click to copy
      </span>
      <span className="email-copy__state email-copy__done" aria-hidden="true">
        <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        <span>copied</span>
      </span>
      <span aria-live="polite" className="sr-only">
        {copied ? "Email address copied to clipboard." : ""}
      </span>
    </button>
  );
}
