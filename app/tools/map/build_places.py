#!/usr/bin/env python3
# python3 build_places.py <Bible-Geocoding-Data-Ordner> <Ausgabe map/places.js>
# Orte der Tanach-Bücher aus OpenBible.info (CC BY 4.0), Verse von christlicher auf hebräische Zählung (Sefaria) umgerechnet.
import json, sys, re
src, out = sys.argv[1], sys.argv[2]
BOOKS = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','I Samuel','II Samuel','I Kings','II Kings','I Chronicles','II Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Songs','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi']
OSIS = ['Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr','Ezra','Neh','Esth','Job','Ps','Prov','Eccl','Song','Isa','Jer','Lam','Ezek','Dan','Hos','Joel','Amos','Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal']
IDX = {o: i for i, o in enumerate(OSIS)}
# Christliche -> hebräische Verszählung: (Buch, Kapitel, v von, v bis) -> (neues Kapitel, Verschiebung)
R = {'Gen': [(31,55,55,32,-54),(32,1,32,32,1)], 'Exod': [(8,1,4,7,25),(8,5,32,8,-4),(22,1,1,21,36),(22,2,31,22,-1)],
 'Lev': [(6,1,7,5,19),(6,8,30,6,-7)], 'Num': [(16,36,50,17,-35),(17,1,13,17,15),(29,40,40,30,-39),(30,1,16,30,1)],
 'Deut': [(12,32,32,13,-31),(13,1,18,13,1),(22,30,30,23,-29),(23,1,25,23,1),(29,1,1,28,68),(29,2,29,29,-1)],
 '1Sam': [(20,42,42,21,-41),(21,1,15,21,1),(23,29,29,24,-28),(24,1,22,24,1)], '2Sam': [(18,33,33,19,-32),(19,1,43,19,1)],
 '1Kgs': [(4,21,34,5,-20),(5,1,18,5,14)], '2Kgs': [(11,21,21,12,-20),(12,1,21,12,1)],
 '1Chr': [(6,1,15,5,26),(6,16,81,6,-15)], '2Chr': [(1,18,18,2,-17),(2,1,18,2,1),(13,23,23,14,-22),(14,1,15,14,1)],
 'Neh': [(4,1,6,3,32),(4,7,23,4,-6),(9,38,38,10,-37),(10,1,39,10,1)], 'Job': [(41,1,8,40,24),(41,9,34,41,-8)],
 'Eccl': [(5,1,1,4,16),(5,2,20,5,-1)], 'Song': [(6,13,13,7,-12),(7,1,13,7,1)],
 'Isa': [(9,1,1,8,22),(9,2,21,9,-1),(64,1,1,63,18),(64,2,12,64,-1)], 'Jer': [(9,1,1,8,22),(9,2,26,9,-1)],
 'Ezek': [(20,45,49,21,-44),(21,1,32,21,5)], 'Dan': [(4,1,3,3,30),(4,4,37,4,-3),(5,31,31,6,-30),(6,1,28,6,1)],
 'Hos': [(1,10,11,2,-9),(2,1,23,2,2),(11,12,12,12,-11),(12,1,14,12,1),(13,16,16,14,-15),(14,1,9,14,1)],
 'Joel': [(2,28,32,3,-27),(3,1,21,4,0)], 'Jonah': [(1,17,17,2,-16),(2,1,10,2,1)], 'Mic': [(5,1,1,4,13),(5,2,15,5,-1)],
 'Nah': [(1,15,15,2,-14),(2,1,13,2,1)], 'Zech': [(1,18,21,2,-17),(2,1,13,2,4)], 'Mal': [(4,1,6,3,18)]}
def conv(o, c, v):
    if o == 'Ps': return c, 0  # Psalmen: Überschriften verschieben die Verse, nur das Kapitel ist sicher
    for ch, a, b, nc, d in R.get(o, []):
        if ch == c and a <= v <= b: return nc, v + d
    return c, v
rows = [json.loads(x) for x in open(src + '/data/ancient.jsonl')]
places = []; fids = []
HE = {}
try: HE = json.load(open(__file__.rsplit('/', 1)[0] + '/hebnames.json', encoding='utf8'))  # friendly_id -> hebräischer Name
except Exception: pass
for a in rows:
    best = None; alts = []
    for i in a.get('identifications') or []:
        sc = i.get('score', {}).get('time_total', 0)
        tv = i.get('score', {}).get('time_values') or []
        recent = max(0, tv[-1]) if tv else max(0, sc)  # Sicherheit im neuesten Jahrzehnt, Promille
        for r in i.get('resolutions', []):
            if r.get('lonlat'):
                if not best or sc > best[0]: best = (sc, r['lonlat'], r.get('type'))
                ax, ay = map(float, r['lonlat'].split(','))
                alts.append([re.sub(r'<[^>]+>', '', i.get('description', '')).strip(), round(ax, 3), round(ay, 3), int(recent), sc])
                break
    if not best: continue
    x, y = map(float, best[1].split(','))
    if not (24 <= x <= 52 and 24 <= y <= 42): continue
    vs = set()
    for v in a.get('verses') or []:
        m = re.match(r'^(\w+)\.(\d+)\.(\d+)$', v.get('osis', ''))
        if m and m.group(1) in IDX:
            c, vv = conv(m.group(1), int(m.group(2)), int(m.group(3))); vs.add((IDX[m.group(1)], c, vv))
    if not vs: continue
    t = (a.get('types') or [best[2] or ''])[0]
    places.append([re.sub(r' \d+$', '', a['friendly_id']), t, round(x, 3), round(y, 3), sorted(vs), HE.get(a['friendly_id'], ''), [al[:4] for al in sorted(alts, key=lambda q: -q[4])[:6]]]); fids.append(a['friendly_id'])
data = {'W0': 24, 'N0': 42, 'ppd': 150, 'k': 0.84, 'w': 3528, 'h': 2700, 'books': BOOKS, 'places': places}
open(out, 'w', encoding='utf8').write('// Orte: OpenBible.info Bible Geocoding Data (CC BY 4.0, https://www.openbible.info/geo); Verse auf hebräische Zählung umgerechnet\nwindow.BMAP = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
json.dump(fids, open(out + '.fids.json', 'w'), ensure_ascii=False)
print(len(places), 'Orte', sum(len(p[4]) for p in places), 'Verse')
