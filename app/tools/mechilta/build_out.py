# Mechiltha (Winter/Wünsche 1909) -> Safran-Text (bundled/own) und Sefaria-CSV
import json, re, os, csv, hashlib, sys
D = os.path.dirname(os.path.abspath(__file__))
SAF = '/home/claude/safran'
OUT = '/mnt/user-data/outputs/mechilta'
TITLE = 'Mekhilta DeRabbi Yishmael'
VT = 'Mechiltha. Ein tannaitischer Midrasch zu Exodus, übersetzt und erläutert von J. Winter und A. Wünsche, Leipzig 1909'
SRC = 'https://archive.org/details/MechilthaEinTannaitischerMidraschZuExodusVonAugustWnsche'
NOTES = ('Deutsche Übersetzung von Jakob Winter und August Wünsche (Leipzig 1909), mit Beiträgen von Ludwig Blau; eigene Transkription '
         '(Texterkennung mit Claude Opus nach den Seitenbildern auf archive.org) und Zuordnung Satz für Satz zu den Sefaria-Segmenten. '
         'Gesperrte Lemmata fett, Fußnoten der Übersetzer als Fußnoten. Einleitung, Anhang, Nachträge und Register sind nicht enthalten.')
TR = ['Pischa', 'Vayehi Beshalach', 'Shirah', 'Vayassa', 'Amalek', 'Bachodesh', 'Nezikin', 'Kaspa', 'Shabbata']
seg = json.load(open(D + '/segmented.json'))

BOOKS = r'(?:[1-5]\.\s?)?(?:Gen|Ex|Exod|Lev|Num|Deut|Deuter|Jos|Jud|Richt|Sam|Reg|Kön|Jes|Jerem|Jer|Ezech|Ez|Hos|Joel|Am|Amos|Ob|Obad|Jon|Mich|Micha|Nah|Hab|Zeph|Hagg|Sach|Zach|Mal|Ps|Prov|Spr|Hi|Hiob|Cant|Hohel|Ruth|Thren|Klagel|Koh|Esth|Dan|Esra|Neh|Nehem|Chron|Chr|das|Kap|V)\.?'
REF = re.compile(r'\b(' + BOOKS + r')\s(\d{1,3}),\s?(\d{1,3})(?![\d,])')
def fix(t):
    t = t.strip()
    t = re.sub(r'^[—–]\s*', '', t); t = re.sub(r'\s*[—–]$', '', t)  # Wünsches Trennstriche am Rand eines Segments
    t = re.sub(r'<g>(.*?)</g>', r'<b>\1</b>', t)
    # Stellenangaben: „Ex. 34, 20“ -> „Ex. 34:20“; Wünsches „Kap. 12, 3“ (Exodus) -> „Ex. 12:3“
    t = REF.sub(lambda m: ('Ex.' if m.group(1).startswith('Kap') else m.group(1)) + ' ' + m.group(2) + ':' + m.group(3), t)
    t = re.sub(r'\s+', ' ', t).replace(' </b>', '</b> ').replace('<b> ', ' <b>')
    return t

text = {}
for t in TR:
    key = f'Tractate {t}'
    chs = {}
    for k, v in seg.items():
        if not k.startswith(key + ' '): continue
        c, s = map(int, k[len(key) + 1:].split(':'))
        chs.setdefault(c, {})[s] = fix(v)
    text[key] = [[chs[c].get(s, '') for s in range(1, max(chs[c]) + 1)] for c in range(1, max(chs) + 1)]
n = sum(1 for p in text.values() for c in p for s in c if s)
print('Segmente mit Text', n)
# Safran
rel = f'own/{TITLE}/de/{VT}.json'
p = f'{SAF}/bundled/{rel}'; os.makedirs(os.path.dirname(p), exist_ok=True)
doc = {'title': TITLE, 'heTitle': 'מכילתא דרבי ישמעאל', 'language': 'English', 'versionTitle': VT, 'versionSource': SRC, 'versionNotes': NOTES,
       'license': 'Public Domain', 'sectionNames': ['Chapter', 'Paragraph'], 'text': text}
json.dump(doc, open(p, 'w', encoding='utf-8'), ensure_ascii=False)
h = hashlib.sha1(open(p, 'rb').read()).hexdigest()
mp = f'{SAF}/bundled/manifest.json'; man = json.load(open(mp))
man['items'] = [e for e in man['items'] if e['rel'] != rel]
man['items'].append({'rel': rel, 'title': TITLE, 'heTitle': 'מכילתא דרבי ישמעאל', 'language': 'English', 'versionTitle': VT,
                     'categories': ['Midrash', 'Halakhah'], 'kind': 'de', 'hash': h})
json.dump(man, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# Sefaria-CSV
os.makedirs(OUT, exist_ok=True)
with open(f'{OUT}/Mekhilta DeRabbi Yishmael - Winter-Wünsche 1909.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['Index Title', TITLE]); w.writerow(['Version Title', VT]); w.writerow(['Language', 'de'])
    w.writerow(['Version Source', SRC]); w.writerow(['Version Notes', NOTES])
    for key, chs in text.items():
        for ci, ch in enumerate(chs, 1):
            for si, s in enumerate(ch, 1): w.writerow([f'{TITLE}, {key} {ci}:{si}', s])
print('fertig', p, h)
