"""Build public-endpoint walking candidates and reviewed railway shapes.

The public site never requests routing services. --fetch refreshes the source
cache deliberately and slowly; a normal run is deterministic and offline.
No lodging coordinates, imagined travel times or raw GPS fixes are stored.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import heapq
import json
import math
from pathlib import Path
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "travel" / "france-2024"
CACHE = CONTENT / "route-pilot-source-cache.json"
OUTPUT = CONTENT / "route-geometries.json"
# The cathedral centroid snapped to a west-facing pedestrian entrance; its
# shortest route to Saint-Maclou detours around both buildings. The manuscript
# appears to take the shorter eastern passage, so leave that leg schematic.
EXCLUDE_WALK = {"L0324-10"}
# The Rouen sketch explicitly passes near the town hall on the way back to
# the station. This is a route constraint, not an added visit.
WALK_VIA = {
    # The author confirmed the west bank of the Seine, while the unconstrained
    # router took inland Passy streets. These points keep it on the riverside.
    "L0316-06": [[2.2909, 48.8598]],
    "L0324-11": [[1.099293, 49.443364]],  # Place du Général de Gaulle, outside City Hall
}
VALHALLA = "https://valhalla1.openstreetmap.de/route"
SNCF = "https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/formes-des-lignes-du-rfn/records"
PRORAIL = "https://maps.prorail.nl/arcgis/rest/services/Spoornetwerk/FeatureServer"
PRORAIL_BOX = "4.77,52.36,4.93,52.48"
HEADERS = {"User-Agent": "v1ncent19.github.io route-review (contact: github.com/v1ncent19)",
           "X-Client-Id": "v1ncent19-github-io-route-review"}


def get_json(url: str, params: dict[str, str], *, timeout: int = 35) -> dict:
    request = Request(f"{url}?{urlencode(params)}", headers=HEADERS)
    with urlopen(request, timeout=timeout) as response:
        return json.load(response)


def km(a: list[float], b: list[float]) -> float:
    lat1, lat2 = math.radians(a[1]), math.radians(b[1])
    dlat = lat2 - lat1
    dlon = math.radians(b[0] - a[0])
    angle = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 12742 * math.asin(min(1, math.sqrt(angle)))


def length(coords: list[list[float]]) -> float:
    return sum(km(a, b) for a, b in zip(coords, coords[1:]))


def decode_polyline6(encoded: str) -> list[list[float]]:
    values = []
    index = lat = lon = 0
    while index < len(encoded):
        for axis in range(2):
            result = shift = 0
            while True:
                byte = ord(encoded[index]) - 63
                index += 1
                result |= (byte & 0x1F) << shift
                shift += 5
                if byte < 0x20:
                    break
            delta = ~(result >> 1) if result & 1 else result >> 1
            if axis == 0:
                lat += delta
            else:
                lon += delta
        values.append([lon / 1_000_000, lat / 1_000_000])
    return values


def rounded(coords: list[list[float]]) -> list[list[float]]:
    return [[round(point[0], 6), round(point[1], 6)] for point in coords]


def nearest_index(coords: list[list[float]], point: list[float]) -> tuple[int, float]:
    return min(enumerate(km(coord, point) for coord in coords), key=lambda item: item[1])


def graph_route(features: list[dict], stations: dict[str, list[float]], start: str, end: str):
    graph: dict[str, list[tuple[float, str, list[list[float]]]]] = {}
    for feature in features:
        props = feature["properties"]
        first = props["NAAM_DIENSTREGELPUNT_BEGIN"]
        last = props["NAAM_DIENSTREGELPUNT_EIND"]
        coords = feature["geometry"]["coordinates"]
        if feature["geometry"]["type"] != "LineString" or len(coords) < 2:
            continue
        if first in stations and last in stations:
            direct = km(coords[0], stations[first]) + km(coords[-1], stations[last])
            reverse = km(coords[-1], stations[first]) + km(coords[0], stations[last])
            if reverse < direct:
                coords = list(reversed(coords))
        distance = length(coords)
        graph.setdefault(first, []).append((distance, last, coords))
        graph.setdefault(last, []).append((distance, first, list(reversed(coords))))
    queue = [(0.0, start, [], [])]
    best = {}
    while queue:
        cost, station, path, names = heapq.heappop(queue)
        if station in best:
            continue
        best[station] = cost
        if station == end:
            assert path and length(path) < 40, "Unexpected Dutch rail distance"
            return rounded(path), names + [end]
        for distance, target, coords in graph.get(station, []):
            if target in best:
                continue
            if path and km(path[-1], coords[0]) > 0.35:
                continue
            joined = path + coords[1:] if path else coords
            heapq.heappush(queue, (cost + distance, target, joined, names + [station]))
    raise ValueError(f"No continuous ProRail route {start} → {end}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fetch", action="store_true", help="refresh public routing sources slowly")
    args = parser.parse_args()
    legs = json.loads((CONTENT / "routes.json").read_text(encoding="utf-8"))["legs"]
    places = json.loads((CONTENT / "places.json").read_text(encoding="utf-8"))["places"]
    by_name = {name: place for place in places for name in [place["label"], *place["aliases"]]}
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {"schemaVersion": 1, "walking": {}}
    cache.setdefault("walking", {})
    walking = [leg for leg in legs if leg["mode"] == "walk"
               and leg["id"] not in EXCLUDE_WALK
               and leg["from"] in by_name and leg["to"] in by_name]

    if args.fetch:
        for leg in walking:
            start, end = by_name[leg["from"]]["coordinates"], by_name[leg["to"]]["coordinates"]
            routing_points = [start, *WALK_VIA.get(leg["id"], []), end]
            previous = cache["walking"].get(leg["id"])
            if previous and previous.get("routingPoints", previous["anchors"]) == routing_points:
                continue
            params = {"json": json.dumps({"locations": [{"lat": point[1], "lon": point[0]}
                                                        for point in routing_points],
                                           "costing": "pedestrian", "units": "kilometers"}, separators=(",", ":"))}
            result = get_json(VALHALLA, params)
            if result.get("trip", {}).get("status") != 0:
                raise ValueError(f"Valhalla rejected {leg['id']}: {result}")
            cache["walking"][leg["id"]] = {"anchors": [start, end],
                                             "routingPoints": routing_points,
                                             "shapes": [part["shape"] for part in result["trip"]["legs"]],
                                             "reportedKm": result["trip"]["summary"]["length"]}
            CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"walk {leg['id']} {result['trip']['summary']['length']} km", flush=True)
            time.sleep(1.3)
        if "sncf" not in cache:
            result = get_json(SNCF, {"where": 'code_ligne="340000"', "limit": "5"})
            assert result["total_count"] == 1
            cache["sncf"] = {"codeLigne": "340000", "feature": result["results"][0]["geo_shape"]}
        if "prorail" not in cache:
            params = {"where": "1=1", "geometry": PRORAIL_BOX, "geometryType": "esriGeometryEnvelope",
                      "inSR": "4326", "spatialRel": "esriSpatialRelIntersects", "outFields": "*",
                      "outSR": "4326", "returnGeometry": "true", "f": "geojson"}
            cache["prorail"] = {
                "links": get_json(f"{PRORAIL}/1/query", params)["features"],
                "stations": get_json(f"{PRORAIL}/0/query", params)["features"],
            }
        cache["retrievedAt"] = datetime.now(timezone.utc).isoformat()
        CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    missing = [leg["id"] for leg in walking if leg["id"] not in cache["walking"]]
    assert not missing, f"Run with --fetch to cache walking candidates: {missing}"
    assert "sncf" in cache and "prorail" in cache, "Run with --fetch to cache railway sources"
    geometries: dict[str, dict] = {}
    for leg in walking:
        raw = cache["walking"][leg["id"]]
        parts = raw.get("shapes", [raw["shape"]] if "shape" in raw else [])
        coords = rounded([point for index, part in enumerate(parts)
                          for point in decode_polyline6(part)[index > 0:]])
        start, end = raw["anchors"]
        if len(coords) < 2 or km(coords[0], start) > 0.4 or km(coords[-1], end) > 0.4:
            raise ValueError(f"Walking geometry endpoint mismatch: {leg['id']}")
        if any(nearest_index(coords, waypoint)[1] > 0.12 for waypoint in WALK_VIA.get(leg["id"], [])):
            raise ValueError(f"Walking geometry missed sketch constraint: {leg['id']}")
        if length(coords) > max(1.0, km(start, end) * 4.5):
            raise ValueError(f"Walking geometry detour needs review: {leg['id']}")
        geometries[leg["id"]] = {"geometry": {"type": "LineString", "coordinates": coords},
                                 "basis": "current-pedestrian-network-candidate", "review": "needs-hand-drawn-comparison",
                                 "sourceUrl": "https://valhalla.github.io/valhalla/",
                                 "note": "Current OSM pedestrian route between reviewed places; turns are not observed GPS.",
                                 "estimatedKm": round(length(coords), 3)}

    geometries["L0316-06"]["note"] = "Author confirmed the Seine west bank; current pedestrian route through a riverside constraint, exact turns not GPS."
    geometries["L0320-04"]["note"] = "Author confirmed inner streets rather than Oudeschans canal; current pedestrian route, exact turns not GPS."
    geometries["L0324-11"]["note"] = "Sketch passes near Rouen town hall; pedestrian route constrained through the public square, not a town hall visit or GPS."

    # The user's review explicitly says the Zaanse walk returned by the same
    # path. Keep both directions geometrically identical, rather than accepting
    # two independent router decisions around the crossings.
    outward = geometries["L0320-09"]["geometry"]["coordinates"]
    geometries["L0320-10"]["geometry"]["coordinates"] = list(reversed(outward))
    geometries["L0320-10"]["note"] = "Same path in reverse per author's reviewed note; not recorded GPS."
    geometries["L0320-10"]["estimatedKm"] = geometries["L0320-09"]["estimatedKm"]

    sncf = cache["sncf"]["feature"]["geometry"]["coordinates"]
    assert cache["sncf"]["feature"]["geometry"]["type"] == "LineString"
    paris = by_name["巴黎Saint-Lazare站"]["coordinates"]
    rouen = by_name["鲁昂站"]["coordinates"]
    paris_idx, paris_gap = nearest_index(sncf, paris)
    rouen_idx, rouen_gap = nearest_index(sncf, rouen)
    assert paris_gap < 1 and rouen_gap < 1 and paris_idx != rouen_idx
    sncf_clip = sncf[paris_idx:rouen_idx + 1] if paris_idx < rouen_idx else list(reversed(sncf[rouen_idx:paris_idx + 1]))
    assert 120 < length(sncf_clip) < 170, "Unexpected Paris–Rouen railway length"
    for ident, coords in [("L0324-05", sncf_clip), ("L0324-12", list(reversed(sncf_clip)))]:
        geometries[ident] = {"geometry": {"type": "LineString", "coordinates": rounded(coords)},
                             "basis": "sncf-network-line-shape", "review": "physical-line-not-train-gps",
                             "sourceUrl": "https://ressources.data.sncf.com/explore/dataset/formes-des-lignes-du-rfn/",
                             "note": "SNCF Réseau line 340000, clipped at station areas; exact 2024 train path/track unverified.",
                             "estimatedKm": round(length(coords), 3)}

    station_positions = {feature["properties"]["NAAM"]: feature["geometry"]["coordinates"]
                         for feature in cache["prorail"]["stations"]}
    dutch, via_stations = graph_route(cache["prorail"]["links"], station_positions,
                                      "Amsterdam Centraal", "Zaandijk Zaanse Schans")
    amsterdam = by_name["阿姆斯特丹中央车站"]["coordinates"]
    zaandijk = by_name["Zaandijk Zaanse Schans站"]["coordinates"]
    assert km(dutch[0], amsterdam) < 1 and km(dutch[-1], zaandijk) < 1
    geometries["L0320-11"] = {"geometry": {"type": "LineString", "coordinates": list(reversed(dutch))},
                              "basis": "prorail-station-link-shape", "review": "physical-line-not-train-gps",
                              "sourceUrl": "https://maps.prorail.nl/arcgis/rest/services/Spoornetwerk/FeatureServer/1",
                              "note": "ProRail station-link network; return boarding at Amsterdam Centraal is reviewed, exact train track unverified.",
                              "viaStations": list(reversed(via_stations)), "estimatedKm": round(length(dutch), 3)}
    # The outbound Amsterdam boarding station was explicitly left unknown.
    # Do not duplicate the return shape as if that station were confirmed.
    assert "L0320-08" not in geometries
    ids = {leg["id"] for leg in legs}
    assert set(geometries) <= ids
    for leg in legs:
        shape = geometries.get(leg["id"])
        if not shape:
            continue
        points = shape["geometry"]["coordinates"]
        start, end = by_name[leg["from"]]["coordinates"], by_name[leg["to"]]["coordinates"]
        tolerance = 0.4 if leg["mode"] == "walk" else 1.0
        if km(points[0], start) > tolerance or km(points[-1], end) > tolerance:
            raise ValueError(f"Route geometry direction/endpoint mismatch: {leg['id']}")
    output = {"schemaVersion": 1, "walkingScope": "all reviewed walking legs with two public place anchors, except explicit sketch exclusions",
              "policy": "Candidates reconstructed from current pedestrian/rail infrastructure. No recorded GPS or intermediate timestamps.",
              "geometries": geometries}
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {len(geometries)} route candidates: {len(walking)} walking, 3 rail", flush=True)


if __name__ == "__main__":
    main()
