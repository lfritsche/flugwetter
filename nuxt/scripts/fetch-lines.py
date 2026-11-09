#!/usr/bin/env python3
"""Einmalig: Leitungen und Seilbahnen aus OpenStreetMap für die Karte holen (ODbL, © OpenStreetMap-Mitwirkende).
Ergebnis liegt statisch unter public/overlays/. Neu ausführen, wenn sich etwas geändert hat. Fair zu Overpass: Pause zwischen Regionen."""
import json, os, sys, time, urllib.parse, urllib.request
URL = os.environ.get("OVERPASS_URL", "https://overpass-api.de/api/interpreter")   # Spiegel, falls der Hauptserver ausfällt
BBOX = json.load(open(sys.argv[1]))
UA = {"User-Agent": "FlugwetterDashboard/1.0 (github.com/lfritsche/flugwetter)"}
for i, (region, b) in enumerate(BBOX.items()):
    if i: time.sleep(30)
    box = f"{b['s']:.4f},{b['w']:.4f},{b['n']:.4f},{b['e']:.4f}"
    q = f'[out:json][timeout:120];(way[power~"^(line|minor_line|cable)$"]({box});way[aerialway~"^(cable_car|gondola|mixed_lift|chair_lift|drag_lift|t-bar|j-bar|platter|goods|zip_line)$"]({box}););out geom;'
    data = urllib.parse.urlencode({"data": q}).encode()
    d = json.load(urllib.request.urlopen(urllib.request.Request(URL, data=data, headers=UA), timeout=180))
    feats = []
    for e in d["elements"]:
        g = e.get("geometry") or []
        if len(g) < 2: continue
        t = e.get("tags", {})
        feats.append({"type": "Feature", "properties": {"kind": "power" if "power" in t else "lift"}, "geometry": {"type": "LineString", "coordinates": [[round(p["lon"], 5), round(p["lat"], 5)] for p in g]}})
    out = f"public/overlays/{region}.geojson"
    json.dump({"type": "FeatureCollection", "generated": time.strftime("%Y-%m-%d"), "features": feats}, open(out, "w"), separators=(",", ":"))
    print(region, box, len(feats), flush=True)
