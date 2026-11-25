# Philippson (Israelitische Bibel): zwei Stellen folgen im Druck der christlichen Kapitel-/Verszählung; hier auf die
# masoretische (Sefaria/Westminster) umgestellt, Übersetzung und Kommentar. Dazu getrennte Wörter (Zeilenumbruch) im Kommentar zusammengefügt.
#  1. Könige 4,21–34 (bei Philippson im Kapitel 4, alles in 4,20 zusammengezogen) = 5,1–14; Philippson 5,1–18 = 5,15–32
#  1. Chronik 12,4 = 12,4–5 (geteilt bei „und Jirmejah“); Philippson 12,5–40 = 12,6–41
import json, re, glob, hashlib, os
B = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'bundled')
T = 'Die Israelitische Bibel, übersetzt und erläutert von Dr. Ludwig Philippson — Übersetzung.json'
K = 'Die Israelitische Bibel, übersetzt und erläutert von Dr. Ludwig Philippson — Kommentar.json'
def load(p): return json.load(open(p, encoding='utf-8'))
def save(p, d): open(p, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
changed = []

# --- 1. Könige
p = f'{B}/own/I Kings/de/{T}'; d = load(p); t = d['text']
if len(t[4]) == 18:
    v20 = t[3][19]
    FN = 'Nach vielen Codd. fängt hier das V. Kapitel an.'
    v20 = re.sub(r'\s*\*\)\s*' + re.escape(FN) + r'\s*', ' ', v20)  # Fußnotentext steht mitten in V. 23
    parts = re.split(r'\s(2[1-9]|3[0-4])\.\s', v20)
    head, rest = parts[0].strip(), parts[1:]
    nums = [int(x) for x in rest[0::2]]; assert nums == list(range(21, 35)), nums
    head = re.sub(r'\s*\*\)\s*$', '', head) + f'<sup class="footnote-marker">*</sup><i class="footnote">{FN}</i>'
    t[3][19] = head
    t[4] = [x.strip() for x in rest[1::2]] + t[4]
    assert len(t[4]) == 32; save(p, d); changed.append(p)
pk = f'{B}/own/Philippson on I Kings/de/{K}'; c = load(pk); ct = c['text']
if len(ct[4]) <= 18:
    s = ct[3][18]
    parts = re.split(r'\s—\s(2[1-9]|3[0-4])\.\s', s)
    ct[3][18] = parts[0].strip()
    new5 = [''] * 14
    for n, txt in zip(parts[1::2], parts[2::2]): new5[int(n) - 21] = (new5[int(n) - 21] + ' ' + txt).strip()
    old5 = ct[4] + [''] * (18 - len(ct[4]))
    ct[4] = new5 + old5
    while ct[4] and not ct[4][-1]: ct[4].pop()
    save(pk, c); changed.append(pk)

# --- 1. Chronik 12
p = f'{B}/own/I Chronicles/de/{T}'; d = load(p); t = d['text']
if len(t[11]) == 40:
    v4 = t[11][3]; i = v4.find('und Jirmejah'); assert i > 0
    t[11][3:4] = [v4[:i].rstrip().rstrip(','), v4[i:][0].upper() + v4[i + 1:]]
    t[11][3] = t[11][3] + ','
    t[11][4] = 'und' + t[11][4][3:]
    assert len(t[11]) == 41; save(p, d); changed.append(p)
pk = f'{B}/own/Philippson on I Chronicles/de/{K}'; c = load(pk); ct = c['text']
if len(ct[11]) == 40:
    ct[11][4:4] = ['']; save(pk, c); changed.append(pk)

# --- Haftara-Angaben (Randnoten im Druck) standen mitten im Vers: als Fußnote ans Versende
HAFT = {(1, 1): 'Haphtorah: Jesch. 1, 1 — 27.', (7, 16): 'Haft.: Jesch. 49, 14 — 51, 3.', (31, 2): 'Haphtorah: Jesch. 55, 6—56, 8.',
        (32, 4): 'Haphtorah: 2 Schem. 22, 1—51. am S. Schubah: Hosch. 14, 2—10. mit Joel 2, 15—27.'}
p = f'{B}/own/Deuteronomy/de/{T}'; d = load(p); t = d['text']; ch = False
for (c, v), note in HAFT.items():
    s = t[c - 1][v - 1]
    if note in s and 'footnote' not in s:
        t[c - 1][v - 1] = re.sub(r'\s+', ' ', s.replace(note, ' ')).strip() + f'<sup class="footnote-marker">*</sup><i class="footnote">{note}</i>'; ch = True
s = t[33][11]; i = s.find('[Ende]')
if i > 0 and 'footnote' not in s:
    tail = s[i:].strip(); t[33][11] = s[:i].rstrip() + f'<sup class="footnote-marker">*</sup><i class="footnote">{tail}</i>'; ch = True
if ch: save(p, d); changed.append(p)

# --- Trennstriche im Kommentar (Zeilenumbruch im Druck): einzeln geprüft – zusammenziehen bzw. Bindestrich behalten
JOIN = {'bewaff- net': 'bewaffnet', 'Drommeten- zum': 'Drommeten zum', 'west- nord': 'west-nord', 'ent- schieden': 'entschieden', 'Instru- ment': 'Instrument',
        'ring- förmig': 'ringförmig', 'spöttisch- einschüchternden': 'spöttisch-einschüchternden', 'nicht- israelitische': 'nicht-israelitische',
        'alt- attischen': 'alt-attischen', 'Zei- chen': 'Zeichen', 'Um- fang': 'Umfang', 'liebe- erfüllten': 'liebeerfüllten', 'populär- homiletische': 'populär-homiletische',
        'Tra- ditionen': 'Traditionen', 'Jose- phiten': 'Josephiten'}
for pk in glob.glob(f'{B}/own/Philippson on */de/{K}'):
    s0 = open(pk, encoding='utf-8').read(); s1 = s0
    for a, b in JOIN.items(): s1 = s1.replace(a, b)
    if s1 != s0:
        open(pk, 'w', encoding='utf-8').write(s1)
        if pk not in changed: changed.append(pk)

# --- Manifest-Hashes
mp = f'{B}/manifest.json'; m = load(mp)
for it in m['items']:
    f = f"{B}/{it['rel']}"
    if f in changed or os.path.normpath(f) in map(os.path.normpath, changed):
        it['hash'] = hashlib.sha1(open(f, 'rb').read()).hexdigest()
open(mp, 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1))
print(len(changed), 'Dateien geändert')
