#!/usr/bin/env python3
# Wandelt die EPUBs von Dennis Prager, „The Rational Bible“ (Genesis, Exodus, Deuteronomy), in Safran-Texte um (nur für den eigenen Gebrauch).
# Kapitel > Vers: je Vers steht der Bibelvers fett, darunter Pragers Kommentar; Endnoten werden zu Safran-Fußnoten.
# Aufruf: python3 build.py <Ordner mit den entpackten EPUBs> <Safran-Projekt> <Ausgabeordner>
import sys, os, re, json, glob, hashlib, html
from html.parser import HTMLParser
import xml.etree.ElementTree as ET

src, proj, out = sys.argv[1:4]
VERSION = 'Dennis Prager, The Rational Bible (Regnery)'
BOOKS = {  # Ordnername-Anfang -> (Sefaria-Buch, Kapitelzahl)
    'Genesis': ('Genesis', 50), 'Exodus': ('Exodus', 40), 'Deuteronomy': ('Deuteronomy', 34),
}

man = json.load(open(os.path.join(proj, 'bundled', 'manifest.json'), encoding='utf8'))
meta = {}
for it in man['items']:
    if it['kind'] == 'he' and 'Westminster' in it['versionTitle']: meta[it['title']] = it['heTitle']

SUP = str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹', '0123456789')
SUPRE = re.compile('[⁰¹²³⁴⁵⁶⁷⁸⁹]+')

def css_flags(css):
    """Klassenname -> {'i','b','sup','blk'} aus einem Stylesheet."""
    fl = {}
    for m in re.finditer(r'\.([\w-]+)\s*\{([^}]*)\}', css):
        c, b = m.groups(); f = set()
        if re.search(r'font-style:\s*italic', b): f.add('i')
        if re.search(r'font-weight:\s*(bold|[6-9]00)', b): f.add('b')
        if re.search(r'vertical-align:\s*super', b): f.add('sup')
        if re.search(r'display:\s*block', b): f.add('blk')
        if re.search(r'font-size:\s*1\.[2-9]', b): f.add('big')
        fl.setdefault(c, set()).update(f)
    return fl

BLOCK = {'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'tr', 'body'}
INLINE_I = {'i', 'em'}; INLINE_B = {'b', 'strong'}

class Parser(HTMLParser):
    def __init__(self, flags):
        super().__init__(convert_charrefs=True)
        self.flags = flags; self.stack = []; self.buf = []; self.blocks = []; self.cur = None
    def classes(self, attrs):
        f = set()
        for k, v in attrs:
            if k == 'class' and v:
                for c in v.split(): f |= self.flags.get(c, set())
            if k == 'style' and v:
                if 'italic' in v: f.add('i')
                if re.search(r'bold', v): f.add('b')
        return f
    def state(self):
        s = set()
        for t, f, _ in self.stack: s |= f
        return s
    def flush(self):
        if self.cur is not None and any(x[0].strip() for x in self.buf):
            self.blocks.append({'tag': self.cur[0], 'flags': self.cur[1], 'chunks': self.buf})
        self.buf = []
    def handle_starttag(self, tag, attrs):
        f = self.classes(attrs)
        if tag in INLINE_I: f.add('i')
        if tag in INLINE_B: f.add('b')
        if tag == 'sup': f.add('sup')
        if tag in ('style', 'script', 'title', 'head'): self.skip = tag
        if tag == 'br': return
        if tag in BLOCK:
            self.flush(); self.cur = (tag, f)
        self.stack.append((tag, f, tag in BLOCK))
    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                blk = self.stack[i][2]; del self.stack[i:]
                if blk: self.flush(); self.cur = None
                break
    def handle_data(self, d):
        if getattr(self, 'skip', None):
            if self.stack and self.stack[-1][0] == self.skip: pass
        if any(t in ('style', 'script', 'title', 'head') for t, _, _ in self.stack): return
        if self.cur is None: self.cur = ('p', set())
        st = self.state()
        # Block-Ebene: Formatierung des umgebenden Blocks
        self.buf.append((d, st))

def block_text(b, own):
    """Block -> (Klartext, HTML); Fußnotenzeichen als n."""
    blkflags = b['flags']
    plain = []; parts = []
    for d, st in b['chunks']:
        d = d.replace('\xa0', ' ')
        d = SUPRE.sub(lambda m: '' + m.group(0).translate(SUP) + '', d)
        t = html.escape(d, quote=False)
        if 'sup' in st and re.fullmatch(r'\s*\d{1,3}\s*', d):
            parts.append('' + d.strip() + ''); plain.append('' + d.strip() + ''); continue
        plain.append(d)
        if 'i' in st and 'i' not in blkflags and t.strip(): t = '<i>' + t + '</i>'
        if 'b' in st and 'b' not in blkflags and t.strip() and 'big' not in blkflags: t = '<b>' + t + '</b>'
        parts.append(t)
    p = re.sub(r'\s+', ' ', ''.join(plain)).strip()
    h = re.sub(r'\s+', ' ', ''.join(parts)).strip()
    h = re.sub(r'</i>(\s*)<i>', r'\1', h); h = re.sub(r'</b>(\s*)<b>', r'\1', h)
    return p, h

def spine(d):
    c = open(os.path.join(d, 'META-INF', 'container.xml')).read()
    opf = re.search(r'full-path="([^"]*)"', c).group(1)
    base = os.path.dirname(opf)
    t = ET.parse(os.path.join(d, opf)); ns = {'o': 'http://www.idpf.org/2007/opf'}
    man_ = {i.get('id'): i.get('href') for i in t.findall('.//o:item', ns)}
    css = ''
    for i in t.findall('.//o:item', ns):
        if i.get('media-type') == 'text/css':
            try: css += open(os.path.join(d, base, i.get('href')), encoding='utf8', errors='replace').read() + '\n'
            except OSError: pass
    return [os.path.join(d, base, man_[i.get('idref')]) for i in t.findall('.//o:itemref', ns)], css

def norm(s): return re.sub(r'[^A-Za-z]', '', s).upper()
VERSE = re.compile(r'^(\d{1,3})\.(\d{1,3})(?:\s*[–-]\s*(\d{1,3}))?(\s*\(cont\.\))?\s+(?!(?:million|billion|percent|times|years|days)\b)')
SKIP_FIRST = {'COVER', 'CONTENTS', 'TITLEPAGE', 'COPYRIGHT', 'ABOUTTHEAUTHOR', 'ALSOBYDENNISPRAGER', 'DEDICATION'}
SECTIONS = {'INTRODUCTION': 'Introduction', 'PREFACE': 'Preface', 'THESTORYTHUSFAR': 'The Story Thus Far', 'ACKNOWLEDGMENTS': 'Acknowledgments'}

def convert(d, title, nch):
    files, css = spine(d)
    flags = css_flags(css)
    blocks = []  # (file index, block)
    for fi, f in enumerate(files):
        s = open(f, encoding='utf8', errors='replace').read()
        s = re.sub(r'<head>.*?</head>', '', s, flags=re.S)
        p = Parser(flags); p.feed(s); p.flush()
        bs = p.blocks
        # Seiten, die nicht zum Text gehören
        first = next((norm(block_text(b, 0)[0]) for b in bs if block_text(b, 0)[0].strip()), '')
        if first in SKIP_FIRST or first.startswith('COPYRIGHT') or first.startswith('TITLE'): continue
        for b in bs: blocks.append((fi, b))
    front = {}; fkey = 'Introduction'; chapters = {}; notes = {}
    cur = None; mode = 'front'; lastv = 0; pending = []; ncur = None; nnum = None
    skip_num = False
    unmatched = 0
    i = 0
    def seg(c, v):
        return chapters.setdefault(c, {}).setdefault(v, [])
    while i < len(blocks):
        fi, b = blocks[i]; i += 1
        plain, h = block_text(b, 0)
        if not plain.strip(): continue
        n = norm(plain)
        if mode != 'notes' and n == 'NOTES' and cur is not None and cur >= nch - 1:
            mode = 'notes'; continue
        if mode == 'notes':
            if n in ('ABOUTTHEAUTHOR',) or n.startswith('COPYRIGHT'): mode = 'end'; continue
            m = re.fullmatch(r'Chapter\s+(\d+)', plain.strip(), re.I)
            if m: ncur = int(m.group(1)); nnum = None; continue
            m = re.match(r'^(\d{1,3})\s*\.\s*(.*)$', plain)
            h2 = re.sub(r'^\s*?\d{1,3}?\s*\.?\s*', '', h)
            if m and ncur is not None:
                nnum = int(m.group(1)); notes.setdefault(ncur, {})[nnum] = [re.sub(r'^\d{1,3}\s*\.\s*', '', h).strip()]
                continue
            if re.fullmatch(r'?(\d{1,3})?', plain.strip()) and ncur is not None:  # Deuteronomium: Nummer allein, Text im nächsten Block
                nnum = int(re.sub(r'\D', '', plain)); notes.setdefault(ncur, {})[nnum] = []; skip_num = True; continue
            if ncur is not None and nnum is not None:
                t = re.sub(r'^\.\s*', '', h) if skip_num else h
                skip_num = False
                notes[ncur][nnum].append(t)
            continue
        if mode == 'end': continue
        # Kapitelanfang: „CHAPTER“, dann die Nummer
        if n == 'CHAPTER' and i < len(blocks):
            m = re.search(r'\d+', blocks[i][1]['chunks'] and ''.join(c[0] for c in blocks[i][1]['chunks']))
            if m: cur = int(m.group(0)); lastv = 0; i += 1; mode = 'body'; continue
        m = re.fullmatch(r'Chapter\s+(\d+)', plain.strip(), re.I)
        if m and mode in ('front', 'body'):
            cur = int(m.group(1)); lastv = 0; mode = 'body'; continue
        if mode == 'front':
            if n in SECTIONS: fkey = SECTIONS[n]; front.setdefault(fkey, []); continue
            isHead = b['tag'] in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6') or ('b' in b['flags'] and len(plain) < 120) or ('big' in b['flags'] and len(plain) < 160)
            front.setdefault(fkey, []).append(('<big><b>' + re.sub(r'<[^>]+>', '', h) + '</b></big>') if isHead else h)
            continue
        vm = VERSE.match(plain)
        if vm and cur is not None and int(vm.group(1)) == cur:
            v = int(vm.group(2)); cont = bool(vm.group(4)); v2 = vm.group(3)
            if cont or v >= lastv or v == 1:
                lastv = max(lastv, v)
                body = re.sub(r'^\s*\d{1,3}\.\d{1,3}(?:\s*[–-]\s*\d{1,3})?', '', re.sub(r'</?[bi]>', '', h), count=1).strip()
                if cont: body = re.sub(r'^\(cont\.\)\s*', '', body); body = '(' + ('Forts.' if False else 'cont.') + ') ' + body
                elif v2: body = '(' + str(v) + '–' + v2 + ') ' + body
                parts = seg(cur, v)
                parts[:0] = []
                for p_ in pending: parts.append(p_)
                pending = []
                parts.append('<b>' + body + '</b>')
                continue
        isHead = b['tag'] in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6') or ('b' in b['flags'] and 'blk' in b['flags'] and len(plain) < 200) or ('big' in b['flags'] and len(plain) < 200)
        if isHead:
            pending.append('<big><b>' + re.sub(r'<[^>]+>', '', h) + '</b></big>'); continue
        if cur is None: continue
        if lastv and chapters.get(cur) and lastv in chapters[cur]:
            chapters[cur][lastv].append(h)
        else:
            pending.append(h)
    # Reste vor dem ersten Vers eines Kapitels (zusammen mit Überschriften) stehen schon in pending → ans Kapitelende hängen
    # Fußnoten
    def fn(c, text):
        def rep(m):
            k = int(m.group(1)); nt = notes.get(c, {}).get(k)
            if nt: return '<sup class="footnote-marker">%d</sup><i class="footnote">%s</i>' % (k, ' '.join(nt).replace('', '').replace('', ''))
            return '<sup>%d</sup>' % k
        return re.sub('(\\d{1,3})', rep, text)
    text = {}
    for k, v in front.items():
        text[k] = [fn(0, x) for x in v if x.strip()]
    chs = []
    stats = []
    for c in range(1, nch + 1):
        vs = chapters.get(c, {})
        mx = max(vs) if vs else 0
        row = [fn(c, '<br><br>'.join(vs[v])) if v in vs else '' for v in range(1, mx + 1)]
        chs.append(row); stats.append((c, mx, sum(1 for x in row if x)))
    text[''] = chs
    return text, stats, unmatched

os.makedirs(out, exist_ok=True)
newitems = []
for name in sorted(os.listdir(src)):
    d = os.path.join(src, name)
    if not os.path.isdir(d): continue
    cont = open(os.path.join(d, 'META-INF', 'container.xml')).read() if os.path.exists(os.path.join(d, 'META-INF', 'container.xml')) else None
    if cont is None: continue
    sp, _ = spine(d)
    opf = re.search(r'full-path="([^"]*)"', cont).group(1)
    head = ' '.join(re.findall(r'<dc:title[^>]*>(.*?)</dc:title>', open(os.path.join(d, opf), encoding='utf8', errors='replace').read(), re.S)) + ' ' + name
    book = next((b for k, b in BOOKS.items() if k in head or k.lower() in name.lower()), None)
    if not book:
        for f in sp[:4]:
            tx = ' '.join(re.sub(r'<[^>]+>', ' ', open(f, encoding='utf8', errors='replace').read()).split())[:400]
            book = next((b for k, b in BOOKS.items() if k in tx), None)
            if book: break
    if not book:
        # Deuteronomium-EPUB trägt den Titel im Dateinamen
        book = BOOKS['Deuteronomy'] if 'Deuteronomy' in name or 'rational_bible__D' in name else None
    if not book: print('Unbekanntes Buch:', name); continue
    sef, nch = book
    text, stats, un = convert(d, sef, nch)
    t = 'Rational Bible on ' + sef
    j = {'title': t, 'heTitle': 'המקרא ההגיוני על ' + meta.get(sef, ''), 'language': 'English', 'versionTitle': VERSION,
         'versionSource': 'Dennis Prager, The Rational Bible, Regnery Faith (eigenes EPUB, nur privat)', 'sectionNames': ['Chapter', 'Verse'], 'text': text}
    path = os.path.join(out, 'own', t, 'en'); os.makedirs(path, exist_ok=True)
    fp = os.path.join(path, VERSION + '.json')
    json.dump(j, open(fp, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    h = hashlib.sha1(open(fp, 'rb').read()).hexdigest()
    newitems.append({'rel': 'own/%s/en/%s.json' % (t, VERSION), 'title': t, 'heTitle': j['heTitle'], 'language': 'English', 'versionTitle': VERSION,
                     'categories': ['Tanakh', 'Commentary', 'Dennis Prager'], 'kind': 'en', 'hash': h})
    print(sef, 'Kapitel', len(stats), 'Verse mit Text', sum(s[2] for s in stats), 'Front:', {k: len(v) for k, v in text.items() if k}, 'Fußnoten:', len(re.findall('footnote-marker', json.dumps(text))))
    print(' ohne Verse:', [s[0] for s in stats if s[2] == 0])
json.dump(newitems, open(os.path.join(out, 'new-items.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
