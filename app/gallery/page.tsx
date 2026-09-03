import type { Metadata } from "next";
import { GalleryView } from "@/components/gallery/gallery-view";
import { labelFor } from "@/content/navigation";

export const metadata: Metadata = { title: labelFor("gallery", "en") };

export default function GalleryPage() {
  return <GalleryView lang="en" />;
}
