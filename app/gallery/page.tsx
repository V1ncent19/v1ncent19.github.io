import type { Metadata } from "next";
import { GalleryView } from "@/components/gallery/gallery-view";
import { labelFor } from "@/content/navigation";
import { getGalleryItems } from "@/lib/content";

export const metadata: Metadata = { title: labelFor("gallery", "en") };

export default function GalleryPage() {
  const items = getGalleryItems();
  return <GalleryView lang="en" items={items} />;
}
