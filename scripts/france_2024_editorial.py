"""Turn reviewed manuscript fragments into place-led reading chapters.

Keep the transcription in the original order and retain every source ID. The
rules below only move manuscript headings and daily weather into page metadata,
then join explicit continuations from the same place or episode.
"""

from __future__ import annotations

import json
import re
from pathlib import Path


CONTINUATION_PARENT = {
    "s3039-04": "s3039-03",  # Musée d'Orsay
    "s3040-04": "s3040-03",  # Versailles garden
    "s3041-06": "s3041-05",  # Louvre sentence across a page break
    "s3043-03": "s3043-02", "s3043-04": "s3043-02",  # Eiffel views
    "s3045-04": "s3045-03",  # Centre Pompidou
    "s3048-04": "s3048-03",  # Köln station episode
    "j21-01": "j21-h", "j21-02": "j21-h",  # Rijksmuseum
    "j21-04": "j21-03",  # Lafayette rooftop
    "s3052-03": "s3052-02",  # Père-Lachaise visit list
}

DATE_HEADER_IDS = {"s3039-01", "s3040-02", "s3042-01", "s3044-01", "s3046-01",
                   "s3047-03", "s3049-03", "j21-h", "j22-h", "s3052-02", "s3053-02"}
NO_PLACE_HEADING_IDS = {"s3041-07"}
FOCUS_CORRECTIONS = {"j21-h": "rijksmuseum", "s3043-04": "eiffel", "s3052-03": "pere-lachaise"}
TITLE_CORRECTIONS = {"s3041-07": "卢浮宫 · 晚霞与修复"}

# Source S3039-03 gives sixteen titles and a parallel, handwritten artist line.
# The fifteenth attribution is corrected against the Musée d'Orsay catalogue.
ORSAY_TITLES = [
    "奥林匹亚", "草地午餐", "煎饼磨坊的舞会", "芭蕾舞课", "议会大楼", "鲁昂大教堂",
    "睡莲", "圣维克多山", "在阿尔的卧室", "自画像", "星夜", "母亲的画像",
    "晚祷", "拾穗者", "罗马人的堕落", "加歇医生像",
]
ORSAY_ARTISTS = [
    "马奈", "马奈", "雷诺阿", "德加", "莫奈", "莫奈", "莫奈", "塞尚",
    "梵高", "梵高", "梵高", "惠斯勒", "米勒", "米勒", "托马·库图尔", "梵高",
]
WORK_TITLES_BY_BLOCK = {
    "s3039-05": ["沉思者", "地狱之门", "吻"],
    "s3041-05": ["蒙娜丽莎", "迦拿的婚礼", "美杜莎之筏", "大宫女", "拿破仑一世加冕",
                 "荷拉斯兄弟之誓", "马拉之死", "岩间圣母", "弗朗索瓦一世像", "巴别塔",
                 "画家和他的妻子", "马赛骏马", "自由引导人民"],
    "s3042-02": ["日出·印象"],
    "s3043-01": ["盗梦空间"],
    "s3045-03": ["New York City"],
    "s3046-02": ["马赛曲"],
    "s3048-01": ["鲁昂大教堂"],
    "s3049-04": ["向日葵", "杏花", "自画像", "黄房子", "作画中的高更", "麦田群鸦"],
    "s3053-01": ["雨果", "飞向月球"],
    "s3053-03": ["鲁昂大教堂"],
}


def format_work_titles(story: dict) -> None:
    """Apply the site-wide work-title marks without changing ordinary quotations."""
    for day in story["days"]:
        for block in day["blocks"]:
            identifier = block["id"]
            text = block["text"]
            if identifier == "s3039-03" and "[行间作者注]" in text:
                first_line, rest = text.split("\n", 1)
                titles = re.findall(r"“([^”]+)”", first_line)
                assert titles == ORSAY_TITLES, "Orsay title order changed; review the artist mapping"
                artist_line, rest = rest.split("\n", 1)
                assert artist_line.startswith("[行间作者注] ")
                source_artists = re.split(r"[、；。]", artist_line.removeprefix("[行间作者注] ").rstrip("。"))
                assert len(source_artists) == len(ORSAY_ARTISTS)
                assert source_artists[:14] == ORSAY_ARTISTS[:14] and source_artists[14:] == ["库尔贝", "梵高"]
                original_list = "、".join(f"“{title}”" for title in titles)
                formatted_list = "、".join(f"『{title}』（{artist}）" for title, artist in zip(titles, ORSAY_ARTISTS))
                first_line = first_line.replace(original_list, formatted_list)
                text = first_line + "\n" + rest
            if identifier == "s3039-03":
                text = text.replace("有煎饼磨坊的舞会", "有『煎饼磨坊的舞会』")
            if identifier == "s3041-05":
                text = text.replace("“自画像（伦勃朗）”", "『自画像』（伦勃朗）")
                text = text.replace("“自画像（德拉克洛瓦）”", "『自画像』（德拉克洛瓦）")
                for title in ("汉谟拉比法典", "萨莫色雷斯的胜利女神", "断臂的维纳斯"):
                    text = text.replace(title, f"『{title}』") if f"『{title}』" not in text else text
            if identifier == "s3042-02":
                text = text.replace("多幅莫奈睡莲", "多幅莫奈『睡莲』")
            for title in WORK_TITLES_BY_BLOCK.get(identifier, []):
                text = text.replace(f"“{title}”", f"『{title}』")
            text = re.sub(r"《([^》]+)》", r"『\1』", text)
            block["text"] = text


def apply_author_visit_correction(story: dict) -> None:
    """Keep the author's later correction over the original timetable label."""
    day = next(day for day in story["days"] if day["date"] == "2024-03-17")
    events = day["events"]
    pierre = next(event for event in events if event["id"] == "T17-05")
    if pierre["time"] is None and "下午茶" in pierre["text"]:
        return
    assert pierre["time"] == "12:40" and "午餐" in pierre["text"]
    events.remove(pierre)
    pierre.update(time=None, text="下午茶 · Pierre Hermé（歌剧院后；具体时间未记）",
                  note="原时刻表写 12:40 午餐；作者后续确认是歌剧院后的下午茶。")
    opera = next(index for index, event in enumerate(events) if event["id"] == "T17-06")
    events.insert(opera + 1, pierre)


def organize_story(story: dict) -> dict:
    if story.get("schemaVersion") == 2:
        apply_author_visit_correction(story)
        format_work_titles(story)
        return story
    assert story.get("schemaVersion") == 1
    apply_author_visit_correction(story)
    before = [source for day in story["days"] for block in day["blocks"] for source in block["sourceIds"]]
    assert len(story["days"]) == 12 and len(before) == len(set(before)) == 79
    seen_continuations = set()
    seen_date_headers = set()

    for day in story["days"]:
        chapters = []
        header_sources = []
        for fragment in day["blocks"]:
            identifier = fragment["id"]
            lines = fragment["text"].strip().splitlines()
            if identifier == "s3039-01":
                day["note"] = lines.pop(0)
                header_sources.extend(fragment["sourceIds"])
            if identifier in DATE_HEADER_IDS:
                seen_date_headers.add(identifier)
                day["weather"] = lines.pop(0)
            if identifier == "j22-h":
                header_sources.extend(fragment["sourceIds"])
                assert not lines
                continue
            if identifier == "s3039-01":
                assert not lines
                continue

            if identifier in CONTINUATION_PARENT or identifier in NO_PLACE_HEADING_IDS:
                heading = TITLE_CORRECTIONS.get(identifier, fragment["title"])
            else:
                assert lines, f"missing manuscript heading in {identifier}"
                heading = lines.pop(0).strip()
            body = "\n".join(lines).strip()
            assert body or identifier == "j21-h", f"empty chapter body in {identifier}"

            if identifier in CONTINUATION_PARENT:
                seen_continuations.add(identifier)
                assert chapters, f"continuation without a chapter: {identifier}"
                previous = chapters[-1]
                assert previous["id"] == CONTINUATION_PARENT[identifier], f"wrong chapter for {identifier}"
                # A page break can occur inside a sentence (the Louvre note).
                separator = "" if previous["text"].endswith(("，", "、")) else "\n\n" if previous["text"] else ""
                previous["text"] += separator + body
                previous["sourceIds"].extend(fragment["sourceIds"])
                continue

            chapters.append({"id": identifier, "title": heading, "text": body,
                             "sourceIds": list(fragment["sourceIds"]),
                             "focusPlaceId": FOCUS_CORRECTIONS.get(identifier, fragment["focusPlaceId"])})

        day["blocks"] = chapters
        assert all(chapter["text"] for chapter in chapters)
        if header_sources:
            day["headerSourceIds"] = header_sources
    assert seen_continuations == set(CONTINUATION_PARENT)
    assert seen_date_headers == DATE_HEADER_IDS
    after = [source for day in story["days"] for block in day["blocks"] for source in block["sourceIds"]]
    after += [source for day in story["days"] for source in day.get("headerSourceIds", [])]
    assert sorted(after) == sorted(before), "a manuscript source was lost or duplicated"
    assert sum(len(day["blocks"]) for day in story["days"]) == 62
    for block in story["afterword"]:
        lines = block["text"].strip().splitlines()
        if block["id"] == "s3054-01":
            assert lines.pop(0) == "杂记"
        block["title"] = lines.pop(0).strip()
        block["text"] = "\n".join(lines).strip()
        assert block["text"]
    story["schemaVersion"] = 2
    story["readingPolicy"] = "正文按景点与事件成章；中法双语原题移入章节标题，手稿天气移入日期信息。原文顺序与来源编号保留；地图为后期重建。"
    format_work_titles(story)
    return story


if __name__ == "__main__":
    path = Path(__file__).resolve().parents[1] / "content/travel/france-2024/story.json"
    story = organize_story(json.loads(path.read_text(encoding="utf-8")))
    path.write_text(json.dumps(story, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {sum(len(day['blocks']) for day in story['days'])} daily chapters and {len(story['afterword'])} afterword chapters")
