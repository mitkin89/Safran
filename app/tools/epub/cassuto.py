#!/usr/bin/env python3
"""Privat: U. Cassuto, A Commentary on the Book of Genesis (Part 1 + 2, EPUB) -> Safran-Kommentar "Cassuto on Genesis".
Aufruf: python3 -I cassuto.py <entpacktes-EPUB-Teil1> <entpacktes-EPUB-Teil2> <Safran-Projektordner>
Schreibt bundled/own/Cassuto on Genesis/en/*.json und ergänzt bundled/manifest.private.json (beides gitignored)."""
import re, sys, os, json, glob, base64, hashlib, collections
d1, d2, proj = sys.argv[1], sys.argv[2], sys.argv[3]
VERSION = 'Umberto Cassuto, A Commentary on the Book of Genesis (Magnes Press, Varda Books)'
ROMAN = {'I':1,'V':5,'X':10,'L':50}
def roman(s):
    n = 0; prev = 0
    for ch in reversed(s):
        v = ROMAN[ch]; n += -v if v < prev else v; prev = max(prev, v)
    return n
def key(f): return int(re.search(r'(\d+)', os.path.basename(f)).group(1))
SMALL = {'of','the','and','in','to','from','a','an','at','on','for','by','with'}
def headcase(t):
    ws = t.lower().split(' ')
    return ' '.join(w if (i and w in SMALL) else w[:1].upper() + w[1:] for i, w in enumerate(ws))
def plain(h): return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', h)).strip()
def flat(d):
    out = []
    for f in sorted(glob.glob(os.path.join(d, 'index_split_*.html')), key=key):
        body = open(f, encoding='utf8').read().split('<body', 1)[1]
        first = True
        for m in re.finditer(r'<p class="([^"]*)"[^>]*>(.*?)</p>', body, re.S):
            c, inner = m.group(1), m.group(2)
            t = plain(inner)
            if not t: continue
            # Seitenwechsel mitten im Absatz: Fortsetzung an den vorigen Absatz hängen
            if first and out and not re.search(r'[.!?:;”’)\]»]\s*$', plain(out[-1][1])) and not re.match(r'\s*(<[^>]+>)*\s*(§|\d+[–-]?\d*\.|[A-Z]{3,})', inner):
                out[-1] = (out[-1][0], out[-1][1] + ' ' + inner); first = False; continue
            first = False
            out.append((c, inner))
    return out
def conv(inner, d):
    """EPUB-Absatz -> einfaches HTML (i, b, sup, br, Bilder als data:-URI)."""
    toks = re.split(r'(<[^>]+>)', inner); out = []; stack = []
    for t in toks:
        if not t.startswith('<'): out.append(t.replace('\xa0', ' ')); continue
        m = re.match(r'<(/?)([a-zA-Z0-9]+)([^>]*)>', t)
        if not m: continue
        close, name, attrs = m.group(1), m.group(2).lower(), m.group(3)
        if name == 'span':
            if close:
                tag = stack.pop() if stack else None
                if tag: out.append('</%s>' % tag)
            else:
                cl = re.search(r'class="([^"]*)"', attrs); cl = cl.group(1) if cl else ''
                tag = 'i' if cl == 'italic' else 'b' if cl == 'bold' else 'sup' if cl == 'calibre12' else None
                stack.append(tag)
                if tag: out.append('<%s>' % tag)
        elif name in ('i', 'b', 'sup', 'sub'):
            out.append('</%s>' % name if close else '<%s>' % name)
        elif name == 'br': out.append('<br>')
        elif name == 'img' and not close:
            src = re.search(r'src="([^"]+)"', attrs)
            if src:
                p = os.path.join(d, src.group(1))
                if os.path.exists(p):
                    out.append('<img class="g" src="data:image/jpeg;base64,%s">' % base64.b64encode(open(p, 'rb').read()).decode())
    s = ''.join(out)
    s = re.sub(r'<(i|b|sup)>\s*</\1>', '', s)
    return re.sub(r'\s+', ' ', s).strip()
text = collections.defaultdict(list)   # (kap, vers) -> Absätze
ranges = {}                            # (kap, v1) -> v2
seen_sections = 0
for d in (d1, d2):
    P = flat(d)
    # Übersetzungs-Klassen: Absätze „N. … / …“ (zeilenweise gesetzte Bibelübersetzung)
    n = collections.Counter(); sl = collections.Counter()
    for c, h in P:
        t = plain(h)
        if re.match(r'^\d+(?:[–-]\d+)?\.\s', t):
            n[c] += 1
            if ' / ' in t: sl[c] += 1
    TR = {c for c in n if n[c] >= 20 and sl[c] >= 0.6 * n[c]}
    start = next(i for i, (c, h) in enumerate(P) if re.match(r'^SECTION\s*\d+$', plain(h)))
    ch = v = None; blk = None; heads = []; pending_chapter_only = False
    cur = None
    def add(html):
        global cur
        if cur is None: return
        if heads:
            for hd in heads: text[cur].append('<b>%s</b>' % hd)
            heads.clear()
        text[cur].append(html)
    for i in range(start, len(P)):
        c, h = P[i]; t = plain(h)
        if re.match(r'^(INDEX|ADDENDA|ABBREVIATIONS|ANALYTICAL INDEX)\b', t): break
        if re.match(r'^SECTION\s*\d+$', t):
            ch = v = None; cur = None; blk = None; continue
        m = re.match(r'^CHAPTER ([IVXL]+)(?:\s*,\s*(?:VERSES?\s*)?(\d+)(?:\s*[–-]\s*\d+)?)?(?:\s*[—–-]\s*CHAPTER.*)?$', t)
        if m:
            ch = roman(m.group(1)); v = int(m.group(2)) if m.group(2) else None
            if v: cur = (ch, v)
            elif cur is None or cur[0] != ch: cur = (ch, 1)
            blk = None; continue
        if ch is None:   # Abschnittstitel zwischen SECTION und CHAPTER: als Überschrift der Einleitung merken
            if c == 'calibre_' or t.isupper(): heads.append(headcase(t) if t.isupper() else t)
            continue
        # Übersetzungszeile?
        mt = re.match(r'^(\d+)(?:\s*[–-]\s*(\d+))?\.\s', t)
        is_tr = bool(mt) and (c in TR or (' / ' in t and ']' not in t[:200]))
        if is_tr:
            vv = int(mt.group(1)); cur = (ch, vv)
            blk = (blk[0], max(blk[1], vv)) if blk else (vv, vv)
            continue
        # Überschriften (alles groß / eigene Überschriftenklasse)
        if (c == 'calibre_' or t.isupper()) and len(t) < 160 and not mt:
            # „FIRST PARAGRAPH THE STORY OF THE FIRST DAY“ u. ä.: neuer Block
            if re.search(r'PARAGRAPH|INTRODUCTORY VERSE|CONCLUSION|CONCLUDING', t): blk = None
            ht = plain(re.sub(r'<br[^>]*>', ' – ', h))
            heads.append(headcase(ht) if ht.replace(' ', '').replace('–', '').isupper() else ht)
            continue
        # Verskommentar „N. Stichwort] …“ / „N–M. …“
        if mt and c not in TR:
            v1 = int(mt.group(1)); v2 = int(mt.group(2)) if mt.group(2) else v1
            lo, hi = blk if blk else ((cur[1], cur[1] + 3) if cur and cur[0] == ch else (1, 3))
            if lo <= v1 <= hi + 0 or (blk is None and cur and 0 <= v1 - cur[1] <= 3):
                cur = (ch, v1)
                if v2 > v1: ranges[(ch, v1)] = v2
                html = conv(h, d)
                k = html.find(']')
                if 0 < k < 220: html = '<b>' + html[:k + 1] + '</b>' + html[k + 1:]
                add(html); continue
        add(conv(h, d))
# Ergebnis bauen
KAP = max(k[0] for k in text)
arr = []
for c in range(1, KAP + 1):
    vs = [k[1] for k in text if k[0] == c]
    n = max(vs) if vs else 0
    row = ['<br><br>'.join(text[(c, x)]) if (c, x) in text else '' for x in range(1, n + 1)]
    arr.append(row)
for (c, v1), v2 in ranges.items():   # Hinweis auf spätere Verse eines gemeinsam kommentierten Bereichs
    for x in range(v1 + 1, v2 + 1):
        if c <= len(arr) and x <= len(arr[c - 1]) and not arr[c - 1][x - 1]:
            arr[c - 1][x - 1] = '<i>Commentary on vv. %d–%d: see v. %d.</i>' % (v1, v2, v1)
title = 'Cassuto on Genesis'
data = {'title': title, 'heTitle': 'קאסוטו על בראשית', 'language': 'English', 'versionTitle': VERSION,
        'versionSource': 'Umberto Cassuto, A Commentary on the Book of Genesis (eigenes EPUB, nur privat)',
        'sectionNames': ['Chapter', 'Verse'], 'text': arr}
rel = 'own/%s/en/%s.json' % (title, VERSION)
p = os.path.join(proj, 'bundled', rel); os.makedirs(os.path.dirname(p), exist_ok=True)
raw = json.dumps(data, ensure_ascii=False); open(p, 'w', encoding='utf8').write(raw)
mp = os.path.join(proj, 'bundled', 'manifest.private.json')
man = json.load(open(mp)) if os.path.exists(mp) else {'version': 1, 'items': []}
man['items'] = [i for i in man['items'] if i['title'] != title]
man['items'].append({'rel': rel, 'title': title, 'heTitle': data['heTitle'], 'language': 'English', 'versionTitle': VERSION,
                     'categories': ['Tanakh', 'Commentary', 'Umberto Cassuto'], 'kind': 'en', 'hash': hashlib.sha1(raw.encode()).hexdigest()})
json.dump(man, open(mp, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('Kapitel', len(arr), 'Verse mit Text', sum(1 for r in arr for x in r if x), 'Größe MB', round(len(raw) / 1e6, 1))
for i, r in enumerate(arr, 1): print(i, len(r), sum(1 for x in r if x), end=' | ')
print()
