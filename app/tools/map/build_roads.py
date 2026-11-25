#!/usr/bin/env python3
"""Baut map/roads.js: römische Straßen im Kartenausschnitt (24–52° O, 24–42° N) aus Itiner-e.
Aufruf: build_roads.py <itinere_roads.geojson> <ausgabe roads.js>
Quelle: de Soto, Pažout, Brughmans u. a., „A High-Resolution Dataset of Roads of the Roman Empire: Itiner-e static version 2024“,
Zenodo, https://doi.org/10.5281/zenodo.17122148 (CC BY 4.0), https://itiner-e.org; beschrieben in Scientific Data (2025), https://doi.org/10.1038/s41597-025-06140-z.
Die Datei liegt in EPSG:3395 (World Mercator) vor. Je Straße: [Art (2 = Hauptstraße, 1 = Nebenstraße), Sicherheit (2 = gesichert, 1 = vermutet, 0 = hypothetisch), Punkte …].
Benötigt: pip install shapely rasterio (für die Umrechnung der Koordinaten)"""
import sys, json, zlib, base64
from rasterio.warp import transform
from shapely.geometry import LineString, box
src, out = sys.argv[1], sys.argv[2]
W, E, S, N = 24, 52, 24, 42; Q = 1e4; BOX = box(W, S, E, N)
FINE = box(33.78, 29.25, 36.95, 33.73)      # im Ausschnitt des feinen Reliefs genauer
SEG = {'Certain': 2, 'Conjectured': 1, 'Hypothetical': 0}
R = []; n = 0
for f in json.load(open(src, encoding='utf-8'))['features']:
    g, p = f['geometry'], f['properties']
    if not g: continue
    for part in (g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]):
        if len(part) < 2: continue
        lon, lat = transform('EPSG:3395', 'EPSG:4326', [q[0] for q in part], [q[1] for q in part])
        if max(lon) < W or min(lon) > E or max(lat) < S or min(lat) > N: continue
        l = LineString(list(zip(lon, lat))).intersection(BOX)
        for s in ([l] if l.geom_type == 'LineString' else getattr(l, 'geoms', [])):
            if s.geom_type != 'LineString' or s.is_empty: continue
            c = list(s.simplify(4e-4 if s.intersects(FINE) else 1.2e-3, preserve_topology=False).coords)
            if len(c) < 2: continue
            o = [2 if p.get('Route_Type') == 2 or p.get('Type') == 'Main Road' else 1, SEG.get(p.get('Segment_s'), 1)]; px = py = 0
            for x, y in c:
                X = round((x - W) * Q); Y = round((y - S) * Q); o += [X - px, Y - py]; px, py = X, Y
            R.append(o); n += len(c)
D = {'o': [W, S, Q], 'r': R}
z = base64.b64encode(zlib.compress(json.dumps(D, separators=(',', ':')).encode(), 9)).decode()
open(out, 'w').write('// Römische Straßen: Itiner-e (de Soto, Pažout, Brughmans u. a. 2025), CC BY 4.0, https://itiner-e.org – aufbereitet mit tools/map/build_roads.py\nwindow.BMAPROADS={z:"%s"};\n' % z)
print(len(R), 'Straßenstücke', n, 'Punkte', round(len(z) / 1e6, 2), 'MB')
