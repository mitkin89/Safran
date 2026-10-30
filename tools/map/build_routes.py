# UBS Bible Routes (CC BY-SA 4.0, © United Bible Societies 2023, Leen Ritmeyer) -> map/routes.js
# Aufruf: build_routes.py <ubs-bible-routes/GeoJsonRoutes> <out.js>
# Die Bibelstellen (ref) und deutschen Titel sind unsere Zuordnung nach dem Dateinamen (grob: Anfang der Erzählung).
import json, glob, os, re, sys
src, out = sys.argv[1], sys.argv[2]
T = """001|Abrams Reise nach Haran|Genesis 11:31
002|Abrams Reise nach Damaskus|Genesis 15:2
003|Abrams Reise nach Sichem|Genesis 12:6
004|Abrams Reise vom Negev nach Ägypten|Genesis 12:9
005|Abrams Reise nach Ägypten|Genesis 12:10
007|Einfall der Könige aus Mesopotamien|Genesis 14:1
008|Schlacht im Tal Siddim|Genesis 14:8
009|Plünderung Sodoms|Genesis 14:11
012|Abrams Weg nach Salem|Genesis 14:17
013|Abram trifft Melchisedek|Genesis 14:18
015|Hagar|Genesis 16:6
016|Engel nach Sodom|Genesis 18:16
017|Lot nach Zoar|Genesis 19:23
018|Von Hebron nach Gerar|Genesis 20:1
019|Von Gerar nach Morija|Genesis 22:3
020|Das Land Morija|Genesis 22:2
021|Von Morija nach Beerscheba|Genesis 22:19
023|Von Beerscheba nach Haran (Brautwerbung)|Genesis 24:10
024|Von Beerscheba zu Isaak|Genesis 24:62
025|Isaak nach Gerar|Genesis 26:1
026|Isaak nach Beerscheba|Genesis 26:23
027|Jakob nach Bet-El|Genesis 28:10
028|Von Haran nach Gilead|Genesis 31:21
029|Von Mizpa nach Bet-El|Genesis 35:1
031|Josef nach Dotan|Genesis 37:14
033|Juda nach Timna|Genesis 38:12
034|Josefs Brüder nach Ägypten|Genesis 42:3
035|Jakob nach Goschen|Genesis 46:28
036|Jakob zum Pharao|Genesis 47:1
037|Jakobs Begräbnis|Genesis 50:7
039|Mose nach Midian|Exodus 2:15
040|Mose zum Horeb|Exodus 3:1
041|Aaron zum Horeb|Exodus 4:27
042|Auszug, Route 1|Exodus 13:17
043|Auszug, Route 2|Numbers 33:5
044|Die Kundschafter|Numbers 13:17
046|38 Jahre Wanderung|Deuteronomy 2:1
047|Ostjordanland|Numbers 21:10
048|Schlacht gegen Sihon und Og|Numbers 21:21
049|Bileams Reise|Numbers 22:21
050|Bileams Sprüche|Numbers 23:1
053|Kundschafter nach Jericho|Joshua 2:1
054|Durchzug durch den Jordan|Joshua 3:1
055|Einnahme Jerichos|Joshua 6:1
056|Eroberung von Ai|Joshua 8:1
057|Segen und Fluch (Ebal und Garizim)|Joshua 8:30
059|List der Gibeoniter|Joshua 9:3
060|Israeliten zu den Gibeonitern|Joshua 9:17
061|Schlacht bei Gibeon|Joshua 10:6
062|Südfeldzug|Joshua 10:29
063|König von Hazor|Joshua 11:1
064|Nordfeldzug|Joshua 11:7
066|Judas Eroberung|Judges 1:1
067|Ehuds Kampf|Judges 3:12
068|Debora|Judges 4:6
069|Gideon|Judges 6:33
070|Abimelech|Judges 9:1
071|Jiftach|Judges 11:1
072|Simson|Judges 14:1
073|Wanderung des Stammes Dan|Judges 18:1
074|Die Benjaminiter|Judges 20:1
075|Rut|Ruth 1:1
076|Hanna|I Samuel 1:1
077|Schlacht bei Afek|I Samuel 4:1
078|Reisen der Lade|I Samuel 5:1
079|Schlacht bei Mizpa|I Samuel 7:5
080|Samuels Rundreise|I Samuel 7:16
081|Sauls Eselinnen|I Samuel 9:3
082|Schlacht bei Jabesch|I Samuel 11:1
083|Schlacht bei Michmas 1|I Samuel 13:5
084|Schlacht bei Michmas 2|I Samuel 14:1
085|David und Goliat|I Samuel 17:1
086|Davids Wanderungen 1|I Samuel 19:18
087|Davids Wanderungen 2|I Samuel 22:1
088|Davids Wanderungen 3|I Samuel 23:13
089|Davids Wanderungen 4|I Samuel 27:1
090|Davids Königtum 1|II Samuel 2:1
091|Davids Königtum 2|II Samuel 5:6
092|Davids Königtum 3|II Samuel 5:17
093|David (1)|II Samuel 8:1
094|David (2)|II Samuel 8:3
095|Davids Königtum 6|II Samuel 10:6
096|Davids Königtum 7|II Samuel 15:14
097|Davids Königtum 8|II Samuel 24:1
099|Salomos Jerusalem|I Kings 6:1
100|Salomos Tempel 1|I Kings 5:15
100x|Salomos Tempel|I Kings 5:15
101|Salomos Tempel 2|I Kings 7:13
102|Salomos Reich|I Kings 4:7
103|Ofir|I Kings 9:26
104|Königin von Saba|I Kings 10:1
105|Salomos Gegner|I Kings 11:14
106|Jerobeam wird gesalbt|I Kings 11:29
107a|Rehabeam nach Sichem|I Kings 12:1
107b|Rehabeam nach Sichem (2)|I Kings 12:1
108|Jerobeams Frau|I Kings 14:1
110|Schischak|I Kings 14:25
111|Basas Einfall|I Kings 15:16
112|Serach der Kuschiter|II Chronicles 14:8
114|Elias Wirken|I Kings 17:1
115|Elia auf dem Karmel|I Kings 18:19
116|Elia zum Sinai|I Kings 19:3
117|Elia und Elisa|I Kings 19:19
118|Belagerung Samarias|I Kings 20:1
119|Nabots Weinberg|I Kings 21:1
120|Kriege mit Aram|I Kings 22:1
121|Elias Wirken (Forts.)|II Kings 1:1
122|Elisas Wirken|II Kings 2:1
123|Einfall Moabs|II Kings 3:4
124|Aufstand Moabs|II Kings 3:5
125|Moabs Abfall|II Kings 3:21
126|Elisas Wirken (Forts.)|II Kings 4:8
127|Naaman|II Kings 5:1
128|Elisas Wirken (Forts.)|II Kings 6:8
129|Ben-Hadad|II Kings 6:24
130|Elisa und Hasael|II Kings 8:7
131|Kriege mit Edom und Aram|II Kings 8:20
132|Jehu|II Kings 9:1
133|Krieg mit Hasael|II Kings 10:32
134|Joasch besucht Elisa|II Kings 13:14
135|Amazja|II Kings 14:7
136|Usija|II Chronicles 26:6
137|Jerobeam II.|II Kings 14:25
138|Tiglat-Pileser|II Kings 15:29
139|Rezin und Pekach|II Kings 16:5
140|Fall Samarias|II Kings 17:5
141|Deportation nach Assyrien|II Kings 17:6
142|Sargon|Isaiah 20:1
143|Hiskia|II Kings 18:8
144|Sanherib|II Kings 18:13
145|Sanheribs Niederlage|II Kings 19:35
146|Von Babylon nach Jerusalem|II Kings 20:12
147|Joschija|II Kings 23:15
148|Necho|II Kings 23:29
149|Jojakim|II Kings 24:1
150|Nebukadnezar|II Kings 25:1
151|Babylonisches Exil|II Kings 25:11
151g|Gedalja|II Kings 25:22
155|Jona|Jonah 1:1"""
tab = {}
for line in T.split('\n'):
    k, de, ref = line.split('|'); tab[k] = (de, ref)
def simp(pts, tol):  # Douglas-Peucker
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True; st = [(0, len(pts) - 1)]
    while st:
        a, b = st.pop(); ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy; m, mi = -1, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            d = ((px - ax) ** 2 + (py - ay) ** 2) if L == 0 else abs(dy * (px - ax) - dx * (py - ay)) / L ** .5
            if d > m: m, mi = d, i
        if m > tol: keep[mi] = True; st += [(a, mi), (mi, b)]
    return [p for p, k in zip(pts, keep) if k]
res = []; seen = {}
for f in sorted(glob.glob(os.path.join(src, '*.geojson'))):
    stem = os.path.basename(f)[:-8]; m = re.match(r'(\d+[ab]?)', stem)
    if not m: continue
    k = m.group(1)
    if stem == '100.geojson'[:-8]: k = '100x'
    seen[k] = seen.get(k, 0) + 1
    if k == '151' and seen[k] == 2: k = '151g'
    if k not in tab: continue
    j = json.load(open(f)); fs = [j] if j.get('type') == 'Feature' else j.get('features', [])
    lines = []
    for x in fs:
        g = x and x.get('geometry')
        if not g or g['type'] != 'LineString': continue
        pts = simp([(c[0], c[1]) for c in g['coordinates']], 0.002)
        if len(pts) > 1: lines.append([[round(a, 3), round(b, 3)] for a, b in pts])
    if not lines: continue
    en = re.sub(r'^\d+[ab]?\.?\s*', '', stem).strip(); en = re.sub(r'^(GEN|EXO)\s*\d+\s+', '', en)
    de, ref = tab[k]; res.append({'id': k, 'en': en, 'de': de, 'ref': ref, 'lines': lines})
res.sort(key=lambda r: (int(re.match(r'\d+', r['id']).group()), r['id']))
open(out, 'w').write('// UBS Bible Routes (CC BY-SA 4.0, © United Bible Societies 2023, nach Leen Ritmeyer); Bibelstellen/deutsche Titel: Safran. Erzeugt mit tools/map/build_routes.py\nwindow.BROUTES=' + json.dumps(res, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(res), 'Routen', sum(len(r['lines']) for r in res), 'Linien', os.path.getsize(out) // 1024, 'KB')
