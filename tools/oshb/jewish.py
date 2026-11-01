#!/usr/bin/env python3
"""Westminster Leningrad Codex (OSHB) von der christlichen auf die masoretische (jüdische) Verszählung umbauen.

Vorgehen: Wörter von OSHB und dem hebräischen Text von Sefaria („Tanach with Text Only“, jüdische Zählung)
werden pro Buch konsonantisch einander zugeordnet; jedes OSHB-Wort kommt in den Vers, in dem sein
Sefaria-Gegenstück steht. Kapitel- und Verszahl folgen danach exakt Sefaria.

Aufruf: python3 tools/oshb/jewish.py <Ordner mit Sefaria-JSON je Buch> [--write]
Ohne --write wird nur geprüft und berichtet.
"""
import json, glob, os, re, sys, hashlib, difflib

PROJ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
VT = 'Westminster Leningrad Codex (OSHB, mit Morphologie)'
SPAN = re.compile(r'<span class="w"[^>]*>[^<]*</span>')
STRIP = re.compile(r'[֑-ׇ]')          # Vokale, Akzente, Maqaf (U+05BE), Paseq, Sof Pasuq
KEEP = re.compile(r'[^א-ת]')           # nur hebräische Konsonanten


def norm(w):
    w = re.sub(r'<[^>]+>', '', w)
    w = w.replace('־', '').replace('־', '')
    w = STRIP.sub('', w)
    w = KEEP.sub('', w)
    # Schluss-/Normalformen angleichen
    return w.translate(str.maketrans('ךםןףץ', 'כמנפצ'))


def wlc_words(chapters):
    """-> Liste (html, norm, Kapitel, Vers, Trennzeichen davor) aller Wörter; Trennzeichen (Leerzeichen, Maqaf, Paseq)
    bleiben erhalten"""
    words = []
    for ci, ch in enumerate(chapters):
        for vi, v in enumerate(ch):
            pos = 0
            for m in SPAN.finditer(v):
                glue = v[pos:m.start()]
                pos = m.end()
                words.append((m.group(0), norm(m.group(0)), ci, vi, glue))
    return words


def sef_words(text):
    out = []
    for ci, ch in enumerate(text):
        for vi, v in enumerate(ch):
            t = re.sub(r'<[^>]+>', ' ', v if isinstance(v, str) else '')
            t = re.sub(r'&[a-z]+;', ' ', t).replace('־', ' ').replace('־', ' ')
            for w in t.split():
                n = norm(w)
                if n:
                    out.append((n, ci, vi))
    return out


def convert(title, wlc_chapters, sef_text):
    wlc_chapters = wlc_chapters
    A = wlc_words(wlc_chapters)
    B = sef_words(sef_text)
    a = [x[1] for x in A]
    b = [x[0] for x in B]
    # Wörter mit leerer Normalform (z. B. nur Zeichen) haben wir oben schon verworfen; hier ggf. leere A-Wörter mitführen
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    target = [None] * len(A)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            for k in range(i2 - i1):
                target[i1 + k] = (B[j1 + k][1], B[j1 + k][2])
        elif tag == 'replace':
            n, m = i2 - i1, j2 - j1
            for k in range(n):
                j = j1 + (k if n == m else min(m - 1, int(k * m / n)))
                target[i1 + k] = (B[j][1], B[j][2])
        # delete/insert: später
    # Lücken (delete) füllen: Vers des Vorgängers
    last = None
    for k in range(len(target)):
        if target[k] is None:
            target[k] = last
        else:
            last = target[k]
    first = next((t for t in target if t), (0, 0))
    target = [t or first for t in target]
    # monoton machen
    cur = (0, 0)
    for k in range(len(target)):
        if target[k] < cur:
            target[k] = cur
        cur = target[k]
    # neue Struktur
    new = [[[] for _ in ch] for ch in sef_text]
    first_in = {}
    for k, (html, n, ci, vi, glue) in enumerate(A):
        tc, tv = target[k]
        lst = new[tc][tv]
        if not lst:
            lst.append(html)
        else:
            # gleicher alter Vers wie das vorige Wort: Trennzeichen übernehmen, sonst Leerzeichen
            same = k > 0 and (A[k - 1][2], A[k - 1][3]) == (ci, vi)
            lst.append((glue if same and glue else ' ') + html)
    res = []
    for ci, ch in enumerate(new):
        row = []
        for vi, v in enumerate(ch):
            cand = (''.join(v) + '׃') if v else ''
            # gleiche Wörter wie in der bisherigen Fassung: Text unverändert lassen (Sof Pasuk ggf. wie bisher)
            if ci < len(wlc_chapters) and vi < len(wlc_chapters[ci]):
                o = wlc_chapters[ci][vi]
                if o.rstrip('׃').rstrip() == cand.rstrip('׃').rstrip():
                    cand = o
            row.append(cand)
        res.append(row)
    return res, A, target, B


def report(title, wlc_chapters, sef_text, res, A, target):
    probs = []
    # Vergleich Verse mit gleichem Wortbestand
    chg = 0
    for ci, ch in enumerate(sef_text):
        for vi, _ in enumerate(ch):
            same_old = ci < len(wlc_chapters) and vi < len(wlc_chapters[ci]) and wlc_chapters[ci][vi].strip() == res[ci][vi].strip()
            if not same_old:
                chg += 1
    empty = [(ci + 1, vi + 1) for ci, ch in enumerate(res) for vi, v in enumerate(ch) if not v]
    return chg, empty


def main():
    src = sys.argv[1]
    write = '--write' in sys.argv
    man_path = os.path.join(PROJ, 'bundled', 'manifest.json')
    man = json.load(open(man_path, encoding='utf-8'))
    tot_chg = 0
    for it in man['items']:
        if it.get('versionTitle') != VT:
            continue
        title = it['title']
        f = os.path.join(PROJ, 'bundled', it['rel'])
        d = json.load(open(f, encoding='utf-8'))
        sef = json.load(open(os.path.join(src, title + '.json'), encoding='utf-8'))
        res, A, target, B = convert(title, d['text'], sef['text'])
        chg, empty = report(title, d['text'], sef['text'], res, A, target)
        old_counts = [len(c) for c in d['text']]
        new_counts = [len(c) for c in res]
        diffch = [i + 1 for i, (x, y) in enumerate(zip(old_counts, new_counts)) if x != y]
        print(f"{title}: Kapitel {len(old_counts)}→{len(new_counts)}, geänderte Verse {chg}, Kapitel mit anderer Versanzahl {len(diffch)}{(' ' + str(diffch[:12])) if diffch else ''}, leere Verse {empty[:5]}")
        tot_chg += chg
        if write and res != d['text']:  # nur geänderte Bücher neu schreiben (neuer Hash → die App holt nur diese)
            d['text'] = res
            raw = json.dumps(d, ensure_ascii=False)
            open(f, 'w', encoding='utf-8').write(raw)
            it['hash'] = hashlib.sha1(raw.encode('utf-8')).hexdigest()
    print('geänderte Verse insgesamt:', tot_chg)
    if write:
        json.dump(man, open(man_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
