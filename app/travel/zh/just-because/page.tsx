import TravelLogPage, { logMetadata } from "@/components/travel/log/TravelLogPage";
import { justBecause } from "@/lib/travel/log/definitions/just-because";

export const metadata = logMetadata(justBecause, "zh");

export default function Page() {
  return <TravelLogPage log={justBecause} lang="zh" />;
}
