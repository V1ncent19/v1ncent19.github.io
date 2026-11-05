"""One-time cached lookup of public landmarks for the France 2024 draft.

Run manually, once, and review geocode-review.csv. Never pass accommodations
or other private addresses to the geocoder. The site itself does not call it.
"""

from __future__ import annotations

import csv
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content" / "travel" / "france-2024"
CACHE = OUT / "geocode-cache.json"
PLACES = [
    # id, display label, search string, city, aliases used in the route ledger
    ("cdg", "巴黎戴高乐机场", "Aéroport Charles de Gaulle, Roissy-en-France, France", "Paris", ["CDG机场"]),
    ("gare-nord", "巴黎北站", "Gare du Nord, Paris, France", "Paris", ["巴黎北站"]),
    ("gare-lyon", "巴黎里昂站", "Gare de Lyon, Paris, France", "Paris", ["Gare de Lyon", "Gare de Lyon（返程）"]),
    ("saint-lazare", "巴黎圣拉扎尔站", "Gare Saint-Lazare, Paris, France", "Paris", ["巴黎Saint-Lazare站", "圣拉扎尔车站"]),
    ("orsay", "奥赛美术馆", "Musée d'Orsay, Paris, France", "Paris", ["奥赛美术馆"]),
    ("rodin", "罗丹美术馆", "Musée Rodin, Paris, France", "Paris", ["罗丹美术馆"]),
    ("sacre-coeur", "圣心堂", "Basilique du Sacré-Cœur, Paris, France", "Paris", ["蒙马特／圣心堂外（夕阳）", "圣心堂（夜访）"]),
    ("saint-michel", "圣米歇尔喷泉", "Fontaine Saint-Michel, Paris, France", "Paris", ["圣米歇尔喷泉／换乘区域"]),
    ("versailles", "凡尔赛宫", "Château de Versailles, Versailles, France", "Versailles", ["凡尔赛宫"]),
    ("invalides", "荣军院", "Hôtel des Invalides, Paris, France", "Paris", ["荣军院／拿破仑墓"]),
    ("pont-alexandre", "亚历山大三世桥", "Pont Alexandre III, Paris, France", "Paris", ["亚历山大三世桥"]),
    ("petit-palais", "小皇宫", "Petit Palais, Paris, France", "Paris", ["小皇宫"]),
    ("marine", "海军府", "Hôtel de la Marine, Paris, France", "Paris", ["海军府"]),
    ("louvre", "卢浮宫", "Musée du Louvre, Paris, France", "Paris", ["卢浮宫（首次入馆）", "卢浮宫（第二次入馆）", "装饰艺术馆／卢浮宫外晚霞区域"]),
    ("louvre-poste", "卢浮宫邮局", "La Poste du Louvre, Paris, France", "Paris", ["卢浮宫邮局"]),
    ("marmottan", "玛蒙丹·莫奈美术馆", "Musée Marmottan Monet, Paris, France", "Paris", ["玛蒙丹·莫奈美术馆"]),
    ("guimet", "吉美亚洲艺术博物馆", "Musée Guimet, Paris, France", "Paris", ["吉美亚洲艺术博物馆"]),
    ("architecture", "建筑与遗产之城", "Cité de l'architecture et du patrimoine, Paris, France", "Paris", ["建筑与遗产之城"]),
    ("trocadero", "特罗卡德罗", "Place du Trocadéro, Paris, France", "Paris", ["特罗卡德罗花园", "Trocadéro广场"]),
    ("bir-hakeim", "比尔阿克姆桥", "Pont de Bir-Hakeim, Paris, France", "Paris", ["比尔阿克姆桥"]),
    ("eiffel", "埃菲尔铁塔", "Tour Eiffel, Paris, France", "Paris", ["埃菲尔铁塔"]),
    ("montparnasse", "蒙帕纳斯", "Tour Montparnasse, Paris, France", "Paris", ["蒙帕纳斯附近（未登塔）"]),
    ("notre-dame", "巴黎圣母院", "Cathédrale Notre-Dame de Paris, France", "Paris", ["巴黎圣母院外"]),
    ("orangerie", "橘园美术馆", "Musée de l'Orangerie, Paris, France", "Paris", ["橘园美术馆"]),
    ("madeleine", "玛德莱娜教堂", "Église de la Madeleine, Paris, France", "Paris", ["玛德莱娜教堂"]),
    ("saint-augustin", "圣奥古斯丁教堂", "Église Saint-Augustin, Paris, France", "Paris", ["圣奥古斯丁教堂"]),
    ("opera", "巴黎歌剧院", "Palais Garnier, Paris, France", "Paris", ["巴黎歌剧院"]),
    ("conciergerie", "古监狱", "Conciergerie, Paris, France", "Paris", ["古监狱"]),
    ("monnaie", "货币博物馆", "Monnaie de Paris, Paris, France", "Paris", ["货币博物馆"]),
    ("hotel-ville", "巴黎市政厅", "Hôtel de Ville, Paris, France", "Paris", ["巴黎市政厅"]),
    ("pompidou", "蓬皮杜中心", "Centre Pompidou, Paris, France", "Paris", ["蓬皮杜中心"]),
    ("fontainebleau-station", "Fontainebleau–Avon 站", "Gare de Fontainebleau Avon, France", "Fontainebleau", ["Fontainebleau–Avon站", "Fontainebleau–Avon站（返程）"]),
    ("fontainebleau", "枫丹白露宫", "Château de Fontainebleau, France", "Fontainebleau", ["枫丹白露宫"]),
    ("arc", "凯旋门", "Arc de Triomphe, Paris, France", "Paris", ["凯旋门"]),
    ("poste-museum", "邮政博物馆", "Musée de la Poste, Paris, France", "Paris", ["邮政博物馆"]),
    ("pantheon", "先贤祠", "Panthéon, Paris, France", "Paris", ["先贤祠"]),
    ("luxembourg", "卢森堡公园", "Jardin du Luxembourg, Paris, France", "Paris", ["卢森堡公园"]),
    ("palais-royal", "皇家宫殿", "Palais Royal, Paris, France", "Paris", ["皇家宫殿"]),
    ("decorative-arts", "装饰艺术馆", "Musée des Arts Décoratifs, Paris, France", "Paris", ["装饰艺术馆"]),
    ("bnf", "BnF 黎塞留馆", "Bibliothèque nationale de France Richelieu, Paris, France", "Paris", ["BnF黎塞留馆"]),
    ("saint-eustache", "圣厄斯塔什教堂", "Église Saint-Eustache, Paris, France", "Paris", ["圣厄斯塔什教堂"]),
    ("pere-lachaise", "拉雪兹公墓", "Cimetière du Père Lachaise, Paris, France", "Paris", ["拉雪兹公墓"]),
    ("hugo", "雨果故居", "Maison de Victor Hugo, Paris, France", "Paris", ["雨果故居"]),
    ("sainte-chapelle", "圣礼拜堂", "Sainte-Chapelle, Paris, France", "Paris", ["圣礼拜堂"]),
    ("melies", "梅里爱博物馆", "Cinémathèque française, Paris, France", "Paris", ["梅里爱博物馆"]),
    ("picasso", "毕加索博物馆", "Musée Picasso, Paris, France", "Paris", ["毕加索博物馆"]),
    ("camondo", "卡蒙多博物馆", "Musée Nissim de Camondo, Paris, France", "Paris", ["卡蒙多博物馆"]),
    ("monceau", "蒙索公园", "Parc Monceau, Paris, France", "Paris", ["蒙索公园"]),
    ("henner", "Henner 博物馆", "Musée national Jean-Jacques Henner, Paris, France", "Paris", ["Henner博物馆"]),
    ("pont-alma", "Pont de l’Alma", "Pont de l'Alma, Paris, France", "Paris", []),
    ("saint-michel-rer", "Saint-Michel–Notre-Dame 站", "Saint-Michel Notre-Dame RER, Paris, France", "Paris", ["Saint-Michel–Notre-Dame站"]),
    ("koln-hbf", "科隆中央车站", "Köln Hauptbahnhof, Köln, Germany", "Cologne", ["科隆中央车站", "科隆中央车站（返程）"]),
    ("chocolate", "巧克力博物馆", "Schokoladenmuseum, Köln, Germany", "Cologne", ["巧克力博物馆"]),
    ("farina", "Farina 香水博物馆", "Farina Duftmuseum, Köln, Germany", "Cologne", ["Farina香水博物馆"]),
    ("koln-dom", "科隆大教堂", "Kölner Dom, Köln, Germany", "Cologne", ["科隆大教堂"]),
    ("hohenzollern", "霍亨索伦桥", "Hohenzollernbrücke, Köln, Germany", "Cologne", ["霍亨索伦桥"]),
    ("koln-triangle", "KölnTriangle", "KölnTriangle, Köln, Germany", "Cologne", ["KölnTriangle"]),
    ("ams-centraal", "阿姆斯特丹中央车站", "Amsterdam Centraal, Netherlands", "Amsterdam", ["阿姆斯特丹中央车站"]),
    ("rembrandtplein", "伦勃朗广场", "Rembrandtplein, Amsterdam, Netherlands", "Amsterdam", ["伦勃朗像"]),
    ("munttoren", "铸币塔", "Munttoren, Amsterdam, Netherlands", "Amsterdam", ["铸币塔"]),
    ("van-gogh", "梵高博物馆", "Van Gogh Museum, Amsterdam, Netherlands", "Amsterdam", ["梵高博物馆"]),
    ("maritime", "国家海事博物馆", "Het Scheepvaartmuseum, Amsterdam, Netherlands", "Amsterdam", ["国家海事博物馆"]),
    ("rembrandthuis", "伦勃朗故居", "Museum Rembrandthuis, Amsterdam, Netherlands", "Amsterdam", ["伦勃朗故居"]),
    ("dam", "水坝广场", "Dam Square, Amsterdam, Netherlands", "Amsterdam", ["水坝广场／皇宫"]),
    ("canal-museum", "运河博物馆", "Het Grachtenhuis, Herengracht, Amsterdam, Netherlands", "Amsterdam", ["运河博物馆"]),
    ("zaandijk-station", "Zaandijk Zaanse Schans 站", "Zaandijk Zaanse Schans railway station, Netherlands", "Zaanse", ["Zaandijk Zaanse Schans站", "Zaandijk Zaanse Schans站（返程）"]),
    ("zaanse", "桑斯安斯风车村", "Zaanse Schans, Zaandam, Netherlands", "Zaanse", ["Pier - best photos of the mills／风车村观光区"]),
    ("rijksmuseum", "荷兰国立博物馆", "Rijksmuseum, Amsterdam, Netherlands", "Amsterdam", ["荷兰国立博物馆"]),
    ("rouen-station", "鲁昂站", "Rouen Rive Droite railway station, Rouen, France", "Rouen", ["鲁昂站", "鲁昂站（返程）"]),
    ("rouen-joan", "圣女贞德塔", "Tour Jeanne d'Arc, Rouen, France", "Rouen", ["圣女贞德塔"]),
    ("rouen-art", "鲁昂美术馆", "Musée des Beaux-Arts de Rouen, France", "Rouen", ["鲁昂美术馆"]),
    ("gros-horloge", "大时钟", "Gros-Horloge, Rouen, France", "Rouen", ["大时钟"]),
    ("rouen-cathedral", "鲁昂大教堂", "Cathédrale Notre-Dame de Rouen, France", "Rouen", ["鲁昂大教堂"]),
    ("saint-maclou", "Saint-Maclou 教堂", "Église Saint-Maclou, Rouen, France", "Rouen", ["Saint-Maclou教堂"]),
    # Public businesses or institutions named in the reviewed ledger. The
    # specific branches below have an address or a unique public identity.
    ("le-florentin", "Le Florentin", "10 Rue Saint-Florentin, Paris, France", "Paris", ["Le Florentin晚餐"]),
    ("pierre-herme-opera", "Pierre Hermé Opéra", "39 Avenue de l'Opéra, Paris, France", "Paris", ["Pierre Hermé Opéra店"]),
    ("shakespeare-bookshop", "Shakespeare and Company", "Shakespeare and Company, Paris, France", "Paris", ["莎士比亚书店"]),
    ("pedra-alta-marbeuf", "Pedra Alta Marbeuf", "25 Rue Marbeuf, Paris, France", "Paris", ["Pedra Alta午餐（25 Rue Marbeuf）"]),
    ("augustiner-heumarkt", "Augustiner am Heumarkt", "Heumarkt 42, Köln, Germany", "Cologne", ["Augustiner午餐"]),
    ("the-pantry", "The Pantry", "The Pantry, Leidsekruisstraat 21, Amsterdam, Netherlands", "Amsterdam", ["The Pantry午餐"]),
    ("la-jacobine", "La Jacobine", "La Jacobine, Paris, France", "Paris", ["La Jacobine午餐"]),
    ("institut-de-france", "Institut de France", "Institut de France, Paris, France", "Paris", ["法兰西学院"]),
]

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    for index, (ident, label, query, city, aliases) in enumerate(PLACES, 1):
        if ident in cache and cache[ident]["query"] == query:
            continue
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({"q": query, "format": "jsonv2", "limit": 3})
        request = urllib.request.Request(url, headers={"User-Agent": "V1ncent19-France2024-private-draft/0.1 (personal travel log; one-time geocoding)"})
        try:
            results = json.load(urllib.request.urlopen(request, timeout=20))
        except Exception as exc:
            print(f"{index}/{len(PLACES)} {ident}: ERROR {exc}", flush=True)
            results = []
        cache[ident] = {"label": label, "query": query, "city": city, "aliases": aliases,
                        "results": [{k: x.get(k) for k in ("name", "lat", "lon", "category", "type", "display_name", "osm_type", "osm_id")} for x in results]}
        CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{index}/{len(PLACES)} {ident}: {results[0]['display_name'][:70] if results else 'NO RESULT'}", flush=True)
        time.sleep(1.15)
    with (OUT / "geocode-review.csv").open("w", encoding="utf-8-sig", newline="") as out:
        writer = csv.writer(out)
        writer.writerow(["id", "label", "query", "city", "lat", "lon", "returnedName", "returnedAddress", "alternatives"])
        for ident, label, query, city, _ in PLACES:
            results = cache[ident]["results"]
            best = results[0] if results else {}
            writer.writerow([ident, label, query, city, best.get("lat", ""), best.get("lon", ""), best.get("name", ""), best.get("display_name", ""), " | ".join(x.get("display_name", "") for x in results[1:])])

if __name__ == "__main__":
    main()
