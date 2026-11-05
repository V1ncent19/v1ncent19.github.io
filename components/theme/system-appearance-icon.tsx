import type { SVGProps } from "react";

/** A display containing a half-light, half-dark circle: system appearance. */
export default function SystemAppearanceIcon(props: SVGProps<SVGSVGElement>) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2.5" y="3.5" width="19" height="14" rx="2" />
    <circle cx="12" cy="10.5" r="4" />
    <path d="M12 6.5a4 4 0 0 1 0 8Z" fill="currentColor" stroke="none" />
    <path d="M12 17.5v3M8 20.5h8" />
  </svg>;
}
