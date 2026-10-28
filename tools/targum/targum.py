#!/usr/bin/env python3
"""ETCBC Targum Corpus (MIT, alpha) -> Safran: Targum Pseudo-Jonathan und Targum Neofiti 1 (Grundtext), Genesis bis Deuteronomium.
Aufruf: python3 -I targum.py <ETCBC/targum-Ordner mit xml/2026-09-29/…> <Safran-Projektordner>
Quelle: https://github.com/ETCBC/targum (MIT). Lesetext = unmarkierter Text + Zusätze; Löschungen, Varianten und Interlinearzusätze fallen weg."""
import re, sys, os, json, hashlib
import xml.etree.ElementTree as ET
repo, proj = sys.argv[1], sys.argv[2]
SRC = [  # (Datei, Versionstitel)
    (['1_pseudo_jonathan', '2_pseudo_jonathan', '3_pseudo_jonathan', '4_pseudo_jonathan', '5_pseudo_jonathan'], 'Targum Pseudo-Jonathan (ETCBC Targum Corpus, BL Add. Ms. 2703)'),
    (['59_neofiti_base', '60_neofiti_base', '61_neofiti_base', '62_neofiti_base', '63_neofiti_base'], 'Targum Neofiti 1 (ETCBC Targum Corpus, Grundtext)'),
]
INC = {'unmarked_text', 'marked_text', 'addition', 'incomplete', 'broken_text', None}
FINAL = {'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ'}
def fix_final(s):  # Endbuchstaben mitten im Wort (Segmentgrenze) in die normale Form zurücksetzen
    return re.sub(r'([ךםןףץ])(?=[א-תְ-ׇ])', lambda m: FINAL[m.group(1)], s)
TR = {'>': 'א', 'B': 'ב', 'G': 'ג', 'D': 'ד', 'H': 'ה', 'W': 'ו', 'Z': 'ז', 'X': 'ח', 'V': 'ט', 'J': 'י', 'K': 'כ', 'L': 'ל', 'M': 'מ',
      'N': 'נ', 'S': 'ס', '<': 'ע', 'P': 'פ', 'Y': 'צ', 'Q': 'ק', 'R': 'ר', '#': 'ש', 'C': 'ש', 'F': 'ש', '$': 'ש', 'T': 'ת'}
def heb(t): return ''.join(TR.get(c, '') for c in (t or ''))
LEX = {}  # lex -> (id, [Lexem, Wurzel, Bedeutung])
def lid(w):
    k = w.get('lex') or ''
    if k not in LEX:
        LEX[k] = (format(len(LEX) + 1, 'x'), [heb(k), heb(w.get('root')), (w.get('gloss') or '')[:90]])
    return LEX[k][0]
ST = {'emphatic': 'e', 'absolute': 'a', 'construct': 'c', 'absolute or construct': 'x'}
def mcode(w):  # Wortart.Stamm.Status.Numerus.Genus (- = nicht angegeben)
    return '.'.join([w.get('sp') or '-', w.get('vs') or '-', ST.get(w.get('st'), '-'), w.get('nu') or '-', w.get('gn') or '-'])
def vtext(v):
    items = []  # (Text, Trailer, Wortknoten)
    for s in v.findall('segment'):
        if s.get('type') not in INC: continue
        for w in s.iter('word'):
            items.append(((w.get('voc_utf8') or w.text or ''), (w.get('trailer') or ''), w))
    plain = fix_final(re.sub(r'\s+', ' ', ''.join(t + tr for t, tr, _ in items)))
    # Wörter mit Morphologie umhüllen; die Länge bleibt beim Bereinigen gleich (nur Zeichen werden ersetzt), Leerraum zählt einzeln
    raw = ''.join(t + tr for t, tr, _ in items)
    if len(plain) != len(raw):  # Leerraum wurde zusammengefasst: ohne Spans zurückfallen
        return plain.strip()
    out = []; pos = 0
    for t, tr, w in items:
        wt = plain[pos:pos + len(t)]; pos += len(t)
        trl = plain[pos:pos + len(tr)]; pos += len(tr)
        out.append('<span class="wt" data-l="%s" data-m="%s">%s</span>%s' % (lid(w), mcode(w), wt, trl) if wt.strip() else wt + trl)
    return ''.join(out).strip()
man_p = os.path.join(proj, 'bundled', 'manifest.json')
man = json.load(open(man_p)) if os.path.exists(man_p) else {'version': 1, 'items': []}

meta = {}
for i in man['items']: meta.setdefault(i['title'], i)
man['items'] = [i for i in man['items'] if 'ETCBC Targum Corpus' not in i['versionTitle']]
for names, vt in SRC:
    for nm in names:
        f = os.path.join(repo, 'xml', '2026-09-29', nm, nm + '.xml')
        chaps = {}; book = None
        cur_ch = None; book = None
        for ev, el in ET.iterparse(f, events=('start', 'end')):
            if ev == 'start':
                if el.tag == 'book': book = el.get('book')
                elif el.tag == 'chapter': cur_ch = int(el.get('chapter'))
            elif el.tag == 'verse':
                v = el.get('verse')
                if re.fullmatch(r'\d+', v or ''): chaps.setdefault(cur_ch, {})[int(v)] = vtext(el)
                el.clear()
        nch = max(chaps); arr = []
        for c in range(1, nch + 1):
            vs = chaps.get(c, {}); n = max(vs) if vs else 0
            arr.append([vs.get(x, '') for x in range(1, n + 1)])
        he = meta.get(book, {})
        data = {'title': book, 'heTitle': he.get('heTitle', book), 'language': 'Aramaic', 'versionTitle': vt,
                'versionSource': 'https://github.com/ETCBC/targum (MIT-Lizenz, alpha); ETCBC Targum Corpus 0.0.1-alpha',
                'sectionNames': ['Chapter', 'Verse'], 'text': arr}
        rel = 'own/%s/other/%s.json' % (book, vt)
        p = os.path.join(proj, 'bundled', rel); os.makedirs(os.path.dirname(p), exist_ok=True)
        raw = json.dumps(data, ensure_ascii=False); open(p, 'w', encoding='utf8').write(raw)
        man['items'].append({'rel': rel, 'title': book, 'heTitle': data['heTitle'], 'language': 'Aramaic', 'versionTitle': vt,
                             'categories': he.get('categories', ['Tanakh', 'Torah', book]), 'kind': 'other', 'hash': hashlib.sha1(raw.encode()).hexdigest()})
        print(vt[:22], book, 'Kapitel', nch, 'Verse mit Text', sum(1 for r in arr for x in r if x))
json.dump(man, open(man_p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
lex_js = 'window.TARGUM_LEX=' + json.dumps({v[0]: v[1] for v in LEX.values()}, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(proj, 'targum-lex.js'), 'w', encoding='utf8').write('// ETCBC Targum Corpus (MIT, alpha), https://github.com/ETCBC/targum: Lexeme, Wurzeln, Bedeutungen\n' + lex_js)
print('Lexikon', len(LEX))
