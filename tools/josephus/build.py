# Josephus-Verknüpfungen aus Nieses Parallelstellen-Verzeichnis (niese_parallelen.txt) bauen.
# Quelle: Antiquitates (Bücher I–XX), Vita, Bellum (I–II) nach Nieses §-Zählung; Ziele: Bibel (Vulgata-Namen),
# Makkabäer, Ant./Bell. (Niese), Vita (nicht bei Sefaria, ausgelassen), Aristeas/Philo/Herodot (ausgelassen).
# Nieses § werden über niese_whiston.json (aus den Perseus-Texten, siehe niese_whiston.py) auf Whistons
# Buch:Kapitel:Abschnitt abgebildet, nach denen Sefaria die Texte gliedert.
# Ausgabe: Zeilen in bundled/links/<Buch>.tsv (beide Richtungen), vorhandene Zeilen bleiben.
# Aufruf: python3 tools/josephus/build.py
import json, re, os, sys, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
D = json.load(open(os.path.join(HERE, 'niese_whiston.json')))
NIESE, SHAPE = D['niese'], D['shape']
TAN = json.load(open(os.path.join(ROOT, 'tools', 'ownlinks', 'tanakh_shape.json')))
# mitgelieferte Apokryphen (Kautzsch) als Ziel
for _e in json.load(open(os.path.join(ROOT, 'bundled', 'manifest.json')))['items']:
    if _e['title'] == 'Das dritte Buch Esra':
        SHAPE['Das dritte Buch Esra'] = [len(c) for c in json.load(open(os.path.join(ROOT, 'bundled', _e['rel'])))['text']]
ANT, BELL = 'The Antiquities of the Jews', 'The War of the Jews'

def roman(r):
    v = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100}; n = 0
    for i, ch in enumerate(r):
        a = v[ch]; b = v.get(r[i + 1], 0) if i + 1 < len(r) else 0
        n += -a if a < b else a
    return n

BIB = {  # Vulgata-Namen -> Sefaria
    'gen': 'Genesis', 'exod': 'Exodus', 'exodus': 'Exodus', 'leuit': 'Leviticus', 'leuitic': 'Leviticus', 'num': 'Numbers',
    'deut': 'Deuteronomy', 'deuteron': 'Deuteronomy', 'iosua': 'Joshua', 'iudic': 'Judges', 'indic': 'Judges', 'ruth': 'Ruth',
    '1 reg': 'I Samuel', '1 regum': 'I Samuel', '2 reg': 'II Samuel', '3 reg': 'I Kings', '4 reg': 'II Kings',
    '1 paral': 'I Chronicles', '2 paral': 'II Chronicles',
    # Niese zählt Esra wie die Septuaginta: 1. Esra = Esdras A (griechisches Esra, bei Luther/Kautzsch „3. Esra“), 2. Esra = Esdras B (Esra 1–10, Nehemia = Kap. 11–23)
    '1 esra': 'Das dritte Buch Esra', 'l esra': 'Das dritte Buch Esra', 'esra': 'Ezra', '2 esra': 'Ezra',
    'neemia': 'Nehemiah', 'neem': 'Nehemiah', 'esther': 'Esther', 'iesaias': 'Isaiah', 'ierem': 'Jeremiah', 'jerem': 'Jeremiah',
    'ieremia': 'Jeremiah', 'ieremias': 'Jeremiah', 'ezech': 'Ezekiel', 'daniel': 'Daniel', 'ionas': 'Jonah', 'nahum': 'Nahum',
    'zachar': 'Zechariah', 'maccab': 'The Book of Maccabees I', 'macc': 'The Book of Maccabees I', '1 maccab': 'The Book of Maccabees I',
    'l maccab': 'The Book of Maccabees I', '1 macc': 'The Book of Maccabees I', '2 maccab': 'The Book of Maccabees II', '2 macc': 'The Book of Maccabees II',
    'sap sal': 'The Wisdom of Solomon',
}

def chap_ok(book, c, v):
    sh = TAN.get(book) or SHAPE.get(book)
    return bool(sh) and 1 <= c <= len(sh) and 1 <= v <= sh[c - 1]

def whiston(work, book, sec):
    """Niese-§ -> Sefaria-Stelle"""
    title = ANT if work == 'ant' else BELL
    m = NIESE[work].get(f'{book}.{sec}')
    if not m: return None
    c, s = m
    st = SHAPE[title]
    if c in (None, 'pr.'):
        if book == 1: return f'{title}, Preface {min(int(s or 1), st["preface"])}'
        c, s = '1', '1'
    c, s = int(c), int(s or 1)
    bk = st['books'][book - 1]
    if c > len(bk): c, s = len(bk), bk[-1]
    s = min(s, bk[c - 1])
    return f'{title} {book}:{c}:{s}'

SRC_RE = re.compile(r'^§{0,2}\s*(\d+)(?:[–\-,. ]+\d+)*(?:\s*sq\.?)?\s*(?:=|cf\.)?\s*(.*)$')
TGT_RE = re.compile(r'(?:(\d|l)\.?\s*)?([A-Za-z][A-Za-z]*(?:\.\s?|\s)(?:(?:Iud|euang|Sal|Moys|Iosephi)\.?\s?)?)?\s*([IVXLC]+)(?:\s+|:)(?:§\s*)?([\dI]+)')
def targets(txt):
    out = []; last = None
    txt = re.sub(r'\bcf\.\s*', '', txt)
    for part in re.split(r'[;,]|\bet\b', txt):
        m = TGT_RE.search(part)
        if not m: continue
        num, name, rom, ar = m.group(1), (m.group(2) or '').strip(), m.group(3), m.group(4).replace('I', '1')
        if name:
            key = re.sub(r'[.\s]+', ' ', ((num + ' ') if num else '') + name).strip().lower()
            last = key
        elif last: key = last
        else: continue
        out.append((key, roman(rom), int(ar)))
    return out

def resolve(key, c, v):
    k = key.replace('.', '')
    if re.match(r'^(ant|antiq)\s*iud', k): return whiston('ant', c, v)
    if re.match(r'^(bell|bellum)\s*iud', k) or k.startswith('belliud'): return whiston('bell', c, v)
    b = BIB.get(re.sub(r'\s+', ' ', k).strip())
    if b == 'Ezra' and c > 10: b, c = 'Nehemiah', c - 10
    if b and chap_ok(b, c, v): return f'{b} {c}:{v}'
    return None

links = []; skipped = collections.Counter(); work = 'ant'; book = None
for raw in open(os.path.join(HERE, 'niese_parallelen.txt'), encoding='utf-8'):
    l = raw.strip()
    if not l: continue
    if l == 'IOSEPHI VITA': work = 'vita'; continue
    if l == 'DE BELLO IUDAICO': work = 'bell'; continue
    if re.fullmatch(r'[IVXL]+', l): book = roman(l); continue
    m = SRC_RE.match(l)
    if not m or work == 'vita': skipped['Quelle'] += 1; continue
    src = whiston(work, book, int(m.group(1)))
    if not src: skipped['Quelle ohne Zuordnung'] += 1; continue
    ts = targets(m.group(2))
    if not ts: skipped['Ziel unbekannt: ' + m.group(2)[:25]] += 1
    for key, c, v in ts:
        t = resolve(key, c, v)
        if t and t != src: links.append((src, t))
        elif not t: skipped['Ziel: ' + key] += 1

def split(ref):
    m = re.match(r'^(.*?)\s+(\d+(?::\d+)*)$', ref); return (m.group(1), m.group(2))
def cat(book):
    if book in TAN: return 'Tanakh'
    return 'Second Temple'
safe = lambda s: re.sub(r'[\\:*?"<>|\x00-\x1f/]', '_', s).rstrip('. ')[:150]
per = collections.defaultdict(list)
for a, b in sorted(set(links)):
    ba, ta = split(a); bb, tb = split(b)
    per[ba].append(f'{ta}\t{b}\treference\t{cat(bb)}')
    per[bb].append(f'{tb}\t{a}\treference\t{cat(ba)}')
d = os.path.join(ROOT, 'bundled', 'links'); n = 0
for book, lines in per.items():
    p = os.path.join(d, safe(book) + '.tsv')
    have = open(p, encoding='utf-8').read().split('\n') if os.path.exists(p) else []
    have = [x for x in have if x]; seen = set(have)
    neu = [x for x in dict.fromkeys(lines) if x not in seen]
    if neu:
        open(p, 'w', encoding='utf-8').write('\n'.join(have + neu) + '\n'); n += len(neu)
print(f'Verknüpfungen {len(set(links))}, neue Zeilen {n} in {len(per)} Dateien')
for k, v in skipped.most_common(25): print(f'  übersprungen {v}\t{k}')
