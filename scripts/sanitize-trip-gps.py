#!/usr/bin/env python3
"""
sanitize-trip-gps.py — privacy trim for deployed trip GPS data (2026-09-26).

The raw GPS track starts and ends at the author's home; the deployed
public/data/travel/<id>/track.json therefore exposes the home coordinates
(first/last points, dwell points, day-0 bounding box). This script trims the
leading/trailing points that sit within RADIUS of the home anchor — detected
automatically as the track's first point (no address is ever written into the
script or its output) — and remaps every point-index reference:

  track.json   points / startTime / endTime / bounds / segments
               days: startIndex/endIndex shifted+clamped, empty days dropped,
               bounds recomputed for modified days
  scenes.json  scenes with i0/i1 (title units) shifted+clamped; scenes whose
               range becomes empty are dropped; gps.bounds/center/start
               recomputed for scenes whose range lost points
  trip.json    days (mirror of track.days) + top-level bounds

attractions.json carries POI coordinates (public places) and no point indexes
— untouched. diagnostics.json carries no coordinates — untouched.

Distances (distanceM/flightM, trip stats) are summary numbers and keep their
original values: trimming ~3 km at each end moves them negligibly, and the
hand-written hub card stats stay consistent.

Usage:
  python scripts/sanitize-trip-gps.py public/data/travel/ptes-2025 [--radius-m 3000] [--dry-run]
"""

import json
import math
import sys
from datetime import datetime
from pathlib import Path

EARTH_R = 6371000.0


def haversine(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_R * math.asin(math.sqrt(a))


def parse_t(s):
    return datetime.fromisoformat(s).timestamp()


def bounds_of(points):
    if not points:
        return None
    lons = [p["lon"] for p in points]
    lats = [p["lat"] for p in points]
    return [min(lons), min(lats), max(lons), max(lats)]


def sanitize(dirpath: Path, radius_m: float, dry_run: bool):
    track_path = dirpath / "track.json"
    scenes_path = dirpath / "scenes.json"
    trip_path = dirpath / "trip.json"

    track = json.loads(track_path.read_text(encoding="utf-8"))
    pts = track["points"]
    if len(pts) < 10:
        sys.exit(f"{track_path}: too few points, aborting")

    home = (pts[0]["lat"], pts[0]["lon"])
    end = (pts[-1]["lat"], pts[-1]["lon"])
    gap = haversine(home[0], home[1], end[0], end[1])
    if gap > 1500:
        sys.exit(
            f"first point {gap:.0f} m from last point — automatic home anchor "
            "looks wrong, pass a fixed anchor in the script if needed"
        )
    print(f"home anchor (auto): {home[0]:.5f}, {home[1]:.5f}; radius {radius_m:.0f} m")

    dists = [haversine(home[0], home[1], p["lat"], p["lon"]) for p in pts]
    head = next((i for i, d in enumerate(dists) if d > radius_m), None)
    tail = next((len(dists) - 1 - i for i, d in enumerate(reversed(dists)) if d > radius_m), None)
    if head is None or tail is None or head >= tail:
        sys.exit("no out-of-radius points found — aborting")
    n_cut = head + (len(pts) - 1 - tail)
    print(f"trim points[0:{head}] + points[{tail + 1}:] -> keep {tail - head + 1} of {len(pts)} (cut {n_cut})")

    mid_inside = [i for i in range(head, tail + 1) if dists[i] <= radius_m]
    if mid_inside:
        sys.exit(
            f"{len(mid_inside)} kept points still within radius (mid-trip dwell "
            "near home) — manual review needed, aborting"
        )

    kept = pts[head : tail + 1]

    def remap_range(i0, i1):
        """shift+clamp; returns None when the range is fully trimmed."""
        a, b = i0 - head, i1 - head
        a, b = max(a, 0), min(b, len(kept) - 1)
        if a > b:
            return None
        return a, b

    # ---- track.json ----
    new_days = []
    dropped_days = []
    for day in track.get("days", []):
        r = remap_range(day["startIndex"], day["endIndex"])
        if r is None:
            dropped_days.append(day["date"])
            continue
        a, b = r
        if a != day["startIndex"] - head or b != day["endIndex"] - head:
            day = dict(day, bounds=bounds_of(kept[a : b + 1]))
        day["startIndex"], day["endIndex"] = a, b
        new_days.append(day)
    if dropped_days:
        print(f"days dropped (fully trimmed): {dropped_days}")

    new_segments = []
    for seg in track.get("segments", []):
        r = remap_range(seg[0], seg[1])
        if r is not None:
            new_segments.append([r[0], r[1]])

    new_track = dict(
        track,
        points=kept,
        startTime=kept[0]["t"],
        endTime=kept[-1]["t"],
        bounds=bounds_of(kept),
        days=new_days,
        segments=new_segments,
    )

    # ---- scenes.json ----
    scenes_doc = json.loads(scenes_path.read_text(encoding="utf-8"))
    scene_list = scenes_doc["scenes"] if isinstance(scenes_doc, dict) else scenes_doc

    # Scenes also carry their own gps block (bounds/center/start) computed by
    # the pipeline from the ORIGINAL track — a scene whose time window sits at
    # home (e.g. the departure-afternoon scene) leaks the home coordinates
    # even after the track itself is trimmed. Recompute every scene's gps
    # from the SANITIZED points: title units (i0/i1) from their point range,
    # everything else from its [startTime, endTime] window. A scene whose
    # window keeps zero points loses its gps entirely (the renderer shows a
    # no-GPS variant) rather than keeping home-precision bounds.
    kept_t = [parse_t(p["t"]) for p in kept]
    empty_gps_scenes = []
    new_scenes, dropped_scenes = [], []
    for sc in scene_list:
        if sc.get("i0") is not None:
            r = remap_range(sc["i0"], sc["i1"])
            if r is None:
                dropped_scenes.append(f"{sc.get('id')} ({sc.get('unit')} {sc.get('title') or ''!r})")
                continue
            a, b = r
            sc = dict(sc)
            sc["i0"], sc["i1"] = a, b
            win = kept[a : b + 1]
        else:
            sc = dict(sc)
            if sc.get("startTime") and sc.get("endTime"):
                t0, t1 = parse_t(sc["startTime"]), parse_t(sc["endTime"])
                win = [p for p, pt in zip(kept, kept_t) if t0 <= pt <= t1]
            else:
                win = []
        if isinstance(sc.get("gps"), dict):
            if not win:
                sc.pop("gps", None)
                empty_gps_scenes.append(f"{sc.get('id')} ({sc.get('title') or sc.get('unit')})")
            else:
                gps = dict(sc["gps"])
                gps["bounds"] = bounds_of(win)
                gps["center"] = [
                    (gps["bounds"][0] + gps["bounds"][2]) / 2,
                    (gps["bounds"][1] + gps["bounds"][3]) / 2,
                ]
                gps["start"] = [win[0]["lon"], win[0]["lat"]]
                gps["firstT"] = win[0]["t"]
                gps["distanceM"] = round(
                    sum(
                        haversine(
                            win[i - 1]["lat"], win[i - 1]["lon"], win[i]["lat"], win[i]["lon"]
                        )
                        for i in range(1, len(win))
                    )
                )
                sc["gps"] = gps
            sc["gpsPointCount"] = len(win)
        new_scenes.append(sc)
    if dropped_scenes:
        print(f"scenes dropped (fully trimmed): {dropped_scenes}")
    if empty_gps_scenes:
        print(f"scenes whose window kept NO points (gps removed): {empty_gps_scenes}")

    # ---- trip.json ----
    trip = json.loads(trip_path.read_text(encoding="utf-8"))
    new_trip_days = []
    for day in trip.get("days", []):
        r = remap_range(day["startIndex"], day["endIndex"])
        if r is None:
            continue
        a, b = r
        if a != day["startIndex"] - head or b != day["endIndex"] - head:
            day = dict(day, bounds=bounds_of(kept[a : b + 1]))
        day["startIndex"], day["endIndex"] = a, b
        new_trip_days.append(day)
    new_trip = dict(trip, days=new_trip_days, bounds=bounds_of(kept))
    if isinstance(new_trip.get("stats"), dict) and "points" in new_trip["stats"]:
        new_trip["stats"]["points"] = len(kept)

    print(f"kept points: {len(kept)} (was {len(pts)})")
    print(f"new bounds: {new_track['bounds']}")

    if dry_run:
        print("DRY RUN — no files written")
        return

    track_path.write_text(
        json.dumps(new_track, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    if isinstance(scenes_doc, dict):
        scenes_doc["scenes"] = new_scenes
        scenes_path.write_text(
            json.dumps(scenes_doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
    else:
        scenes_path.write_text(
            json.dumps(new_scenes, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
    trip_path.write_text(
        json.dumps(new_trip, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print(f"written: {track_path}, {scenes_path}, {trip_path}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    radius = 3000.0
    for a in sys.argv[1:]:
        if a.startswith("--radius-m="):
            radius = float(a.split("=", 1)[1])
    if not args:
        sys.exit(__doc__)
    sanitize(Path(args[0]), radius, "--dry-run" in flags)
