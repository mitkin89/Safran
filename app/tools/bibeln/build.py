#!/usr/bin/env python3
# Wandelt "RoundtripHTML"-Bibeln (Quadro-Bibel / obohu.cz) in Safran-Texte (bundled/own/…) um und ergänzt bundled/manifest.json.
# Aufruf: python3 build.py <Ordner mit entpackten Bibeln> <Safran-Projekt> <Ausgabeordner>
import sys, os, re, json, glob, hashlib, html, shutil
src, proj, out = sys.argv[1:4]
BIBLES = {
 'ZUR2007': 'Zürcher Bibel (2007)',
 'ELB2006': 'Elberfelder Bibel (2006)',
 'BuberRosenzweig': 'Die Schrift, verdeutscht von Martin Buber gemeinsam mit Franz Rosenzweig (1929)',
 'NHTS': 'Die Heilige Schrift, übersetzt von Naftali Herz Tur-Sinai (1954)',
}
OSIS = {'Gen':'Genesis','Exod':'Exodus','Lev':'Leviticus','Num':'Numbers','Deut':'Deuteronomy','Josh':'Joshua','Judg':'Judges','1Sam':'I Samuel','2Sam':'II Samuel','1Kgs':'I Kings','2Kgs':'II Kings','Isa':'Isaiah','Jer':'Jeremiah','Ezek':'Ezekiel','Hos':'Hosea','Joel':'Joel','Amos':'Amos','Obad':'Obadiah','Jonah':'Jonah','Mic':'Micah','Nah':'Nahum','Hab':'Habakkuk','Zeph':'Zephaniah','Hag':'Haggai','Zech':'Zechariah','Mal':'Malachi','Ps':'Psalms','Prov':'Proverbs','Job':'Job','Song':'Song of Songs','Ruth':'Ruth','Lam':'Lamentations','Eccl':'Ecclesiastes','Esth':'Esther','Dan':'Daniel','Ezra':'Ezra','Neh':'Nehemiah','1Chr':'I Chronicles','2Chr':'II Chronicles'}
man = json.load(open(os.path.join(proj,'bundled','manifest.json'),encoding='utf8'))
meta = {}  # Sefaria-Titel -> (heTitle, categories)
for it in man['items']:
    if it['kind']=='he' and 'Westminster' in it['versionTitle']: meta[it['title']] = (it['heTitle'], it['categories'])
def hecounts(t):
    f = glob.glob(os.path.join(proj,'bundled','own',t,'he','Westminster*.json'))
    return [len(c) for c in json.load(open(f[0],encoding='utf8'))['text']] if f else None
def unesc(n): return re.sub(r'#U([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1),16)), n)
def clean(h):
    h = re.sub(r'<h3>.*?</h3>', '', h, flags=re.S)
    h = re.sub(r'<span class="vn">.*?</span>', '', h, flags=re.S)
    h = re.sub(r'<span class="br-ind"><br>.*?</span></span>|<span class="br-ind"><br><span class="indent">&nbsp;</span></span>', '<br>', h)
    h = re.sub(r'<span class="br-p">.*?</span>', '', h, flags=re.S)
    h = re.sub(r'<span class="xa[^"]*"[^>]*></span>', '', h)
    return h

# --- Querverweis-Fußnoten (℘) lesen --------------------------------------------------------------------
BK = {}
for k, v in {'1Mo':'Gen','2Mo':'Exod','3Mo':'Lev','4Mo':'Num','5Mo':'Deut','Jos':'Josh','Ri':'Judg','Rt':'Ruth','1Sam':'1Sam','2Sam':'2Sam','1Kö':'1Kgs','2Kö':'2Kgs','1Chr':'1Chr','2Chr':'2Chr','Esr':'Ezra','Neh':'Neh','Est':'Esth','Hi':'Job','Ps':'Ps','Spr':'Prov','Pred':'Eccl','Hl':'Song','Jes':'Isa','Jer':'Jer','Kla':'Lam','Hes':'Ezek','Dan':'Dan','Hos':'Hos','Joe':'Joel','Am':'Amos','Ob':'Obad','Jon':'Jonah','Mi':'Mic','Nah':'Nah','Hab':'Hab','Zef':'Zeph','Hag':'Hag','Sach':'Zech','Mal':'Mal',
 'Gen':'Gen','Ex':'Exod','Lev':'Lev','Num':'Num','Dtn':'Deut','Rut':'Ruth','1Kön':'1Kgs','2Kön':'2Kgs','Esra':'Ezra','Hiob':'Job','Koh':'Eccl','Hld':'Song','Klgl':'Lam','Ez':'Ezek','Joel':'Joel','Obd':'Obad','Jona':'Jonah'}.items(): BK[k] = v
NTB = {'Mt','Mk','Lk','Joh','Apg','Röm','1Kor','2Kor','Gal','Eph','Phil','Kol','1Thes','2Thes','1Thess','2Thess','1Tim','2Tim','Tit','Phim','Hebr','Jak','1Petr','2Petr','1Jo','2Jo','3Jo','1Joh','2Joh','3Joh','Jud','Offb'}
unknown = {}
def parse_xref(note, own, ch, srcv):
    """note: Text hinter ℘. Liefert [(src_v1, src_v2, ziel)], ziel = (Osis, kap, v1, kap2, v2) – v1=0: ganzes Kapitel; NT/unbekannt fällt weg."""
    t = note.replace('!', '').replace('–', '-')
    t = re.sub(r'\bvgl\.', ' ', t)
    sv = (srcv, srcv)
    m = re.match(r'\s*V\.\s*(\d+)(?:-(\d+))?\s*:\s*', t)
    if m: sv = (int(m.group(1)), int(m.group(2) or m.group(1))); t = t[m.end():]
    out = []
    for grp in t.split('·'):
        book = own; vmode = False; bad = False; chap_ok = False
        for m in re.finditer(r'((?:[1-5]\s?)?[A-Za-zÄÖÜäöüß]+)\.?|(\d+(?:[,.\-]\d+)*)', grp):
            if m.group(1):
                w = m.group(1).replace(' ', '')
                if w == 'Kap': book = own; vmode = False; bad = False; chap_ok = True
                elif w == 'V': vmode = True
                elif w in ('ff', 'f', 'a', 'b', 'c', 'd', 'u', 'a'): pass
                elif w in BK: book = BK[w]; vmode = False; bad = False; chap_ok = True
                elif w in NTB: book = None; bad = True
                else: unknown[w] = unknown.get(w, 0) + 1; book = None; bad = True
                continue
            if bad or book is None: continue
            r = m.group(2)
            if vmode:   # „V. 22.31“: Verse im selben Kapitel
                for part in r.split('.'):
                    a = part.split('-'); 
                    try: out.append((sv[0], sv[1], (own, ch, int(a[0]), ch, int(a[-1]))))
                    except ValueError: pass
                continue
            if ',' not in r:   # Zahl ohne Komma: nur direkt nach „Kap.“, nach einem Buchnamen oder in einer Kapitelreihe („Kap. 5; 7“) ein Kapitel
                if chap_ok and re.fullmatch(r'\d+', r): out.append((sv[0], sv[1], (book, int(r), 0, int(r), 0))); chap_ok = True
                else: chap_ok = False
                continue
            chap_ok = False
            c, rest = r.split(',', 1)
            c = int(c)
            for part in rest.split('.'):
                mm = re.fullmatch(r'(\d+)(?:-(\d+)(?:,(\d+))?)?', part) if True else None
                if not mm:
                    mm2 = re.fullmatch(r'(\d+)(?:-(\d+),(\d+))', part)
                    continue
                v1 = int(mm.group(1))
                if mm.group(3): out.append((sv[0], sv[1], (book, c, v1, int(mm.group(2)), int(mm.group(3)))))
                else: out.append((sv[0], sv[1], (book, c, v1, c, int(mm.group(2) or v1))))
    return out
xrefs = []
CNT = {}
for o, tt in OSIS.items():
    f = glob.glob(os.path.join(proj,'bundled','own',tt,'he','Westminster*.json'))
    if f: CNT[o] = [len(c) for c in json.load(open(f[0],encoding='utf8'))['text']]
def valid(b, c, v1, c2, v2):
    cn = CNT.get(b)
    if not cn or not (1 <= c <= len(cn)) or not (1 <= c2 <= len(cn)): return False
    if v1 == 0: return True
    return 1 <= v1 <= cn[c-1] and 1 <= v2 <= cn[c2-1]
def fixup(tgs, own):
    r = []
    for sv1, sv2, tg in tgs:
        if valid(*tg): r.append((sv1, sv2, tg))
        elif tg[0] != own and valid(own, *tg[1:]): r.append((sv1, sv2, (own,) + tg[1:]))   # Buchangabe galt nicht: eigenes Buch
    return r
report = []
new_items = []
for key, vt in BIBLES.items():
    base = os.path.join(src, key, key + '-RoundtripHTML')
    md = open(os.path.join(base,'metadata.js'),encoding='utf8').read()
    books = re.findall(r'abbr:"([^"]*)",\s*short:"[^"]*",\s*long:"[^"]*",\s*osis:"([^"]*)",\s*type:"ot"', md)
    files = {unesc(os.path.basename(f)): f for f in glob.glob(os.path.join(base,'ot','*.html'))}
    for abbr, osis in books:
        title = OSIS[osis]; he, cats = meta[title]
        chs = []; ch = 1
        while True:
            f = files.get('%s_%d.html' % (abbr, ch))
            if not f: break
            s = open(f, encoding='utf8').read()
            a = s.index('id="verses">'); b = s.index('<!-- PARSED ABOVE')
            body = s[a:b]
            fns = {int(m.group(1)): re.sub(r'\s+',' ', html.unescape(re.sub(r'<[^>]+>','',m.group(2)))).strip() for m in re.finditer(r'<div class="fn"><sup class="fnt"><a name="fn(\d+)"[^>]*>\d+</a></sup>(.*?)</div>', body, flags=re.S)}
            verses = {}
            for m in re.finditer(r'<div class="v" id="v(\d+)">(.*?)</div>(?=\s*(?:<div class="v"|</div>|<div class="biblehtmlcontent footnotes"))', body.split('class="biblehtmlcontent footnotes"')[0], flags=re.S):
                n = int(m.group(1)); h = clean(m.group(2))
                def fnrep(k, n=n):
                    t = fns.get(int(k.group(1)), '')
                    if not t: return ''
                    if t.startswith('℘'):   # nur Verweise auf andere Stellen: als Querverweis merken, aus dem Text entfernen
                        for sv1, sv2, tg in fixup(parse_xref(t[1:], osis, ch, n), osis): xrefs.append((osis, ch, sv1, sv2) + tg)
                        return ''
                    return '<sup class="footnote-marker">%s</sup><i class="footnote">%s</i>' % (k.group(1), html.escape(t, quote=False))
                h = re.sub(r'<sup class="fnm"><a name="fnm(\d+)"[^>]*>\d+</a></sup>', fnrep, h)
                h = re.sub(r'(<br>\s*)+$','', h.strip()); h = re.sub(r'\s+',' ', h).strip()
                verses[n] = (verses.get(n,'') + ' ' + h).strip()
            mx = max(verses) if verses else 0
            cnt = [0]
            def renum(m): cnt[0] += 1; return '<sup class="footnote-marker">%d</sup>' % cnt[0]
            vl = [verses.get(i,'') for i in range(1, mx+1)]
            vl = [re.sub(r'<sup class="footnote-marker">\d+</sup>', renum, v) for v in vl]
            chs.append(vl); ch += 1
        hc = hecounts(title)
        if hc:
            diff = [(i+1, len(c), hc[i]) for i, c in enumerate(chs[:len(hc)]) if len(c) != hc[i]]
            if len(chs) != len(hc) or diff: report.append((key, title, len(chs), len(hc), diff[:6], len(diff)))
        d = {'title': title, 'heTitle': he, 'language': 'English', 'versionTitle': vt, 'versionSource': 'eigener Text', 'sectionNames': ['Chapter','Verse'], 'text': chs}
        rel = 'own/%s/de/%s.json' % (title, vt)
        p = os.path.join(out,'bundled',rel); os.makedirs(os.path.dirname(p), exist_ok=True)
        buf = json.dumps(d, ensure_ascii=False).encode('utf8'); open(p,'wb').write(buf)
        new_items.append({'rel': rel, 'title': title, 'heTitle': he, 'language': 'English', 'versionTitle': vt, 'categories': cats, 'kind': 'de', 'hash': hashlib.sha1(buf).hexdigest()})
have = {i['rel'] for i in new_items}
man['items'] = [i for i in man['items'] if i['rel'] not in have] + new_items
json.dump(man, open(os.path.join(out,'bundled','manifest.json'),'w',encoding='utf8'), ensure_ascii=False, indent=1)
json.dump(xrefs, open(os.path.join(out,'bibeln-xref.json'),'w'))
print(len(new_items), 'Texte;', len(xrefs), 'Querverweise; unbekannte Kürzel:', unknown)

for r in report: print(r)
