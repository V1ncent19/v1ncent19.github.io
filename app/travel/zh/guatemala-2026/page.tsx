import TravelLogPage, { logMetadata } from "@/components/travel/log/TravelLogPage";
import { guatemala2026 } from "@/lib/travel/log/definitions/guatemala-2026";

export const metadata = logMetadata(guatemala2026, "zh");

export default function Page() {
  return <TravelLogPage log={guatemala2026} lang="zh" />;
}
