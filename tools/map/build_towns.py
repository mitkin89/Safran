#!/usr/bin/env python3
"""Baut map/towns.js: heutige Städte zur Orientierung (blasse Namen im Hintergrund der Karte).
Aufruf: build_towns.py <ne_10m_populated_places (Shapefile ohne Endung)> <ausgabe towns.js> <datei> [<datei> ...]
  Dateien: OSM-Extrakte (*.osm.pbf, z. B. israel_and_palestine und lebanon von download.openstreetmap.fr) und/oder
  HOT-Exporte populated_places.geojson (hotosm_<jor|syr|egy>_populated_places, data.humdata.org) – beides OpenStreetMap (ODbL).
Ganze Karte (24–52° O, 24–42° N): Natural Earth populated places (gemeinfrei; mit deutschen und hebräischen Namen).
Im Ausschnitt des feinen Reliefs zusätzlich OSM place=city/town. Eintrag: [englisch, deutsch ('' = wie englisch), hebräisch, Länge, Breite, ab Zoom, Einwohner].
Benötigt: pip install pyshp osmium"""
import sys, json, re, math
import shapefile
ne, out, files = sys.argv[1], sys.argv[2], sys.argv[3:]
W, E, S, N = 24, 52, 24, 42
FW, FE, FS, FN = 33.78, 36.95, 29.25, 33.73
ZNE = {0: 0, 1: 0, 2: 0, 3: 0.8, 4: 0.8, 5: 1.5, 6: 1.5, 7: 2.5, 8: 3.5, 9: 5, 10: 5}
DEFIX = {'Nabatäa': 'Nabatäa (Nabatieh)', 'Tel Aviv-Jaffa': 'Tel Aviv'}       # Natural Earth nennt Nabatieh auf Deutsch „Nabatäa“
ENFIX = {'Al Khalil': 'Hebron', 'Saida': 'Sidon', 'Sour': 'Tyre', 'Beer Sheva': 'Beersheba', 'Gaza City': 'Gaza'}
DEFIX2 = {'Nabatäa': 'Nabatieh', 'Be’er Scheva': 'Beer Scheva'}
HE = re.compile(r'[א-ת]'); LAT = re.compile(r'[A-Za-z]')
norm = lambda s: re.sub(r'[^a-z]', '', re.sub(r"^(al|el|as|at|az|ar|an|ad|ash)[ -]", '', (s or '').lower()))
km = lambda a, b: math.hypot((a[0] - b[0]) * 94, (a[1] - b[1]) * 111)
T = []
r = shapefile.Reader(ne); fl = [f[0] for f in r.fields[1:]]
for rec in r.records():
    x = dict(zip(fl, rec)); lon, lat = x['LONGITUDE'], x['LATITUDE']
    if not (W <= lon <= E and S <= lat <= N): continue
    en = ENFIX.get(x['NAME'], x['NAME']); de = (x.get('NAME_DE') or '').strip(); de = DEFIX2.get(de, DEFIX.get(de, de))
    T.append({'en': en, 'de': de, 'he': (x.get('NAME_HE') or '').strip(), 'p': [lon, lat], 'z': ZNE.get(x['SCALERANK'], 5), 'pop': int(x['POP_MAX'] or 0), 'ne': 1})
def osm(en, de, he, lon, lat, place, pop):
    if not en or not LAT.search(en) or not (FW <= lon <= FE and FS <= lat <= FN): return
    try: pop = int(re.sub(r'\D', '', str(pop or '')) or 0)
    except ValueError: pop = 0
    z = 5 if place == 'city' else 7 if pop >= 20000 else 9
    for t in T:      # schon vorhanden (Natural Earth oder ein anderer Extrakt)? Dann genauere Lage und fehlende Namen übernehmen
        d = km(t['p'], [lon, lat])
        if d < 1.5 or (d < 15 and (norm(t['en']) == norm(en) or (he and t['he'] == he) or (de and t['de'] == de))):
            if t.get('ne') == 1: t['p'] = [lon, lat]; t['ne'] = 2
            if not t['he'] and he: t['he'] = he
            if not t['de'] and de: t['de'] = de
            return
    T.append({'en': en, 'de': de or '', 'he': he or '', 'p': [lon, lat], 'z': z, 'pop': pop})
for f in files:
    if f.endswith('.pbf'):
        import osmium
        for o in osmium.FileProcessor(f, osmium.osm.NODE).with_filter(osmium.filter.KeyFilter('place')):
            t = o.tags; pl = t.get('place')
            if pl not in ('city', 'town'): continue
            nm = t.get('name', ''); en = t.get('name:en') or t.get('int_name') or (nm if LAT.search(nm) and not HE.search(nm) else '')
            osm(en, t.get('name:de', ''), t.get('name:he') or (nm if HE.search(nm) else ''), o.lon, o.lat, pl, t.get('population'))
    else:
        for x in json.load(open(f, encoding='utf-8'))['features']:
            p, g = x['properties'], x['geometry']
            if g['type'] != 'Point' or p.get('place') not in ('city', 'town'): continue
            nm = p.get('name') or ''; osm(p.get('name_en') or (nm if LAT.search(nm) else ''), '', '', g['coordinates'][0], g['coordinates'][1], p['place'], p.get('population'))
T.sort(key=lambda t: (t['z'], -t['pop']))
rows = [[t['en'], t['de'] if t['de'] != t['en'] else '', t['he'], round(t['p'][0], 4), round(t['p'][1], 4), t['z'], t['pop']] for t in T]
open(out, 'w', encoding='utf-8').write('// Heutige Städte: Natural Earth (gemeinfrei) und © OpenStreetMap-Mitwirkende (ODbL), aufbereitet mit tools/map/build_towns.py\n// [englisch, deutsch, hebräisch, Länge, Breite, ab Zoom, Einwohner]\nwindow.BMAPTOWNS=' + json.dumps(rows, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(rows), 'Orte, davon OSM', sum(1 for t in T if 'ne' not in t))
