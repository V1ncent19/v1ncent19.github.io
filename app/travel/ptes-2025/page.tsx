import TravelLogPage, { logMetadata } from "@/components/travel/log/TravelLogPage";
import { ptes2025 } from "@/lib/travel/log/definitions/ptes-2025";

export const metadata = logMetadata(ptes2025, "en");

export default function Page() {
  return <TravelLogPage log={ptes2025} lang="en" />;
}
