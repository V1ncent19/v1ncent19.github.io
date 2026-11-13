import type { Metadata } from "next";
import PlaygroundExperience from "@/components/playground/PlaygroundExperience";
import "./playground.css";

export const metadata: Metadata = {
  title: "Stained-glass playground",
  description: "A small three-dimensional stained-glass travel gallery experiment.",
  robots: { index: false, follow: false },
};

export default function PlaygroundPage() {
  return <PlaygroundExperience />;
}
