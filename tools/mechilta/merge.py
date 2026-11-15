# Ergebnisse der Segmentierung zusammenführen und prüfen
import json, glob, re, os
D = os.path.dirname(os.path.abspath(__file__))
TR = ['Pischa', 'Vayehi_Beshalach', 'Shirah', 'Vayassa', 'Amalek', 'Bachodesh', 'Nezikin', 'Kaspa', 'Shabbata']
ids = []
for t in TR:
    d = json.load(open(f'{D}/sef/{t}.json')); he = d['versions'][0]['text']
    for ci, ch in enumerate(he):
        for si in range(len(ch)): ids.append(f"Tractate {t.replace('_', ' ')} {ci + 1}:{si + 1}")
seg = {}
for f in sorted(glob.glob(D + '/seg/out/job*.json')):
    for k, v in json.load(open(f)).items():
        if k in seg: print('doppelt', k, os.path.basename(f))
        seg[k] = v
miss = [i for i in ids if i not in seg]
print('Segmente', len(ids), 'vorhanden', len(seg), 'fehlen', len(miss), miss[:5])
# Gesamtprüfung gegen den deutschen Text
U = json.load(open(D + '/units.json'))
txt = ' '.join(u['text'] for u in U if u['parascha'] not in ('Einleitung', 'Anhang'))
n = lambda s: re.sub(r'\s+', '', s)
cat = ''.join(seg.get(i, '') for i in ids)
print('Gesamttext gleich:', n(cat) == n(txt), len(n(cat)), len(n(txt)))
if n(cat) != n(txt):
    a, b = n(cat), n(txt)
    k = next(i for i in range(min(len(a), len(b))) if a[i] != b[i]); print('Abweichung bei', k, a[k-80:k+80], '|||', b[k-80:k+80])
empty = [i for i in ids if not seg.get(i, '').strip()]
print('leer', len(empty)); print(empty)
json.dump({i: seg.get(i, '') for i in ids}, open(D + '/segmented.json', 'w'), ensure_ascii=False, indent=0)
