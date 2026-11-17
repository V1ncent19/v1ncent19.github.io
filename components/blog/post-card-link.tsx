"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { rememberTravelLogSource } from "@/lib/travel/log/return-navigation";

export function PostCardLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  return <Link href={href} className={className} onNavigate={() => rememberTravelLogSource(href)}>{children}</Link>;
}
