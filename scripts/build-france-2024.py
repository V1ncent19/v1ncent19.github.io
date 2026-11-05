"""Create a public draft from reviewed, private manuscript data.

Usage: python scripts/build-france-2024.py --review-dir <private-review-dir>
The script intentionally copies no original images, private addresses or raw
review JSON into the site's public asset tree.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from france_2024_editorial import organize_story

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content" / "travel" / "france-2024"

HAN_LATIN_BOUNDARY = re.compile(r"(?<=[\u3400-\u9fff])(?=[A-Za-z0-9])|(?<=[A-Za-z0-9])(?=[\u3400-\u9fff])")

def text_spacing(value: str) -> str:
    """Apply the site's Chinese/Latin spacing rule to display prose only."""
    return HAN_LATIN_BOUNDARY.sub(" ", value)

DAY_TITLES = {
    "2024-03-14": ("初到巴黎", "Arrival in Paris"),
    "2024-03-15": ("凡尔赛与卢浮宫", "Versailles and the Louvre"),
    "2024-03-16": ("铁塔与博物馆们", "The Eiffel Tower and Museums"),
    "2024-03-17": ("雨中巴黎", "Paris in the Rain"),
    "2024-03-18": ("左岸", "The Left Bank"),
    "2024-03-19": ("科隆一日", "A Day in Cologne"),
    "2024-03-20": ("阿姆斯特丹", "Amsterdam"),
    "2024-03-21": ("重返巴黎", "Back to Paris"),
    "2024-03-22": ("右岸", "The Right Bank"),
    "2024-03-23": ("拾遗", "Odds and Ends"),
    "2024-03-24": ("鲁昂一日", "A Day in Rouen"),
    "2024-03-25": ("返程", "The Journey Home"),
}

def block_day(source_id: str) -> str | None:
    if source_id.startswith("S3039-") or source_id == "S3040-01": return "2024-03-14"
    if source_id.startswith("S3040-") or source_id.startswith("S3041-"):
        return "2024-03-21" if source_id == "S3041-07" else "2024-03-15"
    if source_id.startswith("S3042-") or source_id.startswith("S3043-"): return "2024-03-16"
    if source_id.startswith("S3044-") or source_id.startswith("S3045-"): return "2024-03-17"
    if source_id.startswith("S3046-") or source_id in ("S3047-01", "S3047-02"): return "2024-03-18"
    if source_id.startswith("S3047-") or source_id.startswith("S3048-") or source_id in ("S3049-01", "S3049-02"): return "2024-03-19"
    if source_id.startswith("S3049-") or source_id.startswith("S3050-") or source_id == "J00": return "2024-03-20"
    if source_id.startswith("J21-") or source_id == "S3055-02": return "2024-03-21"
    if source_id.startswith("J22-") or source_id == "S3052-01": return "2024-03-22"
    if source_id.startswith("S3052-") or source_id == "S3053-01": return "2024-03-23"
    if source_id.startswith("S3053-"): return "2024-03-24"
    return None

FOCUS_BY_TITLE = [
    ("戴高乐机场", "cdg"), ("奥赛", "orsay"), ("罗丹", "rodin"),
    ("蒙马特", "sacre-coeur"), ("圣心堂", "sacre-coeur"),
    ("圣米歇尔", "saint-michel"), ("凡尔赛", "versailles"),
    ("荣军院", "invalides"), ("拿破仑墓", "invalides"),
    ("亚历山大三世桥", "pont-alexandre"), ("小皇宫", "petit-palais"),
    ("海军府", "marine"), ("卢浮宫站", "louvre"), ("卢浮宫", "louvre"),
    ("中央邮局", "louvre-poste"), ("玛蒙丹", "marmottan"),
    ("吉美", "guimet"), ("建筑与遗产", "architecture"),
    ("比尔阿克姆", "bir-hakeim"), ("铁塔", "eiffel"),
    ("圣母院", "notre-dame"), ("橘园", "orangerie"),
    ("玛德莱娜", "madeleine"), ("圣奥古斯丁", "saint-augustin"),
    ("歌剧院", "opera"), ("古监狱", "conciergerie"),
    ("货币博物馆", "monnaie"), ("市政厅", "hotel-ville"),
    ("蓬皮杜", "pompidou"), ("枫丹白露", "fontainebleau"),
    ("凯旋门", "arc"), ("邮政博物馆", "poste-museum"),
    ("先贤祠", "pantheon"), ("卢森堡", "luxembourg"),
    ("巧克力", "chocolate"), ("香水博物馆", "farina"),
    ("科隆大教堂", "koln-dom"), ("霍亨索伦", "hohenzollern"),
    ("科隆车站", "koln-hbf"), ("巴黎北站", "gare-nord"),
    ("铸币塔", "munttoren"), ("伦勃朗广场", "rembrandtplein"),
    ("梵高", "van-gogh"), ("国家海事", "maritime"),
    ("伦勃朗故居", "rembrandthuis"), ("水坝", "dam"),
    ("运河博物馆", "canal-museum"), ("桑斯安斯", "zaanse"),
    ("国立博物馆", "rijksmuseum"), ("皇家宫殿", "palais-royal"),
    ("BnF", "bnf"), ("圣厄斯塔什", "saint-eustache"),
    ("拉雪兹", "pere-lachaise"), ("雨果故居", "hugo"),
    ("圣礼拜堂", "sainte-chapelle"), ("梅里爱", "melies"),
    ("卡蒙多", "camondo"), ("鲁昂美术馆", "rouen-art"),
    ("鲁昂大教堂", "rouen-cathedral"), ("圣马卢", "saint-maclou"),
]

def write(name: str, value: object):
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--review-dir", required=True, type=Path)
    args = parser.parse_args()
    private = args.review_dir
    reviewed = json.loads((private / "reconciled-data.json").read_text(encoding="utf-8"))
    blocks = json.loads((private / "journal-blocks.json").read_text(encoding="utf-8"))
    ledger = json.loads((private / "route-ledger-v2.json").read_text(encoding="utf-8"))
    stays = json.loads((private / "private-accommodations.json").read_text(encoding="utf-8"))
    item_by_id = {x["id"]: x for p in reviewed["pages"] if p["category"] == "journal" for x in p["items"]}
    days = []
    by_date = {}
    for source in reviewed["days"]:
        date = source["date"]
        title, subtitle = DAY_TITLES[date]
        day = {
            "id": "day-" + date[5:].replace("-", ""), "date": date,
            "title": title, "subtitle": subtitle, "city": source["city"],
            "mapSources": source["mapSources"].split(",") if source["mapSources"] else [],
            "blocks": [],
            "events": [{"id": e["id"], "time": e["time"], "text": text_spacing(e["text"]),
                        "note": "16:45 是原定到达；实际到站时间未知。" if e["id"] == "S3037-10" else None}
                       for e in source["events"]],
        }
        days.append(day)
        by_date[date] = day
    afterword = []
    for block in blocks:
        source_id = block["sourceIds"][0]
        source_item = item_by_id[source_id]
        title = source_item["title"]
        focus = next((place for keyword, place in FOCUS_BY_TITLE if keyword in title), None)
        item = {"id": source_id.lower(), "title": text_spacing(title), "text": text_spacing(block["text"].strip()),
                "sourceIds": block["sourceIds"], "focusPlaceId": focus}
        date = block_day(source_id)
        (by_date[date]["blocks"] if date else afterword).append(item)
    # The notebook is partly arranged by first visit and later reflection.
    # March 21 is the clearest cross-page case: Rijksmuseum in Amsterdam,
    # Eurostar back to Paris, Lafayette roof, then Louvre exterior at sunset.
    march21 = by_date["2024-03-21"]["blocks"]
    order21 = ["j21-h", "j21-01", "j21-02", "s3055-02", "j21-03", "j21-04", "s3041-07"]
    assert {item["id"] for item in march21} == set(order21)
    march21.sort(key=lambda item: order21.index(item["id"]))
    assert sum(len(d["blocks"]) for d in days) + len(afterword) == len(blocks) == 80
    assert sum(len(d["events"]) for d in days) == 92
    story = {
        "schemaVersion": 1, "title": "2024 欧洲春游", "subtitle": "从手写纸页重建的巴黎、科隆与阿姆斯特丹旅程",
        "intro": "2024 年三月，我带着纸质手记走过法国，也途经科隆与阿姆斯特丹。沿途的博物馆、街道与偶遇的人和事，都留在了这些纸页里。",
        "dateLabel": "2024.03.14 — 03.25", "days": days, "afterword": afterword,
        "readingPolicy": "正文沿用本人核对后的手写稿，仅合并跨页续句；涉及其他日期的插叙保留原叙述。地图是后期重建。",
    }
    story = organize_story(story)
    routes = {
        "schemaVersion": 1,
        "basis": "route-ledger-v2.json; all geometry absent in source",
        "geometryPolicy": "All connectors on the draft map are schematic endpoint links, never observed GPS paths.",
        "legs": [{
            "id": leg["id"], "date": leg["date"], "from": leg["from"], "to": leg["to"],
            "mode": leg["resolvedMode"], "modeBasis": leg["modeBasis"],
            "via": [{"place": v["place"], "precedingMode": v["precedingMode"]} for v in leg["via"]],
            "metroCandidate": leg["metroInference"]["candidate"] if leg["metroInference"] else None,
            "metroGrade": leg["metroInference"]["grade"] if leg["metroInference"] else None,
            "sourceRefs": leg["sourceRefs"], "geometry": None,
        } for leg in ledger["legs"]],
    }
    serialized = json.dumps([story, routes], ensure_ascii=False)
    for stay in stays:
        assert stay["address"] not in serialized, "Private stay address leaked"
    assert len(routes["legs"]) == 135
    write("story.json", story)
    write("routes.json", routes)
    print(f"wrote {len(days)} days, {len(blocks)} merged manuscript blocks, 92 events, 135 route legs")

if __name__ == "__main__":
    main()
