"""Text-Fabric-Feature-Dateien (.tf) ohne die Text-Fabric-Bibliothek lesen: Knoten -> Wert"""
import re


def load(path):
    out = {}
    lines = open(path, encoding='utf8').read().split('\n')
    i = 0
    while i < len(lines) and lines[i].strip() != '': i += 1
    node = 0
    body = lines[i + 1:]
    while body and body[-1] == '': body.pop()  # Zeilenende am Dateiende
    for ln in body:
        if ln == '': node += 1; out[node] = ''; continue  # leerer Wert (z. B. kein Zwischenraum nach einem Wortteil)
        if '\t' in ln:
            a, v = ln.split('\t', 1)
            if re.fullmatch(r'[\d,\-]+', a):
                nodes = []
                for p in a.split(','):
                    x, _, y = p.partition('-'); nodes += range(int(x), int(y or x) + 1)
                for n in nodes: out[n] = v
                node = nodes[-1]
                continue
            node += 1; out[node] = v
        else:
            node += 1; out[node] = ln
    return out


def oslots(path, first):
    """oslots.tf: Knoten (ab first) -> (erster Slot, letzter Slot)"""
    out, node = {}, first
    lines = open(path, encoding='utf8').read().split('\n')
    i = 0
    while i < len(lines) and lines[i].strip() != '': i += 1
    for ln in lines[i + 1:]:
        ln = ln.strip()
        if not ln: continue
        if '\t' in ln: n, rng = ln.split('\t', 1); node = int(n)
        else: rng = ln
        ps = []
        for part in rng.split(','):
            a, _, b = part.partition('-'); ps.append((int(a), int(b or a)))
        out[node] = (ps[0][0], ps[-1][1]); node += 1
    return out
