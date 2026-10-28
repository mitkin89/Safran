#!/usr/bin/env python3
"""CATSS (Computer Assisted Tools for Septuagint Studies, Tov/Kraft; Oxford Text Archive 1111, CC BY-NC-SA 3.0, siehe LICENSE-CATSS.md): Septuaginta-Spalte -> Safran.
Aufruf: python3 -I catss.py <Ordner mit file01-1111.txt … list-1111.txt> <Safran-Projektordner>  (Prüfmodus: ohne Projektordner nur Zahlen)"""
import sys, os, re, json, hashlib, unicodedata
src = sys.argv[1]; proj = sys.argv[2] if len(sys.argv) > 2 else None
LET = dict(zip('ABGDEZHQIKLMNCOPRSTUFXYW', 'αβγδεζηθικλμνξοπρστυφχψω'))
MARK = {')': '̓', '(': '̔', '/': '́', '\\': '̀', '=': '͂', '+': '̈', '|': 'ͅ'}
def greek(tok):
    out = []; i = 0
    tok = tok.replace('^', '')
    for k, ch in enumerate(tok):
        if ch in LET:
            if ch == 'S': out.append('σ')
            else: out.append(LET[ch])
        elif ch in MARK: out.append(MARK[ch])
        elif ch == "'": out.append('’')
        elif ch in ',;:·': out.append(ch)
        else: pass
    s = ''.join(out)
    if s and s[-1] == 'σ' or re.search('σ[̀-ͅ]*$', s):  # Schluss-Sigma
        s = re.sub('σ([̀-ͅ]*)$', r'ς\1', s)
    s = re.sub(r'σ(?=[.,;:·]+$)', 'ς', s)
    return unicodedata.normalize('NFC', s)
NAMES = {  # CATSS-Kürzel -> Sefaria-Titel, Tanach-Bücher
 'Gen': 'Genesis', 'Exod': 'Exodus', 'Lev': 'Leviticus', 'Num': 'Numbers', 'Dt': 'Deuteronomy', 'Jsh': 'Joshua', 'Jdga': 'Judges', 'Jdgb': 'Judges', '1Sm': 'I Samuel', '2Sm': 'II Samuel',
 '1Kg': 'I Kings', '2Kg': 'II Kings', 'Ps': 'Psalms', 'Prv': 'Proverbs', 'Job': 'Job', 'Isa': 'Isaiah', 'Jer': 'Jeremiah', 'Ezk': 'Ezekiel', 'Joel': 'Joel', 'Amos': 'Amos', 'Obad': 'Obadiah',
 'Jonah': 'Jonah', 'Micah': 'Micah', 'Nahum': 'Nahum', 'Hab': 'Habakkuk', 'Zeph': 'Zephaniah', 'Hag': 'Haggai', 'Zach': 'Zechariah', 'Mal': 'Malachi', 'Ruth': 'Ruth',
 'Song': 'Song of Songs', 'Qoh': 'Ecclesiastes', 'Lam': 'Lamentations', 'Esth': 'Esther', 'Dan': 'Daniel', 'DanTh': 'Daniel', 'Ezr': 'Ezra', 'Neh': 'Nehemiah', '1Ch': 'I Chronicles', '2Ch': 'II Chronicles'}
HEB = {')': 'א', 'B': 'ב', 'G': 'ג', 'D': 'ד', 'H': 'ה', 'W': 'ו', 'Z': 'ז', 'X': 'ח', '+': 'ט', 'Y': 'י', 'K': 'כ', 'L': 'ל', 'M': 'מ', 'N': 'נ', 'S': 'ס', '(': 'ע',
       'P': 'פ', 'C': 'צ', 'Q': 'ק', 'R': 'ר', '&': 'ש', '$': 'ש', 'T': 'ת'}
FIN = {'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ'}
def hebrew(tok):  # CATSS-Umschrift (nur Konsonanten) -> hebräische Buchstaben; „/“ trennt Präfixe und Suffixe, Endbuchstaben am Wortende
    h = ''.join(HEB.get(c, '') for c in tok.replace('/', ''))
    return h[:-1] + FIN.get(h[-1], h[-1]) if h else ''
TAGS = {'d': 'd', '!': 'i', 't': 't', 'p': 'v', 's': 's'}  # {d} Doublette, {!} Inf. abs., {t} Transliteration, {p} Präverb, {s} Komparativ
def add_line(hcol, gcol, units):  # eine Ausrichtungszeile: hebräische Spalte, griechische Spalte
    copies = [re.sub(r'^[a-z]?\^?', '', c).replace('^', '') for c in re.findall(r'\{\.\.([^}]*)\}', gcol)]  # {..pWORT}: Kopie des Wortes an der hebräischen Stelle
    tags = ''.join(TAGS[t] for t in re.findall(r'\{([d!tps])\??\}', hcol + ' ' + gcol) if t in TAGS)
    g = re.sub(r'\{[^}]*\}', ' ', gcol)
    gw = [w for w in g.split() if re.search('[A-Z]', w) and not re.search(r'[\[\]\d]', w) and greek(w)]
    hw = [hebrew(w) for w in hcol.split() if re.fullmatch(r"[A-Z)(&$+/]+", w)]
    hw = [w for w in hw if w]
    rv = [hebrew(re.sub(r'^=[;:@%+rv]*', '', w)) for w in hcol.split() if re.match(r"=;[A-Z)(&$+/]+$", w)]  # Spalte b: Rückübersetzung
    rv = [w for w in rv if w]
    for c in copies:  # Kopie: die Hebräisch-Wörter dieser Zeile gehören zum Platzhalter-Wort weiter oben
        for u in reversed(units):
            if u.get('ph') and c in u['g'] and not u.get('linked'):
                u['h'] += [w for w in hw if w not in u['h']]; u['linked'] = True; break
    for dbl, ref in re.findall(r'(\[\[)?\[(\d+(?::\d+)?)\]', gcol + ' ' + hcol):  # abweichende Verszählung: [n] = LXX, [[n]] = MT
        r = ('MT ' if dbl else 'LXX ') + ref
        if not any(u.get('ref') == r for u in units): units.append({'ref': r})
    if gw:
        f = tags + ('z' if hcol.lstrip().startswith('--+') else '') + ('u' if hcol.lstrip().startswith('{') else '')
        units.append({'g': gw, 'h': hw, 'ph': hcol.lstrip().startswith('{'), 'f': f, 'r': rv})
    elif hw and re.search(r'(^|\s)---', gcol) and not hcol.lstrip().startswith('{'):  # Minus der LXX: hebräisches Wort ohne griechisches Gegenstück
        units.append({'g': [], 'h': hw, 'ph': False, 'f': 'm', 'r': []})
books = {}  # Kürzel -> {Kap: {Vers: [Einheiten]}}; Einheit = {'g': [Wörter roh], 'h': [hebr. Wörter], 'ph': Platzhalterzeile}
for fp in sorted(f for f in os.listdir(src) if re.fullmatch(r'file\d+-1111\.txt', f)):
    cur = None; ch = 0; vs = 0
    for ln in open(os.path.join(src, fp), encoding='latin1').read().split('\n'):
        ln = ln.rstrip('\r')
        if ln.startswith('~'):
            m = re.search(r'c"([^"]+)"', ln)
            if m:
                cur = m.group(1); ch = 0; vs = 0
                if re.search(r'"y\d*$', ln): ch = 1  # Bücher mit nur einem Kapitel (~c"Obad"y0)
                continue
            m = re.match(r'~x(\d*)(?:y(\d+))?', ln)
            if m and ln.startswith('~x'):
                ch = int(m.group(1)) if m.group(1) else ch + 1
                vs = int(m.group(2)) if m.group(2) else 1
                continue
            m = re.match(r'~y(\d*)', ln)
            if m: vs = int(m.group(1)) if m.group(1) else vs + 1
            continue
        if cur not in NAMES or ln.startswith('*') or len(ln) <= 30 or not ch or not vs: continue
        add_line(ln[:30], ln[30:].strip(), books.setdefault(cur, {}).setdefault(ch, {}).setdefault(vs, []))
PAR = {'20.Psalms.par': 'Ps', '23.Prov.par': 'Prv', '26.Job.par': 'Job'}  # in den Oxford-Dateien fehlend; CCAT-Fassung (Tab-getrennt, mit Versüberschriften „Ps 3:1“)
for fn, key in PAR.items():
    fp = os.path.join(src, fn)
    if not os.path.exists(fp): continue
    units = None
    for ln in open(fp, encoding='latin1').read().split('\n'):
        ln = ln.rstrip('\r')
        m = re.fullmatch(r'\S+ (\d+):(\d+)', ln.strip())
        if m:
            units = books.setdefault(key, {}).setdefault(int(m.group(1)), {}).setdefault(int(m.group(2)), []); continue
        if units is None or '\t' not in ln or ln.startswith('*'): continue
        h, g = ln.split('\t', 1)
        add_line(h, g.strip(), units)
def verse_html(units, note=''):
    out = []
    for u in units:
        if 'ref' in u: out.append('<small>[%s]</small>' % u['ref']); continue
        t = ' '.join(greek(w) for w in u['g'])
        f = ''.join(sorted(set(u.get('f', ''))))
        out.append('<span class="wg%s" data-h="%s"%s%s>%s</span>' % (' wm' if 'm' in f else '', ' '.join(u['h']), ' data-f="%s"' % f if f else '', ' data-r="%s"' % ' '.join(u['r']) if u.get('r') else '', t))
    return ' '.join(out)
VERS = {'Jdga': 'Judges A (Codex Alexandrinus)', 'Jdgb': 'Judges B (Codex Vaticanus)', 'DanTh': 'Theodotion'}
if __name__ == '__main__' and proj and '--check' not in sys.argv:
    man_p = os.path.join(proj, 'bundled', 'manifest.json')
    man = json.load(open(man_p)) if os.path.exists(man_p) else {'version': 1, 'items': []}
    meta = {}
    for it in json.load(open(os.path.join(proj, 'bundled', 'manifest.json')))['items']: meta.setdefault(it['title'], it)
    man['items'] = [i for i in man['items'] if 'CATSS' not in i['versionTitle']]
    for k, d in books.items():
        title = NAMES[k]
        vt = 'Septuaginta (CATSS%s)' % (', ' + VERS[k] if k in VERS else '')
        arr = []
        for c in range(1, max(d) + 1):
            vs = d.get(c, {}); n = max(vs) if vs else 0
            arr.append([verse_html(vs.get(x, [])) for x in range(1, n + 1)])
        he = meta.get(title, {})
        data = {'title': title, 'heTitle': he.get('heTitle', title), 'language': 'Greek', 'versionTitle': vt,
                'versionSource': 'https://ota.bodleian.ox.ac.uk/repository/xmlui/handle/20.500.12024/1111 (CATSS, Tov/Kraft; CC BY-NC-SA 3.0); Griechisch aus der Beta-Code-Spalte umgewandelt',
                'sectionNames': ['Chapter', 'Verse'], 'text': arr}
        rel = 'own/%s/other/%s.json' % (title, vt)
        p = os.path.join(proj, 'bundled', rel); os.makedirs(os.path.dirname(p), exist_ok=True)
        raw = json.dumps(data, ensure_ascii=False); open(p, 'w', encoding='utf8').write(raw)
        man['items'].append({'rel': rel, 'title': title, 'heTitle': data['heTitle'], 'language': 'Greek', 'versionTitle': vt,
                             'categories': he.get('categories', ['Tanakh']), 'kind': 'other', 'hash': hashlib.sha1(raw.encode()).hexdigest()})
        print(vt, title, sum(1 for r in arr for x in r if x), 'Verse')
    json.dump(man, open(man_p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
