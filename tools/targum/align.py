#!/usr/bin/env python3
"""Interlinear für die Targumim: jedes aramäische Wort (Onkelos, Pseudo-Jonathan, Neofiti 1) einem oder mehreren Wörtern des
Westminster-Textes zuordnen. Maschinell, ohne Handarbeit:
  1. Ähnlichkeit je Wortpaar: gleiche Wurzel (mit den üblichen Lautentsprechungen hebr. צ/ש/ז ~ aram. ע,ט/ת/ד), gleiche englische
     Bedeutung (OSHB-Lemma ~ ETCBC-Lexem), eine Liste fester Wiedergaben (את -> ית, אשר -> ד, יהוה -> יוי, אמר -> אמר, דבר -> מלל …)
     und die Vorsilben (ו, ב, ל, מ, כ, ד/ש).
  2. Anker: beste Zuordnung in gleicher Reihenfolge (dynamische Programmierung).
  3. Lücken zwischen zwei Ankern: gleich viele Wörter -> der Reihe nach; ein hebräisches Wort -> alle aramäischen Wörter dazwischen
     (bis 3); ein aramäisches Wort -> alle hebräischen Wörter dazwischen (bis 3); sonst bleibt die Lücke ohne Zuordnung (Zusätze).
Ausgabe: targum-il.js (window.TARGUM_IL = {Targum: {Buch: [[Vers, …] je Kapitel]}}); je Vers ein String mit einem Eintrag je
aramäischem Wort (Leerzeichen getrennt, wie im Lesetext): Nummern der Westminster-Wörter mit Komma, „-“ = ohne Gegenstück.
Aufruf: python3 -I tools/targum/align.py [Projektordner]"""
import json, re, os, sys, glob
proj = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
def jsobj(f):
    s = open(os.path.join(proj, f), encoding='utf8').read(); return json.loads(s[s.index('=') + 1:s.rindex(';') if s.rstrip().endswith(';') else None].strip().rstrip(';'))
HL = jsobj('oshb-lemmas.js'); AL = jsobj('targum-lex.js')
BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy']
TG = {'Onkelos': 'Targum Onkelos (ETCBC*', 'Pseudo-Jonathan': 'Targum Pseudo-Jonathan (ETCBC*', 'Neofiti': 'Targum Neofiti 1 (ETCBC*'}
FIN = str.maketrans('ךםןףץ', 'כמנפצ'); FINAL = str.maketrans('כמנפצ', 'ךםןףץ')
cons = lambda s: re.sub(r'[^א-ת]', '', s or '').translate(FIN)
def core(s):  # Wurzelkern: Endbuchstaben א/ה/י/ו weg, Lesevokale im Inneren weg
    s = cons(s)
    while len(s) > 2 and s[-1] in 'אהיו': s = s[:-1]
    t = s[0] + re.sub(r'[יו]', '', s[1:]) if s else s
    return t if len(t) >= 2 else s
COG = str.maketrans('צשזס', 'עתדת')
STOP = set('to the a an of be in on at by for with and or not is as from into one that this who which upon up out off make made do give'.split())
def gl(s): return {w for w in re.findall(r'[a-z]+', (s or '').lower()) if w not in STOP and len(w) > 2}
# feste Wiedergaben: Strong-Nummer -> aramäische Lexeme (Konsonanten)
FIX = {853: 'ית', 834: 'ד די', 3588: 'ארי', 3068: 'יוי יהוה ייי', 430: 'יוי אלה', 413: 'ל לות עמ על', 5921: 'על', 3808: 'לא', 408: 'לא',
       3605: 'כל כלל', 2009: 'הא', 1571: 'אפ', 518: 'אמ', 854: 'עמ', 5973: 'עמ', 4480: 'מנ', 3651: 'כנ כדנ', 6440: 'אפ אנפ אפינ קדמ', 6258: 'כענ כען',
       1696: 'מלל', 7200: 'חזי', 1980: 'אזל הלכ', 935: 'עלל אתי', 3318: 'נפק', 5414: 'יהב', 3947: 'נסב דבר', 6213: 'עבד', 7725: 'תוב',
       3427: 'יתב', 8085: 'שמע קבל', 1121: 'בר', 1323: 'ברת', 376: 'גבר אנש', 802: 'אתת', 2896: 'טב', 7451: 'ביש', 3117: 'יומ',
       6680: 'פקד', 4191: 'מות מית', 5650: 'עבד', 1697: 'פתגמ מלה', 3519: 'יקר', 5971: 'עמ', 1471: 'עממ', 7121: 'קרי', 6965: 'קומ',
       1931: 'הוא', 1992: 'הנונ אנונ', 589: 'אנא', 595: 'אנא', 859: 'את אנת', 587: 'אנחנא', 2088: 'דנ', 428: 'אלינ', 3541: 'כדנ',
       4100: 'מה', 4310: 'מנ', 3644: 'כ', 1961: 'הוי', 3426: 'אית', 369: 'לית', 3972: 'מדעמ', 5704: 'עד', 8478: 'תחות', 310: 'בתר',
       6153: 'רמש', 1242: 'צפר', 216: 'נהור', 2822: 'חשוכ', 7549: 'רקיע', 914: 'פרש', 7307: 'רוח', 8415: 'תהומ', 3220: 'ימ',
       3372: 'דחל', 2803: 'חשב', 4725: 'אתר', 1870: 'ארח', 2091: 'דהב', 3701: 'כספ', 6635: 'חיל', 4196: 'מדבח', 4639: 'עובד',
       1285: 'קימ', 4687: 'פקוד', 2706: 'קימ', 4941: 'דינ', 6944: 'קודש', 6918: 'קדיש', 2930: 'מסאב', 2889: 'דכי', 5930: 'עלה',
       2077: 'נכסת', 2398: 'חוב', 2403: 'חטא', 5771: 'חוב', 3722: 'כפר', 5375: 'נטל', 2142: 'דכר', 1004: 'בית', 5869: 'עינ', 3027: 'יד',
       3820: 'לב', 3824: 'לבב', 5315: 'נפש', 4428: 'מלכ', 776: 'ארע', 8064: 'שמינ', 4325: 'מי מיינ מינ', 3915: 'ליל', 1288: 'ברכ', 3205: 'ילד'}
FIX = {k: set(v.split()) for k, v in FIX.items()}
FUNC = {853, 834, 3588, 413, 5921, 3808, 408, 2009, 1571, 518, 854, 5973, 4480, 3651, 5704, 8478, 310, 3644, 1931, 1992, 589, 595, 859, 587, 2088, 428, 3541, 4100, 4310, 3426, 369, 3605}
PFX_H = {'c': 'ו', 'b': 'ב', 'l': 'ל', 'm': 'מ', 'k': 'כ', 's': 'ד'}
def heb_words(html):
    out = []
    for l, t in re.findall(r'<span class="w" data-l="([^"]*)"[^>]*>(.*?)</span>', html):
        parts = l.split('/'); m = re.match(r'\d+', parts[-1]); sn = int(m.group()) if m else None
        lem = (HL.get(parts[-1].strip()) or HL.get(str(sn)) or HL.get('%s a' % sn) or HL.get('%s b' % sn) or ['', '', '']) if sn else ['', '', '']
        pf = {PFX_H[p] for p in parts[:-1] if p in PFX_H}
        txt = cons(t)
        if len(parts) > 1 and txt and txt[0] in 'ובלמכה' and sum(1 for p in parts[:-1] if p in 'cblmkd') : txt = txt[sum(1 for p in parts[:-1] if p in 'cblmkd'):]  # Wortkörper ohne Vorsilben
        out.append({'key': next((x.strip() for x in parts if re.search(r'\d', x)), ''), 'sn': sn, 'pf': pf, 'core': core(lem[0]), 'gl': gl(lem[1]), 'txt': txt, 'body': core(txt)})
    return out
def ara_words(html):  # grafische Wörter (durch Leerraum getrennt) mit ihren Morphemen
    plain = re.sub(r'<[^>]+>', '', html); words = plain.split()
    toks = re.findall(r'(<span class="wt" data-l="([^"]*)" data-m="([^"]*)">(.*?)</span>)|(\s+)|([^<\s]+)', html)
    out, cur = [], []
    for full, lid, mc, t, sp, other in toks:
        if sp:
            if cur: out.append(cur); cur = []
            continue
        if full: cur.append((lid, mc.split('.')[0], t))
        elif other: cur.append(('', '', other))
    if cur: out.append(cur)
    if len(out) != len(words): return words, None
    res = []
    for w in out:
        ms = []
        for lid, pos, t in w:
            L = AL.get(lid, ['', '', ''])
            ms.append({'lex': cons(L[0]), 'root': cons(L[1]), 'core': core(L[1] or L[0]), 'gl': gl(L[2]), 'pos': pos, 'txt': cons(t), 'id': lid, 'voc': re.sub(r'<[^>]+>', '', t), 'gl0': L[2]})
        res.append(ms)
    return words, res
def msim(h, m):
    s = 0
    fx = FIX.get(h['sn'], ())
    if fx and (m['lex'] in fx or m['root'] in fx or m['txt'] in fx or any(len(f) >= 2 and (m['txt'].startswith(f) or m['lex'].startswith(f)) for f in fx)): s = 2.2 if h['sn'] in FUNC else 3.5  # Funktionswörter binden schwächer als Inhaltswörter
    elif h['sn'] is None and h['pf'] and m['pos'] == 'prep' and m['txt'][:1] in h['pf']: s = 2.2  # לְךָ, לָהֶם … ~ לך, להון
    if len(m['txt']) <= 1 and m['pos'] in ('conj', 'prep', 'art'): return min(s, 1)  # Vorsilbe allein trägt keine Bedeutung (Anker nur über den Wortkörper)
    if h['body'] and len(h['body']) >= 3 and core(m['txt']) == h['body']: s = max(s, 3)  # gleiches Schriftbild (Namen)
    a, b = h['core'], m['core']
    if a and b:
        if a == b or a.translate(COG) == b.translate(COG): s = max(s, 3)
        elif len(a) >= 3 and len(b) >= 3 and (a[:3] == b[:3] or a.translate(COG)[:3] == b.translate(COG)[:3]): s = max(s, 2)
    if h['gl'] and m['gl'] and h['gl'] & m['gl']: s = max(s, 2.5)
    return s
def sim(h, a):
    best = max((msim(h, m) for m in a), default=0)
    if best and h['pf']:
        pre = {m['txt'] for m in a if len(m['txt']) == 1}
        best += 0.3 * len(h['pf'] & pre)
    return best
def align(H, A):
    n, m = len(H), len(A)
    S = [[sim(h, a) for a in A] for h in H]
    # DP: maximale Summe der Anker-Ähnlichkeiten (nur Paare ab 2), Reihenfolge erhalten
    D = [[0.0] * (m + 1) for _ in range(n + 1)]; B = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            best, bk = D[i - 1][j], 1
            if D[i][j - 1] > best: best, bk = D[i][j - 1], 2
            s = S[i - 1][j - 1]
            if s >= 2 and D[i - 1][j - 1] + s - 0.05 * abs((i - 1) / max(n, 1) - (j - 1) / max(m, 1)) * 10 > best:
                best, bk = D[i - 1][j - 1] + s - 0.05 * abs((i - 1) / max(n, 1) - (j - 1) / max(m, 1)) * 10, 3
            D[i][j], B[i][j] = best, bk
    anchors, i, j = [], n, m
    while i and j:
        if B[i][j] == 3: anchors.append((i - 1, j - 1)); i -= 1; j -= 1
        elif B[i][j] == 1: i -= 1
        else: j -= 1
    anchors.reverse()
    res = [[] for _ in range(m)]
    for hi, aj in anchors: res[aj] = [hi + 1]
    pts = [(-1, -1)] + anchors + [(n, m)]
    for (h0, a0), (h1, a1) in zip(pts, pts[1:]):
        hs, as_ = list(range(h0 + 1, h1)), list(range(a0 + 1, a1))
        if not hs or not as_: continue
        if len(hs) == len(as_):
            for x, y in zip(hs, as_): res[y] = [x + 1]
        elif len(hs) == 1 and len(as_) <= 3:
            for y in as_: res[y] = [hs[0] + 1]
        elif len(as_) == 1 and len(hs) <= 3: res[as_[0]] = [x + 1 for x in hs]
        elif len(hs) < len(as_) and len(as_) - len(hs) <= 2 and all(max(S[x][y] for y in as_) > 0 for x in hs):
            for x in hs:  # jedes hebräische Wort an sein ähnlichstes aramäisches Wort
                y = max(as_, key=lambda y: S[x][y]); res[y] = [x + 1]
    used = {i for r in res for i in r}
    for x in range(n):
        if x + 1 in used or not FIX.get(H[x]['sn']): continue
        for y in range(m):
            if res[y] and any(abs(i - 1 - x) == 1 for i in res[y]) and any(len(mm['txt']) == 1 and (mm['txt'] in FIX[H[x]['sn']] or mm['lex'] in FIX[H[x]['sn']]) for mm in A[y]):
                res[y] = sorted(set(res[y] + [x + 1])); used.add(x + 1); break
    return res, anchors
REN, TGI = {}, {'Onkelos': 0, 'Pseudo-Jonathan': 1, 'Neofiti': 2}
def main():
    out, stat = {}, {}
    for tg, pat in TG.items():
        out[tg] = {}; tot = cov = hw = hcov = 0
        for book in BOOKS:
            he = json.load(open(glob.glob(os.path.join(proj, 'bundled', 'own', book, 'he', 'Westminster*'))[0], encoding='utf8'))['text']
            ar = json.load(open(glob.glob(os.path.join(proj, 'bundled', 'own', book, 'other', pat))[0], encoding='utf8'))['text']
            chs = []
            for c, ch in enumerate(ar):
                vs = []
                for v, html in enumerate(ch):
                    hh = he[c][v] if c < len(he) and v < len(he[c]) else ''
                    words, A = ara_words(html or '')
                    H = heb_words(hh)
                    if not html or not H or A is None: vs.append(''); continue
                    res, _ = align(H, A)
                    vs.append(' '.join(','.join(map(str, r)) if r else '-' for r in res))
                    for j, r in enumerate(res):  # Wiedergaben je hebräischem Lemma zählen (nur Wortkörper, keine Vorsilben)
                        if not r: continue
                        for mm in A[j]:
                            if not mm['id'] or (len(mm['txt']) <= 1 and mm['pos'] in ('conj', 'prep', 'art')): continue
                            hs = [H[i - 1] for i in r]
                            h = hs[0] if len(hs) == 1 else max(hs, key=lambda h: msim(h, mm))
                            if len(hs) > 1 and msim(h, mm) <= 0: continue
                            if not h['key']: continue
                            lk = mm['lex'] or mm['txt']
                            if lk in ('ייי', 'יהוה'): lk = 'יוי'  # Gottesname: eine Zeile
                            if len(lk) < 2: continue
                            e = REN.setdefault(h['key'], {}).setdefault(lk, [0, 0, 0, {}, mm['gl0']])
                            e[TGI[tg]] += 1; e[3][mm['voc']] = e[3].get(mm['voc'], 0) + 1
                    tot += len(res); cov += sum(1 for r in res if r); hw += len(H); hcov += len({i for r in res for i in r})
                chs.append(vs)
            out[tg][book] = chs
        stat[tg] = 'aram. Wörter %d, zugeordnet %.1f %%; hebr. Wörter %d, mit Gegenstück %.1f %%' % (tot, 100 * cov / tot, hw, 100 * hcov / hw)
    ren = {}
    for k, d in REN.items():
        items = sorted(d.items(), key=lambda x: -(x[1][0] + x[1][1] + x[1][2]))
        tot = sum(x[1][0] + x[1][1] + x[1][2] for x in items)
        ren[k] = '%d|%d|' % (tot, len(items)) + ','.join('%s:%d:%d:%d:%s' % (lk[:-1] + lk[-1].translate(FINAL), e[0], e[1], e[2], (e[4] or '').split(',')[0].split('|')[0].strip().replace(':', ' ').replace(',', ' ')) for lk, e in items[:12])
    p = os.path.join(proj, 'targum-ren.js')
    open(p, 'w', encoding='utf8').write('// Wortkarte: Wiedergabe eines hebräischen Lemmas (Strong-Nummer wie in der OSHB) in den Targumim -> "Zuordnungen|verschiedene Lexeme|Lexem:Onkelos:Pseudo-Jonathan:Neofiti:Bedeutung,…" (die zwölf häufigsten); maschinell aus tools/targum/align.py; ETCBC Targum Corpus (CC BY-NC 4.0)\nwindow.TARGUM_REN=' + json.dumps(ren, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('targum-ren.js', os.path.getsize(p), 'Bytes', len(ren), 'Lemmata')
    p = os.path.join(proj, 'targum-il.js')
    open(p, 'w', encoding='utf8').write('// Interlinear der Targumim: aramäisches Wort -> Westminster-Wörter (maschinell, tools/targum/align.py); Daten: ETCBC Targum Corpus (CC BY-NC 4.0), OSHB (CC BY 4.0)\nwindow.TARGUM_IL=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    for k, v in stat.items(): print(k, v)
    print('targum-il.js', os.path.getsize(p), 'Bytes')
if __name__ == '__main__': main()
