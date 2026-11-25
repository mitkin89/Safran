#!/usr/bin/env python3
"""Althebräische Inschriften aus ETCBC/extrabiblical (Fassung 0.2, CC BY-NC 4.0) als eigene Bücher für Safran.
Je Inschrift ein Buch (Mescha-Stele, Siloah-Inschrift, Lachisch-Briefe, Arad-Ostraka, Ketef-Hinnom-Amulette, Deir Alla/Bileam,
Kuntillet Adschrud, Mesad Haschavjahu); Abschnitt = Stück (Ostrakon, Brief, Amulett), Unterabschnitt = Zeile (Mescha) bzw. Satz.
Jedes Wort mit Lemma ist <span class="wq" data-l="Lemma" data-m="Wortart.Stamm.Zeit.Person.Genus.Numerus.Status[.Suffix]">
wie bei den Qumran-Rollen (Klick: Wortanzeige). Dazu Verknüpfungen zu den Bibelstellen, auf die sich die Inschriften beziehen.
Aufruf: python3 -I tools/inscriptions/build.py <extrabiblical-Ordner (Repo ETCBC/extrabiblical)> [Projektordner]"""
import sys, os, re, json, hashlib, html
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'phono'))
from tfload import load, oslots

src = sys.argv[1]
proj = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
T = os.path.join(src, 'tf', '0.2') + '/'
VT = 'Inschriften (ETCBC extrabiblical)'
SRC = 'https://github.com/ETCBC/extrabiblical (CC BY-NC 4.0); ETCBC, Constantijn Sikkel (MQL), Martijn Naaijer und Dirk Roorda (Text-Fabric)'
CATS = ['Ancient Inscriptions']
# ETCBC-Name -> (Titel, hebräischer Titel, Name eines Stücks, Unterabschnitt, Bibelstellen [(Stück, Ref)])
BOOKS = {
    'Mesa': ('Mesha Stele', 'מצבת מישע', None, 'Line', [(1, 'II Kings 1:1'), (1, 'II Kings 3:4'), (1, 'II Kings 3:5')]),
    'Siloam': ('Siloam Inscription', 'כתובת השילוח', None, 'Sentence', [(1, 'II Kings 20:20'), (1, 'II Chronicles 32:30'), (1, 'Isaiah 22:11')]),
    'Lachish': ('Lachish Letters', 'מכתבי לכיש', 'Brief', 'Sentence', [(4, 'Jeremiah 34:7')]),
    'Arad': ('Arad Ostraca', 'אוסטרקוני ערד', 'Ostrakon', 'Sentence', []),
    'Ketef_Hinnom': ('Ketef Hinnom Amulets', 'קמעות כתף הינום', 'Amulett', 'Sentence', [(1, 'Numbers 6:24'), (1, 'Numbers 6:25'), (1, 'Numbers 6:26'), (2, 'Numbers 6:24'), (2, 'Numbers 6:25'), (2, 'Numbers 6:26')]),
    'Balaam': ('Deir Alla Inscription', 'כתובת דיר עלא (בלעם)', 'Kombination', 'Sentence', [(1, 'Numbers 22:5'), (1, 'Numbers 24:3')]),
    'Ajrud': ('Kuntillet Ajrud Inscriptions', 'כתובות כונתילת עג׳רוד', 'Inschrift', 'Sentence', []),
    'Mesad_Hashavyahu': ('Mesad Hashavyahu Ostracon', 'אוסטרקון מצד חשביהו', None, 'Sentence', [(1, 'Exodus 22:25'), (1, 'Deuteronomy 24:12'), (1, 'Deuteronomy 24:13')]),
}
LINKTYPE, LINKCAT = 'Inschrift', 'Ancient Inscriptions'

ot = load(T + 'otype.tf')
rng = {}
for k, v in ot.items(): rng.setdefault(v, [k, k]); rng[v][1] = max(rng[v][1], k)
OS = oslots(T + 'oslots.tf', rng['word'][1] + 1)
book, chap = load(T + 'book.tf'), load(T + 'chapter.tf')
F = {f: load(T + f + '.tf') for f in ('g_word_utf8', 'g_suffix_utf8', 'lex_utf8', 'sp', 'vs', 'vt', 'ps', 'gn', 'nu', 'st', 'prs_ps', 'prs_gn', 'prs_nu')}
nodes = lambda t: range(rng[t][0], rng[t][1] + 1)

ND = {'', 'NA', 'unknown', 'absent', 'n/a'}
NU = {'sg': 's', 'pl': 'p', 'du': 'd'}
VT_ = {'wayq': 'wayy', 'impv': 'impv', 'infc': 'infc', 'infa': 'infa', 'ptca': 'ptca', 'ptcp': 'ptcp', 'perf': 'perf', 'impf': 'impf'}
def val(f, w):
    x = F[f].get(w, '')
    return '-' if x in ND else x
def tcode(w):
    ps = val('ps', w).lstrip('p') or '-'
    sx = ''
    if val('prs_ps', w) != '-':  # Pronominalsuffix: p3 m sg -> 3ms
        sx = val('prs_ps', w).lstrip('p') + (val('prs_gn', w) if val('prs_gn', w) != '-' else '') + NU.get(val('prs_nu', w), '')
    st = val('st', w); st = {'e': 'd'}.get(st, st)
    vt = val('vt', w); vt = VT_.get(vt, vt)
    parts = [val('sp', w), val('vs', w), vt, ps, val('gn', w), NU.get(val('nu', w), val('nu', w)), st]
    return '.'.join(parts + ([sx] if sx else []))

def lemma(w): return re.sub(r'[^א-ת]', '', F['lex_utf8'].get(w, ''))
def words_html(a, e):
    out = ''
    for w in range(a, e + 1):
        t = html.escape(F['g_word_utf8'].get(w, ''), quote=False)
        if t:
            lem, sp = lemma(w), val('sp', w)
            out += '<span class="wq" data-l="%s" data-m="%s">%s</span>' % (lem, tcode(w), t) if lem and sp != '-' else t
        out += F['g_suffix_utf8'].get(w, '')
    return re.sub(r'\s+', ' ', out).strip()

man_p = os.path.join(proj, 'bundled', 'manifest.json')
man = json.load(open(man_p, encoding='utf8'))
man['items'] = [it for it in man['items'] if it['versionTitle'] != VT]
LD = os.path.join(proj, 'bundled', 'links')
links = {}  # Datei -> Zeilen
for bn in nodes('book'):
    key = book.get(bn)
    if key not in BOOKS: continue
    title, he, piece, sub, refs = BOOKS[key]
    a0, e0 = OS[bn]
    chs = sorted((OS[c][0], c) for c in nodes('chapter') if a0 <= OS[c][0] <= e0)
    secs, items = [], []
    for _, c in chs:
        a, e = OS[c]
        units = [OS[v] for v in nodes('verse') if a <= OS[v][0] <= e] if sub == 'Line' else [OS[s] for s in nodes('sentence') if a <= OS[s][0] <= e]
        units.sort()
        lines = [words_html(x, y) for x, y in units] or [words_html(a, e)]
        if piece:
            lab = '%s %s' % (piece, chap.get(c, len(secs) + 1))
            lines[0] = '<b>%s</b> %s' % (lab, lines[0])
            items.append({'ref': '%d:1' % (len(secs) + 1), 'text': lab})
        secs.append(lines)
    names = ['Inscription', sub] if not piece else ['Piece', sub]
    d = {'title': title, 'heTitle': he, 'language': 'Hebrew', 'versionTitle': VT, 'versionSource': SRC, 'sectionNames': names, 'text': secs}
    rel = 'own/%s/he/%s.json' % (title, VT)
    p = os.path.join(proj, 'bundled', rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    raw = json.dumps(d, ensure_ascii=False, separators=(',', ':')); open(p, 'w', encoding='utf8').write(raw)
    man['items'].append({'rel': rel, 'title': title, 'heTitle': he, 'language': 'Hebrew', 'versionTitle': VT, 'categories': CATS, 'kind': 'he', 'hash': hashlib.sha1(raw.encode()).hexdigest()})
    if items and len(items) > 1:
        json.dump({'book': title, 'title': title, 'note': 'Gliederung nach den Stücken der Inschrift.', 'sections': [{'head': title, 'items': items}]},
                  open(os.path.join(proj, 'outlines', title + '.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    # Verknüpfungen: Stück n der Inschrift <-> Bibelstelle (beide Richtungen)
    for n, ref in refs:
        if n > len(secs): continue
        bk, cv = ref.rsplit(' ', 1)
        links.setdefault(title, []).append('%d:1\t%s\t%s\t%s' % (n, ref, LINKTYPE, LINKCAT))
        links.setdefault(bk, []).append('%s\t%s %d:1\t%s\t%s' % (cv, title, n, LINKTYPE, LINKCAT))
    print(title, len(secs), 'Stücke', sum(len(s) for s in secs), 'Zeilen/Sätze', e0 - a0 + 1, 'Wörter')
json.dump(man, open(man_p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
for name, new in links.items():
    fn = os.path.join(LD, name + '.tsv')
    old = [x for x in open(fn, encoding='utf8').read().split('\n') if x and not x.endswith('\t%s\t%s' % (LINKTYPE, LINKCAT))] if os.path.exists(fn) else []
    open(fn, 'w', encoding='utf8').write('\n'.join(old + new) + '\n')
print(sum(len(v) for v in links.values()), 'Verknüpfungszeilen')
