#!/usr/bin/env python3
"""Baut map/water.js: Flüsse, Bäche und Wadis im Ausschnitt des feinen Reliefs, nach Bedeutung in Klassen (für das stufenweise Einblenden), samt Namen.
Aufruf: build_water.py <ausgabe water.js> <ordner mit lake_hi.npy aus fetch_dem_hi.py> <waterways.geojson> [<waterways.geojson> ...]
Quelle: OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL) über die Länder-Exporte des Humanitarian OpenStreetMap Team
(https://data.humdata.org/organization/hot, Datensätze hotosm_<isr|pse|jor|syr|lbn|egy>_waterways, GeoJSON:
https://production-raw-data-api.s3.amazonaws.com/ISO3/<ISR|...>/waterways/hotosm_<isr|...>_waterways_osm_geojson.zip).
Klassen: 1 = ständig Wasser führende Hauptflüsse (Liste MAJOR), 2–5 = übrige nach Gesamtlänge des benannten Laufs bzw. des zusammenhängenden unbenannten Stücks.
Stücke, die durch einen See laufen (OSM führt den Jordan als Linie durch den See Genezareth), entfallen anhand der Wassermaske des Copernicus DEM.
Benötigt: pip install shapely numpy"""
import sys, json, re, math, zlib, base64
from collections import defaultdict
from shapely.geometry import LineString, MultiLineString, box
from shapely.ops import linemerge
import os, numpy as np
out, lakedir, files = sys.argv[1], sys.argv[2], sys.argv[3:]
LAKE = np.load(os.path.join(lakedir, 'lake_hi.npy'), mmap_mode='r')   # 2400 Pixel je Breitengrad, 2016 je Längengrad, Ursprung 33° O / 34° N
def inlake(x, y):
    j = int((x - 33) * 2016); i = int((34 - y) * 2400)
    return 0 <= i < LAKE.shape[0] and 0 <= j < LAKE.shape[1] and LAKE[i, j] > 127
def dry(g):   # Linie in die Stücke außerhalb der Seen zerlegen (alle ~100 m geprüft)
    L = g.length; n = max(1, int(L / 0.001)); pts = [g.interpolate(k / n, normalized=True) for k in range(n + 1)]; wet = [inlake(p.x, p.y) for p in pts]
    if not any(wet): return [g]
    runs = []; cur = []
    for p, w in zip(pts, wet):
        if w:
            if len(cur) > 1: runs.append(LineString(cur))
            cur = []
        else: cur.append((p.x, p.y))
    if len(cur) > 1: runs.append(LineString(cur))
    return runs
W, E, S, N = 33.78, 36.95, 29.25, 33.73     # Ausschnitt von map/hi
Q = 1e4
# Namen: [Muster (englischer oder örtlicher OSM-Name), englisch, deutsch, hebräisch, ab Zoom, Hauptfluss?]
NAMES = [
    [r'^River Jordan$|^Jordan River$', 'Jordan', 'Jordan', 'ירדן', 0, 1],
    [r'Yarmo?uk', 'Yarmuk', 'Jarmuk', 'ירמוך', 4, 1], [r'^Zarqa River|Nahr (az|ez|al)[- ]Zarqa', 'Jabbok (Zarqa)', 'Jabbok (Zarqa)', 'יבוק', 4, 1],
    [r'Wadi (al[- ])?Mu?jib|^Mujib', 'Arnon (Wadi Mujib)', 'Arnon (Wadi Mudschib)', 'ארנון', 4, 1], [r'Wadi al[- ]Hasa', 'Zered (Wadi al-Hasa)', 'Sered (Wadi al-Hasa)', 'זרד', 5, 1],
    [r'^Litani', 'Litani', 'Litani', 'ליטני', 4, 1], [r'^Hasbani', 'Hasbani', 'Hasbani', 'חצבני', 6, 1], [r'^Barada', 'Barada (Abana)', 'Barada (Abana)', 'ברדה (אמנה)', 5, 1],
    [r'^Nahr ez Zahrani', 'Zahrani', 'Zahrani', 'זהראני', 7, 1], [r'^(Nahr (al|el)[- ])?Awali', 'Awali', 'Awali', 'אוואלי', 7, 1],
    [r'^Nahal Kishon', 'Kishon', 'Kischon', 'קישון', 4.5, 1], [r'Yarkon', 'Yarkon', 'Jarkon', 'ירקון', 4.5, 1],
    [r'^Nahal Harod', 'Harod', 'Harod', 'חרוד', 7, 1], [r'^Nahal Dan$|^Dan River|^Dan$', 'Dan', 'Dan', 'דן', 9, 1], [r'Banias|Hermon Stream|^Nahal Hermon', 'Banias', 'Banias', 'בניאס', 9, 1],
    [r'^Nahal Sorek', 'Nahal Sorek', 'Nachal Sorek', 'נחל שורק', 5, 0], [r'^Nahal HaBsor|Nahal Besor', 'Nahal Besor', 'Nachal Besor', 'נחל הבשור', 5, 0],
    [r'^Nahal HaEla', 'Nahal Elah', 'Nachal Ela (Terebinthental)', 'נחל האלה', 7, 0], [r'^Nahal Kidron', 'Kidron', 'Kidron', 'קדרון', 7, 0],
    [r'^Nahal Ayalon', 'Ayalon', 'Ajalon', 'איילון', 7, 0], [r'^Nahal Beersheba', 'Nahal Beersheba', 'Nachal Beer Scheva', 'נחל באר שבע', 6, 0],
    [r'^Nahal Zin', 'Nahal Zin', 'Nachal Zin', 'נחל צין', 5, 0], [r'^Nahal Paran', 'Nahal Paran', 'Nachal Paran', 'נחל פארן', 5, 0], [r'^Nahal Arava', 'Nahal Arava', 'Nachal Arava', 'נחל הערבה', 5, 0],
    [r'^Wadi al-Arish', 'Brook of Egypt (Wadi al-Arish)', 'Bach Ägyptens (Wadi al-Arisch)', 'נחל מצרים (ואדי אל-עריש)', 5, 0],
    [r'^Nahal Grar', 'Nahal Gerar', 'Nachal Gerar', 'נחל גרר', 7, 0], [r'^Nahal Lakhish', 'Nahal Lachish', 'Nachal Lachisch', 'נחל לכיש', 7, 0], [r'^Nahal Shikma', 'Nahal Shikma', 'Nachal Schikma', 'נחל שקמה', 7, 0],
    [r'^Nahal Hebron', 'Nahal Hebron', 'Nachal Hebron', 'נחל חברון', 7, 0], [r'^Nahal Alexander', 'Nahal Alexander', 'Nachal Alexander', 'נחל אלכסנדר', 7, 0],
    [r'^Nahal Tavor', 'Nahal Tavor', 'Nachal Tabor', 'נחל תבור', 8, 0], [r'^Nahal Kziv', 'Nahal Kziv', 'Nachal Kesiv', 'נחל כזיב', 8, 0], [r'^Nahal Arugot', 'Nahal Arugot', 'Nachal Arugot', 'נחל ערוגות', 8, 0],
    [r'^Wadi al Karak', 'Wadi al-Karak', 'Wadi al-Karak', 'ואדי כרכ', 7, 0], [r'^Nahal Tirza|Wadi (al[- ])?Far.a', 'Nahal Tirzah (Wadi Far‘a)', 'Nachal Tirza (Wadi Fara)', 'נחל תרצה', 7, 0],
    [r'Nahal Prat|Wadi (al[- ])?Qe?lt', 'Wadi Qelt (Nahal Prat)', 'Wadi Qelt (Nachal Prat)', 'נחל פרת (ואדי קלט)', 8, 0],
]
for n in NAMES: n[0] = re.compile(n[0], re.I)
HE = re.compile(r'[א-ת][א-ת \'"־-]*[א-ת]')
def km(c): return sum(math.hypot((c[i + 1][0] - c[i][0]) * 94, (c[i + 1][1] - c[i][1]) * 111) for i in range(len(c) - 1))
seen = set(); named = defaultdict(list); unnamed = []; BOX = box(W, S, E, N)
for f in files:
    for x in json.load(open(f, encoding='utf-8'))['features']:
        p, g = x['properties'], x['geometry']
        if g['type'] != 'LineString' or p['id'] in seen or p.get('waterway') not in ('river', 'stream', 'wadi') or p.get('tunnel') not in (None, 'no'): continue
        c = [(q[0], q[1]) for q in g['coordinates']]
        if len(c) < 2 or not any(W <= a <= E and S <= b <= N for a, b in c): continue
        seen.add(p['id']); en = (p.get('name_en') or '').strip(); loc = (p.get('name') or '').strip(); key = en or loc
        if key: named[key].append((c, loc, p['waterway']))
        else: unnamed.append((c, p['waterway']))
def pieces(lines):
    m = linemerge(MultiLineString(lines)) if len(lines) > 1 else LineString(lines[0]); m = m.intersection(BOX)
    gs = [m] if m.geom_type == 'LineString' else [g for g in getattr(m, 'geoms', []) if g.geom_type == 'LineString']
    return [d for g in gs if not g.is_empty and len(g.coords) > 1 for d in dry(g)]
CL = {k: [] for k in range(1, 6)}; LAB = []
TOL = {1: 2.5e-4, 2: 3e-4, 3: 4e-4, 4: 5e-4, 5: 6e-4}
def add(cl, g):
    s = g.simplify(TOL[cl], preserve_topology=False); c = list(s.coords)
    if len(c) < 2: return
    o = []; px = py = 0
    for x, y in c:
        X = round((x - W) * Q); Y = round((y - S) * Q); o += [X - px, Y - py]; px, py = X, Y
    CL[cl].append(o)
def label(ps, en, de, he, z):
    g = max(ps, key=lambda q: q.length); c = list(g.coords); L = km(c)
    if L < 2: return
    mid = g.interpolate(0.5, normalized=True); a = g.interpolate(0.42, normalized=True); b = g.interpolate(0.58, normalized=True)
    ang = math.degrees(math.atan2((b.y - a.y) * 111, (b.x - a.x) * 94)); ang = (ang + 90) % 180 - 90   # Winkel gegen Osten, -90..90
    LAB.append([en, de if de != en else '', he, round(mid.x, 4), round(mid.y, 4), round(ang), z])
for key, ws in named.items():
    ps = pieces([w[0] for w in ws])
    if not ps: continue
    L = sum(km(list(g.coords)) for g in ps); loc = next((w[1] for w in ws if w[1]), ''); river = any(w[2] == 'river' for w in ws)
    cur = next((n for n in NAMES if n[0].search(key) or n[0].search(loc)), None)
    if cur and cur[5]: cl = 1
    elif L >= 30 or (cur and L >= 10): cl = 2
    elif L >= 12 or (river and L >= 6): cl = 3
    elif L >= 4: cl = 4
    elif L >= 0.8: cl = 5
    else: continue
    for g in ps: add(cl, g)
    hm = HE.search(loc)
    if cur:
        if cur[4]: label(ps, cur[1], cur[2], cur[3], cur[4])
    elif L >= 12 and re.search(r'[A-Za-z]', key): label(ps, key if not key.isupper() else key.title(), '', hm.group(0) if hm else '', 8 if L >= 40 else 10 if L >= 20 else 12)
for g in pieces([u[0] for u in unnamed]):
    L = km(list(g.coords))
    if L >= 6: add(4, g)
    elif L >= 1.5: add(5, g)
# gleiche Namen nur einmal (der Jordan u. a. liegen in OSM unter mehreren Schreibweisen vor): die Beschriftung des längsten Stücks bleibt
uniq = {}
for l in LAB: uniq.setdefault(l[0], l)
LAB = sorted(uniq.values(), key=lambda l: l[6])
D = {'o': [W, S, Q], 'cl': [CL[k] for k in range(1, 6)], 'lab': LAB}
z = base64.b64encode(zlib.compress(json.dumps(D, ensure_ascii=False, separators=(',', ':')).encode(), 9)).decode()
open(out, 'w').write('// Flüsse, Bäche und Wadis: © OpenStreetMap-Mitwirkende (ODbL), aufbereitet mit tools/map/build_water.py\nwindow.BMAPWATER={z:"%s"};\n' % z)
print({k: (len(v), sum(len(a) for a in v) // 2) for k, v in CL.items()}, len(LAB), 'Namen', round(len(z) / 1e6, 2), 'MB')
print([l[0] for l in LAB if l[6] < 8])
