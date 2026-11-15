# Mechiltha (Winter/Wünsche): OCR-Seiten -> Einheiten (Parascha / Abschnitt) mit eingebetteten Fußnoten
# Ausgabe: units.json [{unit, head, pages, text}]  (text: HTML-Fragment, Zeilen verbunden)
import re, json, glob, os, sys
D = os.path.dirname(os.path.abspath(__file__))
pages = sorted(int(os.path.basename(f)[1:-4]) for f in glob.glob(D + '/ocr/n*.txt'))
pages = [p for p in pages if p >= 30]

def norm(s):
    s = s.replace('‘', 'ʿ').replace("'", 'ʿ') if False else s
    s = re.sub(r"(?<=[A-Za-zäöü])[‘'`](?=[a-zäöüA-Z])", 'ʿ', s)          # Ajin in Namen
    s = re.sub(r"(?<![\w])[‘'`](?=[A-Z][a-z])", 'ʿ', s)                    # ʿAkiba, ʿAmalek
    s = re.sub(r',,', '„', s)                                               # ,, -> „
    s = s.replace('‘‘', '“').replace("''", '“')
    return s

def join_lines(lines):
    t = '\n'.join(lines)
    t = re.sub(r'-</g>\n<g>(?=[a-zäöüß])', '', t)          # gesperrte Trennung
    t = re.sub(r'-\n(?=(?:<g>)?[a-zäöüß])', '', t)          # normale Trennung
    t = re.sub(r'</g>\n<g>', ' ', t)                        # Sperrung über Zeilenende
    t = re.sub(r'\s*\n\s*', ' ', t)
    t = re.sub(r'</g>(\s*)<g>', r'\1', t)
    return t.strip()

# 1. Seiten lesen: Haupttext-Zeilen (mit Überschriften) und Fußnoten
P = {}
for p in pages:
    raw = open(f'{D}/ocr/n{p}.txt', encoding='utf-8').read()
    if raw.strip() == 'LEER': continue
    raw = norm(raw)
    ls = raw.split('\n')
    head = ls[0][6:].strip() if ls and ls[0].startswith('KOPF:') else '-'
    body, notes, cont, cur, part = [], {}, [], None, 'body'
    for l in ls[1:]:
        if l.strip() == '---FUSSNOTEN---': part = 'fn'; continue
        if part == 'body':
            if l.strip(): body.append(l.rstrip())
            continue
        if not l.strip(): continue
        m = re.match(r'\s*\[(\d+|\+)\]\s*(.*)$', l)
        if m:
            cur = m.group(1)
            if cur == '+': cont.append(m.group(2))
            else: notes[cur] = [m.group(2)]
        elif cur is None or cur == '+': cont.append(l.strip())
        else: notes[cur].append(l.strip())
    P[p] = {'head': head, 'body': body, 'notes': notes, 'cont': cont}

# 2. Fortsetzungen an die letzte Fußnote der Vorseite hängen
prev = None
for p in sorted(P):
    if P[p]['cont'] and prev is not None:
        pn = P[prev]['notes']
        if pn:
            k = max(pn, key=int); pn[k] += P[p]['cont']
        else:
            print('Fortsetzung ohne Vorgänger', p, file=sys.stderr)
    prev = p

# 3. Fußnoten einsetzen, Text in Einheiten teilen
def fn_html(lines):
    t = join_lines(lines)
    return t
units, cur = [], None
ORD = ['Eingang', 'Erster', 'Zweiter', 'Dritter', 'Vierter', 'Fünfter', 'Sechster', 'Siebenter', 'Achter', 'Neunter', 'Zehnter', 'Elfter', 'Zwölfter',
       'Dreizehnter', 'Vierzehnter', 'Fünfzehnter', 'Sechzehnter', 'Siebzehnter', 'Achtzehnter', 'Neunzehnter', 'Zwanzigster']
parascha = 'Einleitung'
for p in sorted(P):
    pg = P[p]; used = set()
    for l in pg['body']:
        if l.startswith('## '):
            h = re.sub(r'<[^>]+>|\^\d+', '', l[3:]).strip(' .()')
            w = h.split()[0] if h else ''
            if w in ORD and ('Abschnitt' in h or w == 'Eingang'):
                cur = {'parascha': parascha, 'abschnitt': ORD.index(w), 'head': h, 'pages': [p], 'lines': []}; units.append(cur)
            else:
                parascha = h
                cur = {'parascha': parascha, 'abschnitt': -1, 'head': h, 'pages': [p], 'lines': []}; units.append(cur)
            cur['hline'] = l[3:]
            continue
        if cur is None:
            cur = {'parascha': parascha, 'abschnitt': -1, 'head': 'Einleitung', 'pages': [p], 'lines': []}; units.append(cur)
        if p not in cur['pages']: cur['pages'].append(p)
        cur['lines'].append((p, l))
    P[p]['used'] = used

out = []
for u in units:
    # Fußnotenzeichen je Seite ersetzen (Marke ^n auf Seite p -> Fußnote n der Seite p)
    segs = []
    for p, l in u['lines']:
        def rep(m, p=p):
            n = m.group(1); fn = P[p]['notes'].get(n)
            if fn is None:
                print('Fußnote fehlt', p, n, file=sys.stderr); return ''
            return '\x00FN' + n + '\x01' + json.dumps(fn_html(fn), ensure_ascii=False) + '\x00'
        segs.append(re.sub(r'\^(\d+)\)?', rep, l))
    t = join_lines(segs)
    t = re.sub(r'\x00FN(\d+)\x01(".*?")\x00', lambda m: '<sup class="footnote-marker">' + m.group(1) + '</sup><i class="footnote">' + json.loads(m.group(2)) + '</i>', t)  # Nummer wie im Buch (je Seite)
    out.append({'parascha': u['parascha'], 'abschnitt': u['abschnitt'], 'head': u['head'], 'pages': u['pages'], 'text': t})
json.dump(out, open(D + '/units.json', 'w'), ensure_ascii=False, indent=1)
for u in out: print(u['pages'][0], '-', u['pages'][-1], '|', u['parascha'], '|', u['abschnitt'], '|', len(u['text']))
