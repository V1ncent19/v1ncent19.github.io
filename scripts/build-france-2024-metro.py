"""Reconstruct reviewed Paris metro candidates on the pre-trip IDFM rail network.

The 2023-12-12 trace predates the March 2024 journey. Current station points
are used only to locate existing station names along that older physical trace.
No train GPS, ticket evidence, timetable or walking transfer is inferred.
"""

from __future__ import annotations

import argparse
import heapq
import json
import math
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "travel" / "france-2024"
CACHE = CONTENT / "metro-network-source-cache.json"
OUTPUT = CONTENT / "metro-geometries.json"
LINE_CODES = {str(number) for number in [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14]}
TRIP_END = "2024-03-25"
TRACK_RESOURCE = "https://www.data.gouv.fr/api/1/datasets/r/89de0964-ce4d-4546-9ed9-429b7e9b3008"
STATIONS = "https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/emplacement-des-gares-idf/records"
HEADERS = {"User-Agent": "v1ncent19.github.io France route review (contact: github.com/v1ncent19)"}

# Each pair is a station-to-station *candidate* from route-ledger v2. A landmark
# is not silently treated as a metro station, and alternatives without a
# defensible boarding/alighting pair are intentionally absent.
METRO_LEGS: dict[str, list[tuple[str, str, str]]] = {
    "L0314-05": [("12", "Solférino", "Pigalle")],
    "L0315-10": [("8", "Concorde", "Strasbourg-Saint-Denis")],
    "L0316-03": [("9", "La Muette", "Iéna")],
    "L0316-04": [("9", "Iéna", "Trocadéro")],
    "L0316-08": [("6", "Bir-Hakeim", "Montparnasse-Bienvenüe")],
    "L0316-09": [("4", "Montparnasse-Bienvenüe", "Les Halles")],
    "L0317-01": [("8", "Strasbourg-Saint-Denis", "Concorde")],
    "L0317-14": [("2", "Blanche", "Barbès-Rochechouart"),
                  ("4", "Barbès-Rochechouart", "Strasbourg-Saint-Denis")],
    "L0318-06": [("1", "Gare de Lyon", "Franklin D. Roosevelt")],
    "L0318-08": [("6", "Charles De Gaulle-Étoile", "Montparnasse-Bienvenüe")],
    "L0321-06": [("7", "Chaussée d'Antin - La Fayette", "Palais Royal - Musée du Louvre")],
    "L0322-05": [("4", "Les Halles", "Odéon")],
    "L0323-01": [("13", "Varenne", "Saint-Lazare"),
                  ("3", "Saint-Lazare", "Père Lachaise")],
    "L0323-03": [("1", "Bastille", "Châtelet")],
    "L0323-04": [("14", "Châtelet", "Bibliothèque François Mitterrand")],
    "L0324-13": [("13", "Saint-Lazare", "Miromesnil"),
                  ("9", "Miromesnil", "Trocadéro")],
}


def get_json(url: str, params: dict | None = None) -> dict:
    full_url = f"{url}?{urlencode(params)}" if params else url
    with urlopen(Request(full_url, headers=HEADERS), timeout=60) as response:
        return json.load(response)


def fetch() -> None:
    tracks = get_json(TRACK_RESOURCE)["features"]
    selected = [feature for feature in tracks
                if feature["properties"].get("mode") == "METRO"
                and str(feature["properties"].get("indice_lig")) in LINE_CODES]
    station_rows = []
    offset = 0
    while True:
        response = get_json(STATIONS, {"where": 'mode="METRO"', "limit": 100, "offset": offset})
        station_rows.extend(response["results"])
        offset += len(response["results"])
        print(f"metro stations {offset}/{response['total_count']}", flush=True)
        if offset >= response["total_count"]:
            break
    stations = [row for row in station_rows if str(row.get("indice_lig")) in LINE_CODES]
    cache = {
        "schemaVersion": 1,
        "trackResource": TRACK_RESOURCE,
        "trackPublished": "2023-12-12",
        "stationDataset": STATIONS,
        "stationPrecision": "Current coordinates for stations existing by March 2024; not journey observations.",
        "tracks": selected,
        "stations": stations,
    }
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"cached {len(selected)} track segments, {len(stations)} station-line points", flush=True)


def inspect() -> None:
    cache = json.loads(CACHE.read_text(encoding="utf-8"))
    for line in sorted(LINE_CODES, key=int):
        tracks = [feature for feature in cache["tracks"] if str(feature["properties"].get("indice_lig")) == line]
        stations = [row for row in cache["stations"] if str(row.get("indice_lig")) == line]
        names = ", ".join(row["nom_gares"] for row in stations)
        print(f"M{line}: {len(tracks)} tracks, {len(stations)} stations | {names}")


def km(a: list[float], b: list[float]) -> float:
    lat1, lat2 = math.radians(a[1]), math.radians(b[1])
    dlat = lat2 - lat1
    dlon = math.radians(b[0] - a[0])
    angle = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 12742 * math.asin(min(1, math.sqrt(angle)))


def geometry_length(coords: list[list[float]]) -> float:
    return sum(km(a, b) for a, b in zip(coords, coords[1:]))


def key(point: list[float]) -> tuple[float, float]:
    return round(point[0], 6), round(point[1], 6)


def network_for(cache: dict, line: str):
    graph: dict[tuple, list[tuple[float, tuple, list[list[float]]]]] = {}
    for feature in cache["tracks"]:
        if str(feature["properties"].get("indice_lig")) != line:
            continue
        opened = feature["properties"].get("date_mes")
        if opened and opened[:10] > TRIP_END:
            continue
        coords = feature["geometry"]["coordinates"]
        if feature["geometry"]["type"] != "LineString" or len(coords) < 2:
            raise ValueError(f"Bad M{line} geometry")
        start, end = key(coords[0]), key(coords[-1])
        distance = geometry_length(coords)
        graph.setdefault(start, []).append((distance, end, coords))
        graph.setdefault(end, []).append((distance, start, list(reversed(coords))))
    # A few official inter-station segments leave 10–80 m gaps at junctions.
    # Bridge only within the same metro line, and fail on larger gaps.
    while True:
        seen = set()
        groups = []
        for node in graph:
            if node in seen:
                continue
            stack = [node]
            seen.add(node)
            group = []
            while stack:
                current = stack.pop()
                group.append(current)
                for _, next_node, _ in graph[current]:
                    if next_node not in seen:
                        seen.add(next_node)
                        stack.append(next_node)
            groups.append(group)
        if len(groups) == 1:
            break
        distance, first, second = min((km(list(a), list(b)), a, b)
                                      for group in groups[1:] for a in groups[0] for b in group)
        if distance > 0.1:
            raise ValueError(f"M{line} historical track has a {distance:.3f} km gap")
        connector = [list(first), list(second)]
        graph[first].append((distance, second, connector))
        graph[second].append((distance, first, list(reversed(connector))))
    station_points = {}
    for station in cache["stations"]:
        if str(station.get("indice_lig")) != line:
            continue
        point = [station["geo_point_2d"]["lon"], station["geo_point_2d"]["lat"]]
        nearest = min(graph, key=lambda node: km(point, list(node)))
        gap = km(point, list(nearest))
        if gap > 0.25:
            continue  # e.g. post-2024 extensions absent from the 2023 trace
        station_points[station["nom_gares"]] = (nearest, gap)
    return graph, station_points


def route(graph: dict, start: tuple, end: tuple) -> list[list[float]]:
    queue = [(0.0, start)]
    best = {start: 0.0}
    previous = {}
    while queue:
        distance, node = heapq.heappop(queue)
        if node == end:
            break
        if distance > best[node]:
            continue
        for cost, next_node, coords in graph[node]:
            candidate = distance + cost
            if candidate < best.get(next_node, float("inf")):
                best[next_node] = candidate
                previous[next_node] = (node, coords)
                heapq.heappush(queue, (candidate, next_node))
    if end not in best:
        raise ValueError(f"Disconnected metro line {start} → {end}")
    parts = []
    node = end
    while node != start:
        prior, coords = previous[node]
        parts.append(coords)
        node = prior
    ordered = list(reversed(parts))
    return [point for index, part in enumerate(ordered) for point in part[index > 0:]]


def build() -> None:
    cache = json.loads(CACHE.read_text(encoding="utf-8"))
    legs = {leg["id"]: leg for leg in json.loads((CONTENT / "routes.json").read_text(encoding="utf-8"))["legs"]}
    networks = {line: network_for(cache, line) for line in LINE_CODES}
    shapes = {}
    for ident, segments in METRO_LEGS.items():
        leg = legs[ident]
        if leg["mode"] != "metro" or not leg["metroCandidate"]:
            raise ValueError(f"Metro ledger changed: {ident}")
        for line, _, _ in segments:
            if f"M{line}" not in leg["metroCandidate"]:
                raise ValueError(f"Metro line candidate changed: {ident} M{line}")
        parts = []
        for line, start_name, end_name in segments:
            graph, stations = networks[line]
            if start_name not in stations or end_name not in stations:
                raise ValueError(f"M{line} station absent from historical network: {start_name} → {end_name}")
            start, start_gap = stations[start_name]
            end, end_gap = stations[end_name]
            if start_gap > 0.15 or end_gap > 0.15:
                raise ValueError(f"M{line} station snap too far: {start_name} {start_gap:.3f}, {end_name} {end_gap:.3f}")
            part = route(graph, start, end)
            if geometry_length(part) > max(2.0, km(list(start), list(end)) * 3.5):
                raise ValueError(f"M{line} candidate detour: {ident}")
            parts.append(part)
        if any(km(before[-1], after[0]) > 0.3 for before, after in zip(parts, parts[1:])):
            raise ValueError(f"Metro transfer gap too large: {ident}")
        rounded_parts = [[[round(point[0], 6), round(point[1], 6)] for point in part] for part in parts]
        geometry = ({"type": "LineString", "coordinates": rounded_parts[0]} if len(parts) == 1 else
                    {"type": "MultiLineString", "coordinates": rounded_parts})
        shapes[ident] = {
            "geometry": geometry,
            "basis": "idfm-2023-metro-track-candidate",
            "review": "station-pair-inferred-not-ticket",
            "sourceUrl": "https://www.data.gouv.fr/datasets/traces-du-reseau-de-transport-ferre-dile-de-france",
            "note": "IDFM physical metro track, excluding segments opened after 25 March 2024, clipped to a station-pair candidate. Boarding, transfer and walking links are not recorded GPS.",
            "viaStations": [f"M{line}: {start} → {end}" for line, start, end in segments],
            "estimatedKm": round(sum(geometry_length(part) for part in rounded_parts), 3),
        }
        print(f"{ident} {leg['metroGrade']} {shapes[ident]['estimatedKm']} km", flush=True)
    OUTPUT.write_text(json.dumps({"schemaVersion": 1, "trackPublished": "2023-12-12", "trackOpeningCutoff": TRIP_END,
                                  "policy": "Metro station pairs are candidates, not confirmed train GPS or exact boarding/transfer walks.",
                                  "geometries": shapes}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {len(shapes)} metro candidates", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--fetch", action="store_true")
    parser.add_argument("--inspect", action="store_true")
    args = parser.parse_args()
    if args.fetch:
        fetch()
    if args.inspect:
        inspect()
    else:
        build()
