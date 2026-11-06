import type { Metadata } from "next";
import { getEgyptGuide } from "@/lib/egypt2026";
import EgyptItinerary from "@/components/travel/EgyptItinerary";
import "./egypt2026.css";

export const metadata: Metadata = {
  title: "埃及 2026 · 行程概览",
  description: "2026 年 11 月埃及旅行的个人行程草案与出发前核对页。",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default function Page() {
  return <EgyptItinerary guide={getEgyptGuide()} />;
}
