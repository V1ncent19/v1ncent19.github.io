import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface EgyptDay {
  id: string;
  number: number;
  date: string;
  weekday: string;
  city: string;
  title: string;
  route: string;
  stay: string;
  luggage: string;
  cue: string;
  markdown: string;
}

export interface EgyptGuide {
  days: EgyptDay[];
  sections: Record<number, { title: string; markdown: string }>;
  checklist: string[];
  reviewRhythm: string;
}

const DAY_SUMMARIES: Omit<EgyptDay, "markdown">[] = [
  { id: "d1", number: 1, date: "2026-11-19", weekday: "周四", city: "开罗", title: "抵达 · 吉萨与 GEM", route: "CAI → Downtown → 吉萨", stay: "开罗 · 第 1 晚", luggage: "先到酒店寄存；早入住不保证", cue: "清晨抵达才考虑双景点" },
  { id: "d2", number: 2, date: "2026-11-20", weekday: "周五", city: "开罗 → 阿斯旺", title: "科普特老城 · NMEC", route: "开罗 → CAI → ASW", stay: "阿斯旺 · 第 1 晚", luggage: "退房后酒店寄存，起飞前取回", cue: "19:00 航班仅用于排程" },
  { id: "d3", number: 3, date: "2026-11-21", weekday: "周六", city: "阿斯旺", title: "阿布辛贝往返", route: "阿斯旺 ↔ 阿布辛贝", stay: "阿斯旺 · 第 2 晚", luggage: "大箱留酒店，只带日用包", cue: "凌晨团未确认；菲莱可删" },
  { id: "d4", number: 4, date: "2026-11-22", weekday: "周日", city: "阿斯旺 → 卢克索", title: "转城 · 东岸神庙", route: "阿斯旺 → 卢克索", stay: "卢克索 · 1 晚", luggage: "抵达酒店先寄存", cue: "早班火车是目标窗口" },
  { id: "d5", number: 5, date: "2026-11-23", weekday: "周一", city: "卢克索 → 夜巴", title: "帝王谷 · 西岸", route: "卢克索 → 吉萨（夜巴）", stay: "巴士上 · 非酒店", luggage: "酒店暂存，晚间取箱上车", cue: "Go Bus 票面站点待确认" },
  { id: "d6", number: 6, date: "2026-11-24", weekday: "周二", city: "吉萨 → 亚历山大", title: "夜巴后转城", route: "吉萨 → 开罗站／巴士站 → 亚历山大", stay: "亚历山大 · 1 晚", luggage: "随转城车辆带箱，抵酒店放下", cue: "08:30 为计划抵达，留跨站缓冲" },
  { id: "d7", number: 7, date: "2026-11-25", weekday: "周三", city: "亚历山大 → 开罗", title: "图书馆 · 城堡 · 返城", route: "亚历山大 → 开罗", stay: "开罗 · 第 2 晚", luggage: "退房后寄存，回城前取回", cue: "当晚必须回到开罗" },
  { id: "d8", number: 8, date: "2026-11-26", weekday: "周四", city: "开罗 → CAI", title: "老城 · 晚上去机场", route: "Downtown → CAI", stay: "无强制酒店夜；日用房另计", luggage: "白天酒店寄存，傍晚取箱", cue: "目标 21:00 抵达机场" },
  { id: "d9", number: 9, date: "2026-11-27", weekday: "周五", city: "CAI 离境", title: "00:30 国际航班", route: "CAI → 国际离境", stay: "—", luggage: "26 日晚上已带行李进机场", cue: "赴机场提醒设在 26 日" },
];

function numberedSections(source: string): EgyptGuide["sections"] {
  const markers = [...source.matchAll(/^## (\d+)\. (.+)$/gm)];
  const sections: EgyptGuide["sections"] = {};
  for (let index = 0; index < markers.length; index++) {
    const marker = markers[index];
    const number = Number(marker[1]);
    const start = marker.index! + marker[0].length;
    const end = markers[index + 1]?.index ?? source.length;
    sections[number] = { title: marker[2].trim(), markdown: source.slice(start, end).trim() };
  }
  if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 11].some(number => !sections[number]) || sections[10]) {
    throw new Error("Egypt itinerary guide is missing a public section or includes internal instructions");
  }
  return sections;
}

export function getEgyptGuide(): EgyptGuide {
  const source = readFileSync(join(process.cwd(), "content/travel/egypt2026/guide.md"), "utf8");
  const sections = numberedSections(source);
  const dayMarkers = [...sections[3].markdown.matchAll(/^### D(\d+)｜(.+)$/gm)];
  if (dayMarkers.length !== DAY_SUMMARIES.length) throw new Error("Egypt itinerary day count changed");
  const days = dayMarkers.map((marker, index) => {
    const number = Number(marker[1]);
    if (number !== index + 1) throw new Error(`Unexpected Egypt itinerary day D${number}`);
    const start = marker.index! + marker[0].length;
    const end = dayMarkers[index + 1]?.index ?? sections[3].markdown.length;
    return { ...DAY_SUMMARIES[index], markdown: sections[3].markdown.slice(start, end).trim() };
  });
  const checklist = [...sections[9].markdown.matchAll(/^- \[ \] (.+)$/gm)].map(match => match[1]);
  const rhythm = sections[9].markdown.split(/^### 复核节奏\s*$/m)[1]?.trim();
  if (checklist.length < 10 || !rhythm) throw new Error("Egypt itinerary checklist or review rhythm is missing");
  return { days, sections, checklist, reviewRhythm: rhythm };
}
