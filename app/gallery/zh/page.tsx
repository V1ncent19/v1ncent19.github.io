import type { Metadata } from "next";
import { GalleryView } from "@/components/gallery/gallery-view";
import { labelFor } from "@/content/navigation";
import { getGalleryItems } from "@/lib/content";

export const metadata: Metadata = { title: labelFor("gallery", "zh") };

export default function GalleryZhPage() {
  const items = getGalleryItems();
  return <GalleryView lang="zh" items={items} />;
}
