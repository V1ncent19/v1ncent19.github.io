import type { Metadata } from "next";
import { GuestbookView } from "@/components/guestbook/guestbook-view";
import { labelFor } from "@/content/navigation";

export const metadata: Metadata = { title: labelFor("guestbook", "en") };

export default function GuestbookPage() {
  return <GuestbookView lang="en" />;
}
