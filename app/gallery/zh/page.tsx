import type { Metadata } from "next";
import { GalleryView } from "@/components/gallery/gallery-view";
import { labelFor } from "@/content/navigation";

export const metadata: Metadata = { title: labelFor("gallery", "zh") };

export default function GalleryZhPage() {
  return <GalleryView lang="zh" />;
}
