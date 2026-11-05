"""Select reviewed public landmark centroids for the France 2024 draft map."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content" / "travel" / "france-2024"
cache = json.loads((OUT / "geocode-cache.json").read_text(encoding="utf-8"))

# Two searches did not resolve by name. These are public transport/airport
# reference points, not boarding positions or measured travel coordinates.
OVERRIDES = {
    "cdg": ([2.54782, 49.00975], "French civil aviation airport reference point", "https://piaf.stac.aviation-civile.gouv.fr/airports/table"),
    "saint-michel-rer": ([2.3456233, 48.8534102], "OSM public station node N270191809", "https://www.openstreetmap.org/node/270191809"),
}
PREFERRED_RESULT = {"opera": 1, "fontainebleau-station": 1,
                    "le-florentin": 1, "augustiner-heumarkt": 1}
PUBLIC_BUSINESS_IDS = {"le-florentin", "pierre-herme-opera", "shakespeare-bookshop",
                       "pedra-alta-marbeuf", "augustiner-heumarkt", "the-pantry", "la-jacobine"}
EXTRA_ALIASES = {
    "palais-royal": ["Palais Royal–Musée du Louvre站"],
    "pont-alma": ["Pont de l’Alma站"],
}
PUBLIC_REVIEWED_ADDRESSES = [
    {"id": "le-bois", "label": "Le Bois", "city": "Paris", "coordinates": [2.2739247, 48.8575669],
     "aliases": ["Le Bois午餐"], "sourceUrl": "https://www.openstreetmap.org/node/5273855845",
     "returnedName": "Le Bois, 29 Rue Bois-le-Vent, Paris", "osmId": "node/5273855845"},
    {"id": "chez-gladines", "label": "Chez Gladines", "city": "Paris", "coordinates": [2.3463862, 48.8599164],
     "aliases": ["Chez Gladines／Les Halles"], "sourceUrl": "https://www.openstreetmap.org/node/3176500820",
     "returnedName": "Gladines, 11 bis Rue des Halles, Paris", "osmId": "node/3176500820"},
]
PUBLIC_STATIONS = [
    {"id": "invalides-rer-c", "label": "Invalides RER C站", "city": "Paris",
     "coordinates": [2.312513554925956, 48.862884804555264],
     "aliases": ["Invalides站（RER C返程下车）"],
     "sourceUrl": "https://www.data.gouv.fr/datasets/gares-et-stations-du-reseau-ferre-dile-de-france-par-ligne",
     "coordinateBasis": "Île-de-France Mobilités public RER C station point; station area, not the actual exit"},
]

places = []
for ident, item in cache.items():
    if ident in OVERRIDES:
        coord, basis, source = OVERRIDES[ident]
        returned_name = item["label"]
        osm_id = None
    else:
        results = item["results"]
        index = PREFERRED_RESULT.get(ident, 0)
        assert len(results) > index, f"No usable result for {ident}"
        match = results[index]
        coord = [float(match["lon"]), float(match["lat"])]
        basis = ("Author-reviewed public business address or unique venue; one-time current OpenStreetMap match, not a 2024 observation"
                 if ident in PUBLIC_BUSINESS_IDS else
                 "OpenStreetMap Nominatim public landmark centroid; manually reviewed")
        source = f"https://www.openstreetmap.org/{match['osm_type']}/{match['osm_id']}"
        returned_name = match["name"]
        osm_id = f"{match['osm_type']}/{match['osm_id']}"
    assert -180 <= coord[0] <= 180 and -90 <= coord[1] <= 90
    places.append({
        "id": ident, "label": item["label"], "city": item["city"],
        "coordinates": coord, "precision": "public-business-address" if ident in PUBLIC_BUSINESS_IDS else "landmark-or-station-area",
        "coordinateBasis": basis, "sourceUrl": source,
        "aliases": item["aliases"] + EXTRA_ALIASES.get(ident, []),
        "returnedName": returned_name, "osmId": osm_id,
    })

for item in PUBLIC_REVIEWED_ADDRESSES:
    places.append({**item, "precision": "public-business-address",
                   "coordinateBasis": "User-reviewed business address; one-time OpenStreetMap Nominatim match"})

for item in PUBLIC_STATIONS:
    places.append({**item, "precision": "landmark-or-station-area", "returnedName": "Invalides RER C", "osmId": None})

places.sort(key=lambda x: x["id"])
assert len(places) == 85
assert all("住处" not in x["label"] and "住处" not in " ".join(x["aliases"]) for x in places)
(OUT / "places.json").write_text(json.dumps({"schemaVersion": 1, "places": places}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"wrote {len(places)} public landmark/station anchors")
