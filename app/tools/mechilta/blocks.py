# Deutschen Text an gemeinsamen Versankern („Kap. 12, 3.“ <-> „(שמות יב,ג)“) in Blöcke schneiden und Aufträge bilden
import json, re, difflib, os
D = os.path.dirname(os.path.abspath(__file__))
U = json.load(open(D + '/units.json'))
TR = ['Pischa', 'Vayehi_Beshalach', 'Shirah', 'Vayassa', 'Amalek', 'Bachodesh', 'Nezikin', 'Kaspa', 'Shabbata']
TRN = {t: 'Tractate ' + t.replace('_', ' ') for t in TR}
strip = lambda s: re.sub(r'<[^>]+>', '', s).strip()

# Sefaria-Segmente in Reihenfolge
segs = []
for t in TR:
    d = json.load(open(f'{D}/sef/{t}.json')); he, en = d['versions'][0]['text'], d['versions'][1]['text']
    for ci, ch in enumerate(he):
        ech = en[ci] if ci < len(en) else []
        for si, s in enumerate(ch):
            segs.append({'id': f'{TRN[t]} {ci + 1}:{si + 1}', 'he': strip(s), 'en': strip(ech[si]) if si < len(ech) else ''})
S = json.load(open(D + '/anchors_sef.json'))
idx = {s['id']: i for i, s in enumerate(segs)}
sanch = [(idx[f'{TRN[t]} {ch}:{si}'], (c, v)) for t, ch, si, c, v in S]

# deutscher Text (ohne Einleitung/Anhang), Anker außerhalb der Fußnoten
txt = ' '.join(u['text'] for u in U if u['parascha'] not in ('Einleitung', 'Anhang'))
mask = re.sub(r'<i class="footnote">.*?</i>', lambda m: '\x01' * len(m.group(0)), txt)
ganch = [(m.start(), (int(m.group(1)), int(m.group(2)))) for m in re.finditer(r'(?<![(\w])Kap\.\s*(\d+)\s*,\s*(\d+)', mask)]
sm = difflib.SequenceMatcher(None, [a[1] for a in sanch], [a[1] for a in ganch], autojunk=False)
pairs = []
for b in sm.get_matching_blocks():
    for k in range(b.size): pairs.append((sanch[b.a + k][0], ganch[b.b + k][0]))
# bei wiederholter Stellenangabe („Kap. 12, 2.“ zweimal) gilt die erste nach dem vorigen Anker
gpos = [a[0] for a in ganch]; gv = [a[1] for a in ganch]
fixed = []
for k, (si, gi) in enumerate(pairs):
    j = gpos.index(gi); lo = fixed[-1][1] if fixed else -1
    while j > 0 and gv[j - 1] == gv[j] and gpos[j - 1] > lo: j -= 1
    fixed.append((si, gpos[j]))
pairs = fixed
pairs[0] = (0, 0)  # erster Block ab Textanfang
blocks = []
for k, (si, gi) in enumerate(pairs):
    si2, gi2 = (pairs[k + 1] if k + 1 < len(pairs) else (len(segs), len(txt)))
    blocks.append({'block': k, 'de': txt[gi:gi2].strip(), 'segs': segs[si:si2]})
print('Blöcke', len(blocks), 'Segmente', sum(len(b['segs']) for b in blocks), 'von', len(segs))
# Aufträge: ~45 Segmente bzw. ~22.000 Zeichen Deutsch
jobs, cur, ns, nc = [], [], 0, 0
for b in blocks:
    if cur and (ns + len(b['segs']) > 45 or nc + len(b['de']) > 22000):
        jobs.append(cur); cur, ns, nc = [], 0, 0
    cur.append(b); ns += len(b['segs']); nc += len(b['de'])
if cur: jobs.append(cur)
os.makedirs(D + '/seg/in', exist_ok=True); os.makedirs(D + '/seg/out', exist_ok=True)
for j, bl in enumerate(jobs):
    json.dump(bl, open(f'{D}/seg/in/job{j:02d}.json', 'w'), ensure_ascii=False, indent=1)
print('Aufträge', len(jobs), [sum(len(b['segs']) for b in bl) for bl in jobs])
print('größte Blöcke', sorted(((len(b['segs']), len(b['de']), b['segs'][0]['id'] if b['segs'] else '-') for b in blocks), reverse=True)[:6])
print('Blöcke ohne Deutsch', [b['block'] for b in blocks if not b['de']], 'ohne Segmente', [b['block'] for b in blocks if not b['segs']])
