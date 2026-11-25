#!/usr/bin/env python3
"""Baut map/jer/osm.js (OSM-Straßen/Gebäude/Mauer) und map/jer/dem.js (Höhenraster) für die Jerusalem-Detailkarte.
Aufruf: build_jerusalem.py <israel_and_palestine.osm.pbf> <ausgabeordner>
Quellen: OpenStreetMap-Extrakt (https://download.openstreetmap.fr/extracts/asia/israel_and_palestine.osm.pbf, ODbL),
Copernicus DEM GLO-30 (https://copernicus-dem-30m.s3.amazonaws.com/, per rasterio).
Benötigt: pip install osmium shapely rasterio numpy"""
import sys, json, zlib, base64, os
import osmium, numpy as np, rasterio
from rasterio.windows import from_bounds
from shapely.geometry import LineString
pbf, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
W, S, E, N = 35.220, 31.762, 35.252, 31.790   # OSM-Ausschnitt
Q = 1e5
CLS = {'footway': 1, 'path': 1, 'steps': 2, 'pedestrian': 1, 'service': 1, 'residential': 3, 'living_street': 3, 'tertiary': 4, 'secondary': 4, 'unclassified': 3, 'track': 1, 'trunk': 5}
D = {'hw': [], 'bld': [], 'wall': [], 'water': [], 'cem': [], 'park': []}
def enc(pts, tol):
    c = list(LineString(pts).simplify(tol, preserve_topology=False).coords) if len(pts) > 2 else pts
    o = []; px = py = 0
    for x, y in c:
        X = round((x - W) * Q); Y = round((y - S) * Q); o += [X - px, Y - py]; px, py = X, Y
    return o
class H(osmium.SimpleHandler):
    def way(s, w):
        t = {k: v for k, v in w.tags}
        if not t: return
        try: pts = [(n.lon, n.lat) for n in w.nodes if n.location.valid()]
        except Exception: return
        if len(pts) < 2 or not any(W <= x <= E and S <= y <= N for x, y in pts): return
        if 'highway' in t:
            c = CLS.get(t['highway'])
            if c: D['hw'].append([c] + enc(pts, 8e-6))
        elif t.get('barrier') == 'city_wall' or t.get('historic') == 'citywalls' or t.get('man_made') == 'city_wall': D['wall'].append(enc(pts, 8e-6))
        elif 'building' in t:
            if len(pts) >= 4: D['bld'].append(enc(pts, 1e-5))
        elif 'waterway' in t or t.get('natural') == 'water': D['water'].append(enc(pts, 8e-6))
        elif t.get('landuse') == 'cemetery' or t.get('amenity') == 'grave_yard': D['cem'].append(enc(pts, 8e-6))
        elif t.get('leisure') in ('park', 'garden'): D['park'].append(enc(pts, 8e-6))
H().apply_file(pbf, locations=True, idx='flex_mem')
D['o'] = [W, S, Q]
z = base64.b64encode(zlib.compress(json.dumps(D, separators=(',', ':')).encode(), 9)).decode()
open(os.path.join(out, 'osm.js'), 'w').write('window.BJEROSM={z:"%s"};\n' % z)
# Höhenraster (1 Bogensekunde), 16 Bit in 0,5-m-Schritten
dW, dS, dE, dN = 35.19, 31.74, 35.28, 31.81
u = '/vsicurl/https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N31_00_E035_00_DEM/Copernicus_DSM_COG_10_N31_00_E035_00_DEM.tif'
with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif'), rasterio.open(u) as ds:
    a = ds.read(1, window=from_bounds(dW, dS, dE, dN, ds.transform))
h, w = a.shape; v = np.clip(np.round((a - 300) * 4), 0, 65535).astype('<u2')
z = base64.b64encode(zlib.compress(v.tobytes(), 9)).decode()
open(os.path.join(out, 'dem.js'), 'w').write('window.BJERDEM={W:%s,S:%s,E:%s,N:%s,w:%d,h:%d,off:300,step:0.25,z:"%s"};\n' % (dW, dS, dE, dN, w, h, z))
print({k: len(v) for k, v in D.items() if k != 'o'}, w, h)
