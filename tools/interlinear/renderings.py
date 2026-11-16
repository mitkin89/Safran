#!/usr/bin/env python3
"""Wortkarte: Wie gibt eine wortgenau zugeordnete Übersetzung (interlin.js: Zunz, Breuer, Philippson, Herxheimer) ein hebräisches Lemma wieder?
Je Vorkommen des Lemmas im Westminster-Text werden die deutschen Segmente gesammelt, die diesem Wort zugeordnet sind
(nur Segmente, deren einziges Inhaltswort dieses Wort ist; את zählt nicht als Inhaltswort). Der Text wird bereinigt
(Satzzeichen, „und“ und Artikel am Anfang weg, klein geschrieben) und nach einem einfachen Wortstamm gruppiert
(kehrt, kehrte, kehrten -> eine Gruppe).
Ausgabe: interlin-ren.js
  window.INTERLIN_REN = {Übersetzung: {Lemma: "Belege|Gruppen|Form¦Form¦Form~Anzahl~Stellen;…"}}
  Stellen: Vers-Nummern (Buch*1000000 + Kapitel*1000 + Vers) als Differenzen in Basis 36, durch „.“ getrennt; Buch = Index in BOOKS.
Aufruf: python3 -I tools/interlinear/renderings.py"""
import json, glob, re, os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
s = open(os.path.join(R, 'interlin.js'), encoding='utf8').read()
IL = json.loads(s[s.index('=') + 1:].strip().rstrip(';'))
BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'I Samuel', 'II Samuel', 'I Kings', 'II Kings', 'Isaiah', 'Jeremiah', 'Ezekiel',
         'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Psalms', 'Proverbs', 'Job', 'Song of Songs',
         'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah', 'I Chronicles', 'II Chronicles']
FUNC = {'853'}  # Akkusativzeichen
ART = {'der', 'die', 'das', 'den', 'dem', 'des'}
# für die Gruppierung ohne Bedeutung: Pronomen, Artikel, Partikeln und Präpositionen (die stehen im Hebräischen meist als Vorsilbe oder Suffix)
STOPW = set('und da so dann nun auch o ja er sie es ich du wir ihr ihn ihm ihnen mich mir dich dir uns euch sich der die das den dem des ein eine einen einem einer eines zu in im an am auf aus von vom mit nach bei beim für um über unter vor wie als zum zur gen denn daß dass'.split())
SUF = ['test', 'ten', 'tet', 'est', 'te', 'et', 'en', 'em', 'er', 'es', 'st', 'e', 'n', 's', 't']
def clean(t):
    t = re.sub(r'[„“”‚‘’"«»,.;:!?()\[\]—–\-…]|\.\.\.', ' ', t)
    t = t.replace("'", ' ')
    w = t.split()
    while w and (w[0].lower() == 'und' or w[0].lower() in ART) and len(w) > 1: w = w[1:]
    return ' '.join(w)
def stem(w):
    w = w.lower()
    for x in SUF:
        if w.endswith(x) and len(w) - len(x) >= 4: return w[:-len(x)]
    return w
def b36(n):
    d = '0123456789abcdefghijklmnopqrstuvwxyz'; o = ''
    while True:
        n, r = divmod(n, 36); o = d[r] + o
        if not n: return o
out = {}
for tr, books in IL.items():
    acc = {}  # Lemma -> Stamm -> [Anzahl, {Form: n}, [Stellen]]
    for book, verses in books.items():
        if book not in BOOKS: continue
        bi = BOOKS.index(book)
        f = glob.glob(os.path.join(R, 'bundled', 'own', book, 'he', 'Westminster*'))
        if not f: continue
        he = json.load(open(f[0], encoding='utf8'))['text']
        for k, segs in verses.items():
            c, v = map(int, k.split(':'))
            if c > len(he) or v > len(he[c - 1]): continue
            lems = [next((x.strip() for x in l.split('/') if re.search(r'\d', x)), '') for l in re.findall(r'<span class="w" data-l="([^"]*)"', he[c - 1][v - 1])]
            per = {}
            for idx, t in segs:
                content = [i for i in idx if 1 <= i <= len(lems) and lems[i - 1] and lems[i - 1] not in FUNC]
                if len(content) != 1: continue
                per.setdefault(content[0], []).append(t)
            for i, ts in per.items():
                form = clean(' '.join(ts))
                if not form: continue
                ks = [stem(w) for w in form.split() if w.lower() not in STOPW and not re.match(r'^(mein|dein|sein|unser|euer|eur|ihr)(e|en|em|er|es|m|n|s)?$', w.lower())]
                key = ' '.join(ks) or ' '.join(stem(w) for w in form.split())
                e = acc.setdefault(lems[i - 1], {}).setdefault(key, [0, {}, []])
                e[0] += 1; fl = form.lower() if not form[:1].isupper() or len(form.split()) > 1 else form
                e[1][fl] = e[1].get(fl, 0) + 1
                e[2].append(bi * 1000000 + c * 1000 + v)
    res = {}
    for lem, groups in acc.items():
        gs = sorted(groups.values(), key=lambda g: -g[0]); tot = sum(g[0] for g in gs)
        parts = []
        for g in gs[:40]:
            forms = '¦'.join(sorted(g[1], key=lambda x: -g[1][x])[:4]).replace('~', ' ').replace(';', ' ').replace('|', ' ')
            refs = sorted(set(g[2])); prev = 0; enc = []
            for r in refs[:400]: enc.append(b36(r - prev)); prev = r
            parts.append('%s~%d~%s' % (forms, g[0], '.'.join(enc)))
        res[lem] = '%d|%d|%s' % (tot, len(gs), ';'.join(parts))
    out[tr] = res
p = os.path.join(R, 'interlin-ren.js')
open(p, 'w', encoding='utf8').write('// Wortkarte: Wiedergabe hebräischer Lemmata in den wortgenau zugeordneten Übersetzungen (interlin.js) – erzeugt von tools/interlinear/renderings.py\n'
                                    '// Format: {Übersetzung: {Lemma: "Belege|Gruppen|Form¦Form~Anzahl~Stellen;…"}}; Stellen: Buch*1000000+Kapitel*1000+Vers als Differenzen (Basis 36)\n'
                                    'window.INTERLIN_REN=' + json.dumps({'books': BOOKS, 'tr': out}, ensure_ascii=False, separators=(',', ':')) + ';\n')
print({k: len(v) for k, v in out.items()}, os.path.getsize(p), 'Bytes')
