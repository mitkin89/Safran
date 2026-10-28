#!/usr/bin/env python3
"""Private converter: Robert Alter, The Hebrew Bible (EPUB, 3 vols or merged) ->
Safran own commentaries "Alter on <Book>" (verse-level footnotes).
Usage: python3 -I alter.py <unpacked-epub-dir> <safran-project-dir>
Output goes to bundled/own/Alter on */en/*.json and bundled/manifest.private.json (private, gitignored)."""
import re, sys, os, json, glob, hashlib
src, proj = sys.argv[1], sys.argv[2]
VERSION = 'Robert Alter, The Hebrew Bible (Norton)'
HEAD = {'Genesis':'Genesis','Exodus':'Exodus','Leviticus':'Leviticus','Numbers':'Numbers','Deuteronomy':'Deuteronomy',
 'Joshua':'Joshua','Judges':'Judges','1 Samuel':'I Samuel','2 Samuel':'II Samuel','1 Kings':'I Kings','2 Kings':'II Kings',
 'Isaiah':'Isaiah','Jeremiah':'Jeremiah','Ezekiel':'Ezekiel','Hosea':'Hosea','Joel':'Joel','Amos':'Amos','Obadiah':'Obadiah',
 'Jonah':'Jonah','Micah':'Micah','Nahum':'Nahum','Habakkuk':'Habakkuk','Zephaniah':'Zephaniah','Haggai':'Haggai',
 'Zechariah':'Zechariah','Malachi':'Malachi','Psalms':'Psalms','Proverbs':'Proverbs','Job':'Job','The Song of Songs':'Song of Songs',
 'Ruth':'Ruth','Lamentations':'Lamentations','Qohelet (Ecclesiastes)':'Ecclesiastes','Esther':'Esther','Daniel':'Daniel',
 'Ezra':'Ezra','Nehemiah':'Nehemiah','1 Chronicles':'I Chronicles','2 Chronicles':'II Chronicles'}
HE = {}
try:
    _m = json.load(open(os.path.join(proj, 'bundled', 'manifest.json')))
    for _i in (_m['items'] if isinstance(_m, dict) else _m): HE.setdefault(_i['title'], _i['heTitle'])
except Exception: pass
def txt(h): return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', h)).strip()
def clean(h):
    h = re.sub(r'<a [^>]*>\s*<i[^>]*>(.*?)</i>\s*</a>', lambda m: '<b>%s</b>' % txt(m.group(1)), h, count=1, flags=re.S) if False else h
    h = re.sub(r'<a [^>]*>(.*?)</a>', r'\1', h, flags=re.S)
    h = re.sub(r'<(/?)i\b[^>]*>', r'<\1i>', h)
    h = re.sub(r'<(/?)(b|em|strong|sup|sub|u)\b[^>]*>', r'<\1\2>', h)
    h = re.sub(r'</?(?!i>|/i>|b>|/b>|em>|/em>|strong>|/strong>|sup>|/sup>|sub>|/sub>|u>|/u>)[a-zA-Z][^>]*>', '', h)
    return re.sub(r'\s+', ' ', h).strip()
files = sorted(glob.glob(os.path.join(src, 'text', '*.html')), key=lambda f: [int(x) if x.isdigit() else x for x in re.split(r'(\d+)', os.path.basename(f))])
data = {}; cur = None; stats = {}
for f in files:
    s = open(f, encoding='utf8').read()
    if '<body' not in s: continue
    body = s.split('<body', 1)[1].split('>', 1)[1]
    t = txt(body)
    # book heading
    h = t.split(' Introduction ')[0] if t.startswith('Jonah Introduction') else t
    if t.startswith('Jonah Introduction'): cur = 'Jonah'; continue
    if len(t) < 60 and t in HEAD or (len(t) < 60 and t.title() in HEAD): cur = HEAD.get(t) or HEAD.get(t.title()); continue
    if len(t) < 40 and t.upper() == t and t not in ('',): 
        for k in HEAD:
            if k.upper() == t: cur = HEAD[k]
        continue
    m = re.search(r'(?:CHAPTER|PSALM)\s*(\d+)\s*NOTES', re.sub(r'<[^>]+>', '', body)) or re.search(r'<h2[^>]*>(?:<span[^>]*></span>)?\s*(?:CHAPTER|PSALM)\s*(\d+)\s*</h2>', body, re.I)
    if not m or not cur: continue
    ch = int(m.group(1))
    book = data.setdefault(cur, {})
    last = None
    for p in re.finditer(r'<p class="(footnote[a-z0-9]*)"[^>]*>(.*?)</p>', body, re.S):
        c, inner = p.group(1), p.group(2)
        pt = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', inner)).strip()
        hm = re.match(r'(?:CHAPTER|PSALM) (\d+) NOTES$', pt)
        if c == 'footnoteh' and hm: ch = int(hm.group(1)); last = None; continue
        if pt.startswith('Click here'): continue
        mm = re.match(r'(\d+)(?:\s*[-–]\s*(\d+))?\.\s*', pt)
        if mm and c != 'footnotei':
            v = int(mm.group(1)); last = v
            inner = re.sub(r'^\s*<a [^>]*>\s*\d+\s*</a>\s*(?:[-–]\s*\d+)?\s*\.\s*', '', inner, flags=re.S)
            if mm.group(2): inner = '<sup>%s–%s</sup> ' % (mm.group(1), mm.group(2)) + inner
            # first anchor containing <i> = lemma -> bold
            inner = re.sub(r'^\s*<a [^>]*>\s*<i[^>]*>(.*?)</i>\s*</a>', r'<b>\1</b>', inner, count=1, flags=re.S)
        else:
            if last is None: continue
            v = last
            inner = re.sub(r'^\s*<a [^>]*>\s*<i[^>]*>(.*?)</i>\s*</a>', r'<b>\1</b>', inner, count=1, flags=re.S)
        book.setdefault(ch, {}).setdefault(v, []).append(clean(inner))
out_items = []
mp = os.path.join(proj, 'bundled', 'manifest.private.json')
man = json.load(open(mp)) if os.path.exists(mp) else {'items': []}
items = man['items'] if isinstance(man, dict) else man
items[:] = [i for i in items if not i['title'].startswith('Alter on ')]
for book, chs in data.items():
    if not chs:
        print('KEINE NOTEN:', book); continue
    title = 'Alter on ' + book
    arr = []
    for c in range(1, max(chs) + 1):
        vs = chs.get(c, {})
        n = max(vs) if vs else 0
        arr.append([('<br><br>'.join(vs[v]) if v in vs else '') for v in range(1, n + 1)])
    d = {'title': title, 'heTitle': 'אלטר על ' + HE.get(book, book), 'language': 'English', 'versionTitle': VERSION, 'versionSource': 'Robert Alter, The Hebrew Bible (eigenes EPUB, nur privat)',
         'sectionNames': ['Chapter', 'Verse'], 'text': arr}
    rel = 'own/%s/en/%s.json' % (title, VERSION)
    p = os.path.join(proj, 'bundled', rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    raw = json.dumps(d, ensure_ascii=False)
    open(p, 'w', encoding='utf8').write(raw)
    items.append({'rel': rel, 'title': title, 'heTitle': 'אלטר על ' + HE.get(book, book), 'language': 'English', 'versionTitle': VERSION,
                  'categories': ['Tanakh', 'Commentary', 'Robert Alter'], 'kind': 'en', 'hash': hashlib.sha1(raw.encode()).hexdigest()})
    stats[book] = (len(chs), sum(len(v) for v in chs.values()))
json.dump(man if isinstance(man, dict) else items, open(mp, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
for b, (c, v) in stats.items(): print(b, c, v)
print(len(stats), 'books')
