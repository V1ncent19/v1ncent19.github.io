import type { Metadata } from "next";
import type { LogLang, TravelLogDefinition } from "@/lib/travel/log/types";
import { pick } from "@/lib/localized";
import TravelLog from "../TravelLog";
import PilgrimageLog from "../PilgrimageLog";

export function logMetadata(log: TravelLogDefinition, lang: LogLang): Metadata {
  return { title: pick(log.pageTitles ?? log.card.title, lang), description: pick(log.card.blurb, lang) };
}

/** Parse-time body flags stay on the server boundary, before the first paint. */
export default function TravelLogPage({ log, lang = "en" }: { log: TravelLogDefinition; lang?: LogLang }) {
  const pilgrimage = log.kind === "pilgrimage";
  const classes = pilgrimage ? '"pj-immersive","tl-immersive"' : '"tl-immersive"';
  const boot = pilgrimage ? "pj-boot" : "tl-veil-boot";
  return <>
    <script dangerouslySetInnerHTML={{ __html:
      `try{if(document.body){document.body.classList.add(${classes});if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)document.body.classList.add("${boot}");}}catch(e){}`,
    }} />
    {log.kind === "journal"
      ? <TravelLog log={log} lang={lang} />
      : <PilgrimageLog log={log} lang={lang} />}
  </>;
}
