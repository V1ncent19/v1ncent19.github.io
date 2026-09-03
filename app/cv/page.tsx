import type { Metadata } from "next";
import { CvFolio } from "@/components/cv/cv-folio";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: copy.en.cv.title,
};

export default function CvPage() {
  return <CvFolio lang="en" />;
}
