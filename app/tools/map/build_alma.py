# ALMA – Ancient Locations in Rabbinic (and other ancient Jewish) Literature, Ido Wachtel (Hebrew University GIS),
# ArcGIS-Layer Alma_all_records_web_mercator25_2_24 („Alma Records“, alle Stellen; ältere Layer Place_Name_Alma ebenso lesbar) -> map/alma.js: je Werk die Orte und die Abschnitte (Sefaria-Struktur), in denen sie vorkommen.
# Aufruf: build_alma.py <alma_places.json> <cache-ordner> <out.js>
#   alma_places.json = alle Features der Layer-Abfrage (where=1=1, outFields=*, f=json)
# Stellen werden über die Sefaria-API (api/name, api/v2/raw/index) in Sefaria-Titel und Abschnittspfade übersetzt.
import sys, json, re, os, time, subprocess, urllib.parse, collections
src, cache, out = sys.argv[1:4]
os.makedirs(cache, exist_ok=True)
def get(url, name):
    f = os.path.join(cache, re.sub(r'[^\w.-]', '_', name)[:180] + '.json')
    if os.path.exists(f): return json.load(open(f))
    r = subprocess.run(['curl', '-s', '-m', '40', url], capture_output=True, text=True).stdout
    try: d = json.loads(r)
    except Exception: d = None
    json.dump(d, open(f, 'w')); time.sleep(0.15); return d
def name(q): return get('https://www.sefaria.org/api/name/' + urllib.parse.quote(q) + '?limit=0', 'n_' + q) or {}
def index(t): return get('https://www.sefaria.org/api/v2/raw/index/' + urllib.parse.quote(t.replace(' ', '_')), 'i_' + t) or {}

FIX = [(r'^BT\s+(.+?)\s+(\d+):([12])\b.*', lambda m: f"{m[1]} {m[2]}{'a' if m[3] == '1' else 'b'}"),
       (r'^PT\s+', 'Jerusalem Talmud '), (r'^Sifre\s+Deut\w*\s+', 'Sifrei Devarim '), (r'^Sifre\s+Numbers\s+', 'Sifrei Bamidbar '),
       (r'^Psikta deRav Kahana\s+', "Pesikta D'Rav Kahanna "), (r'^Mekhilta de\s?R\w*\s+Yishmael\s+', "Mekhilta d'Rabbi Yishmael "),
       (r'^Avot DeRabbi Nathan version A\s+', 'Avot DeRabbi Natan '),
       (r'^Pseudo-Jonathan Gen\.\s+(\d+)\s+(\d+).*', r'Targum Jonathan on Genesis \1:\2'), (r'^Onqel\.\s+Gen\.\s+(\d+)\s+(\d+).*', r'Onkelos Genesis \1:\2'),
       (r'^Genesis Rabbah\s+(\d+):(\d+):\d+$', r'Bereishit Rabbah \1:\2'), (r'^Lamentations Rabbah\s+(\d+)$', r'Eichah Rabbah, Petichta \1')]
ALIAS = {'Ketubbot': 'Ketubot', 'Zevahim': 'Zevachim', 'Chulin': 'Chullin', 'Menakhot': 'Menachot', 'Menahot': 'Menachot', 'Megila': 'Megillah',
         'Brakhot': 'Berakhot', 'Meahot': 'Menachot', 'Temura': 'Temurah', 'Midot': 'Middot', 'Taaniyot': 'Taanit', 'Kippourim': 'Yoma',
         'Kelim Metsia': 'Kelim Metzia', 'Kelim Bava Kamma': 'Kelim Kamma', 'Kelim Bava Metzia': 'Kelim Metzia', 'Avoda Zara': 'Avodah Zarah'}
def alias(q):
    q = re.sub(r'^Mishnah Pirkei Avot\b', 'Pirkei Avot', q)
    for k, v in ALIAS.items(): q = re.sub(r'\b' + re.escape(k) + r'\b', v, q)
    return q
def guess(a):
    u = a.get('Sefaria') or ''
    m = re.match(r'https?://www\.sefaria\.org/([^?#]+)', u)
    cands = []
    if m and 'Jerusalem_Talmud' not in u: cands.append(urllib.parse.unquote(m.group(1)).replace('_', ' ').rsplit('.', 0)[0])
    e = (a.get('exact_ref_english') or '').strip()
    if e:
        for p, r in FIX:
            if re.match(p, e): e = re.sub(p, r, e); break
        cands.append(e)
    for c in cands:
        c2 = re.sub(r'^([^.]+?)\.([\d.ab]+)$', lambda m: m[1] + ' ' + m[2].replace('.', ':'), c)  # URL-Form Titel.10.8 -> Titel 10:8
        n = name(c2)
        if not n.get('is_ref') and alias(c2) != c2: n = name(alias(c2))
        if n.get('is_ref') and n.get('index'): return n
    return None

def node_of(ix, ref, title):
    sch = ix.get('schema') or {}
    if 'nodes' not in sch: return [], sch
    rest = ref[len(title):].lstrip(', ')
    for nd in sch['nodes']:
        nm = next((t['text'] for t in nd.get('titles', []) if t.get('lang') == 'en' and t.get('primary')), nd.get('key', ''))
        if nd.get('default'): continue
        if rest.startswith(nm): return [nm], nd
    dn = next((nd for nd in sch['nodes'] if nd.get('default')), None)
    return ([''] if dn else []), (dn or sch)
def addr(x, typ):
    if typ == 'Talmud': m = re.match(r'(\d+)([ab])', x); return (int(m[1]) - 1) * 2 + (1 if m[2] == 'b' else 0)
    return int(x) - 1

feats = json.load(open(src))
for f in feats:  # Feldnamen des Gesamt-Layers auf die des Orts-Layers abbilden
    a = f['attributes']
    if 'Place_English' in a:
        a.update(Locations_english_name=a['Place_English'], Locations_name=a.get('Place_Hebrew'), exact_ref_english=a.get('Reference_English'), alt_common_names='')
        if a.get('Longtitude') not in (None, 0) and a.get('Latitude') not in (None, 0): f['geometry'] = {'x': a['Longtitude'], 'y': a['Latitude']}
        else: f['geometry'] = None
works = collections.OrderedDict(); miss = collections.Counter(); ok = 0
for f in feats:
    a = f['attributes']; g = f.get('geometry')
    if not g or not a.get('Locations_english_name'): miss['(ohne Koordinaten)'] += 1; continue
    n = guess(a)
    if not n: miss[a.get('Refrences_english_name') or a.get('Source_English')] += 1; continue
    title = n['index']; ix = index(title); keys, nd = node_of(ix, n['ref'], title)
    depth = nd.get('depth', 2); at = nd.get('addressTypes', ['Integer'] * depth); secs = n.get('sections') or []
    if not secs: miss['(ohne Abschnitt) ' + title] += 1; continue
    try: nums = [addr(s, at[k]) for k, s in enumerate(secs[:depth])]
    except Exception: miss['(Adresse) ' + title] += 1; continue
    sec, v = nums[:depth - 1], (nums[depth - 1] + 1 if len(nums) >= depth else 0)
    if len(sec) < depth - 1: sec = sec + [0] * 0  # nur Kapitel angegeben: ganzer Abschnitt unbekannt -> erster Teil
    key = '|'.join([k for k in keys if k] + [str(x) for x in sec])
    w = works.setdefault(title, {'title': title, 'places': [], 'pix': {}, 'by': collections.defaultdict(list)})
    pk = (a['Locations_english_name'], round(g['x'], 4), round(g['y'], 4))
    if pk not in w['pix']:
        w['pix'][pk] = len(w['places'])
        w['places'].append([a['Locations_english_name'], a.get('place_type') or '', round(g['x'], 4), round(g['y'], 4), a.get('Locations_name') or '', a.get('alt_common_names') or ''])
    per = (a.get('Period') or a.get('period') or '').strip().lower()
    pc = 'T' if 'tanna' in per and 'second' not in per else 'A' if 'amora' in per and 'post' not in per else 'S' if 'second' in per else 'O'
    e = [w['pix'][pk], v, n['ref'], pc]  # Epoche: S = Zweiter Tempel, T = tannaitisch, A = amoräisch, O = andere/unbekannt
    if e not in w['by'][key]: w['by'][key].append(e)
    ok += 1
res = [{'title': w['title'], 'places': w['places'], 'by': dict(w['by'])} for w in works.values()]
open(out, 'w').write('// Orte in der rabbinischen Literatur: ALMA (Ancient Locations in rabbinic literature, Ido Wachtel, Hebrew University GIS; ArcGIS „Place_Name_Alma“), Stellen über die Sefaria-API auf Sefaria-Abschnitte abgebildet. Erzeugt mit tools/map/build_alma.py\nwindow.BMALMA=' + json.dumps(res, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(ok, 'Stellen,', len(res), 'Werke,', sum(len(w['places']) for w in res), 'Ortseinträge; nicht zugeordnet:', sum(miss.values()))
print(miss.most_common(40))
