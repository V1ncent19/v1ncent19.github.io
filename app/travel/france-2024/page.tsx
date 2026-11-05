import TravelLogPage, { logMetadata } from "@/components/travel/log/TravelLogPage";
import { france2024 } from "@/lib/travel/log/definitions/france-2024";

export const metadata = logMetadata(france2024, "en");

export default function Page() {
  return <TravelLogPage log={france2024} lang="en" />;
}
