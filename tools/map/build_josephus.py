# ToposText-Orte (extract_topostext.py) + Sefaria-Text (Whiston, englisch) -> map/josephus.js
# Aufruf: build_josephus.py <out.js> "<Sefaria-Titel>" <extract.json> <Whiston-merged.json> [weitere Dreiergruppen ...]
# Die Niese-Abschnitte von ToposText werden über 6-Wort-Folgen des Whiston-Textes den Sefaria-Kapiteln (Buch.Kapitel) zugeordnet.
# Schlüssel in by: Buch*1000+Kapitel; 0 = Vorwort.
import sys, re, json, collections
out = sys.argv[1]; args = sys.argv[2:]
def words(h):
    h = re.sub(r'<i class="footnote">.*?</i>', '', h, flags=re.S); h = re.sub(r'<sup[^>]*>.*?</sup>', '', h, flags=re.S)
    h = re.sub(r'<[^>]+>', ' ', h); h = re.sub(r'&[a-z]+;', ' ', h); return re.findall(r"[a-z]+", h.lower())
N = 6
def sh(ws): return {' '.join(ws[i:i + N]) for i in range(0, max(1, len(ws) - N + 1))}
works = []
for title, ex, merged in zip(args[0::3], args[1::3], args[2::3]):
    ex = json.load(open(ex)); d = json.load(open(merged))['text'] if merged != '-' else []
    direct = 'Maccabees' in title  # Kapitel.Vers-Zählung stimmt mit Sefaria überein: direkt übernehmen
    secs = []
    if direct: pass
    elif isinstance(d, dict):
        if 'Preface' in d: secs.append((0, [w for s in d['Preface'] for w in words(s)]))
        body = d['']
    else: body = d
    for b, book in enumerate([] if direct else body):
        for c, chap in enumerate(book): secs.append(((b + 1) * 1000 + c + 1, [w for s in chap if isinstance(s, str) for w in words(s)]))
    idx = collections.defaultdict(set)
    for k, ws in secs:
        for g in sh(ws): idx[g].add(k)
    # Paragraphen: Text aus der ToposText-Seite wird hier nicht mehr gebraucht – extract.json enthält 'text' (Wörter) je Abschnitt
    keep = {i: p for i, p in ex['places'].items() if p['class'] == 'place' and not re.search(r'Mythic|Underworld', p['name'])}
    order = list(keep); pos = {i: n for n, i in enumerate(order)}
    by = collections.defaultdict(list); lost = 0
    for loc, ids in ex['paras'].items():
        if direct:
            cv = loc.split('.'); k = int(cv[0]) * 1000 + (int(cv[1]) if len(cv) > 1 and cv[1].isdigit() else 0)
            for i in ids:
                if i in keep and pos[i] not in by[k]: by[k].append(pos[i])
            continue
        ws = ex['words'][loc]; c = collections.Counter()
        for g in sh(ws):
            ks = idx.get(g)
            if ks and len(ks) == 1: c[next(iter(ks))] += 1
        if not c: lost += 1; continue
        top = c.most_common(1)[0][0]; ks = [k for k, n in c.items() if n >= 20] or [top]
        for k in ks:
            for i in ids:
                if i in keep and pos[i] not in by[k]: by[k].append(pos[i])
    pl = [[keep[i]['name'], keep[i].get('type') or '', keep[i]['lon'], keep[i]['lat'], keep[i].get('greek') or '', keep[i].get('pleiades') or '', keep[i].get('wikidata') or ''] for i in order]
    works.append({'title': title, 'depth3': not direct, 'places': pl, 'by': {str(k): v for k, v in sorted(by.items())}})
    print(title, len(pl), 'Orte', len(by), 'Kapitel', lost, 'Abschnitte ohne Treffer')
open(out, 'w').write('// Orte der Werke des Josephus: ToposText (topostext.org, ODC-BY; Texte nach W. Whiston/Perseus), zugeordnet über den Text von Sefaria. Erzeugt mit tools/map/build_josephus.py\nwindow.BMJOS=' + json.dumps(works, ensure_ascii=False, separators=(',', ':')) + ';\n')
