# ToposText-Werkseite (als HTML gesichert) + ToposText_places.geojson (ODC-BY, topostext.org) -> Abschnitt -> Orte
# Aufruf: extract_topostext.py <Werkseite.html> <ToposText_places.geojson> <out.json>
import sys, re, json, collections
html, geo, out = sys.argv[1:4]
t = open(html, encoding='utf-8', errors='replace').read()
urn = re.search(r"<p id='(urn:cts:[^':]+:[^':]+):", t).group(1)
title = re.search(r'<h2>(.*?)</h2>', t).group(1)
G = {}
for f in json.load(open(geo))['features']:
    p = f['properties']; G[p['ToposText'].rsplit('/', 1)[-1]] = p
places, paras, wordsof = {}, collections.OrderedDict(), {}
def words(h):
    h = re.sub(r'<i class="footnote">.*?</i>', '', h, flags=re.S); h = re.sub(r'<sup[^>]*>.*?</sup>', '', h, flags=re.S)
    h = re.sub(r'<[^>]+>', ' ', h); h = re.sub(r'&[a-z]+;', ' ', h); return re.findall(r'[a-z]+', h.lower())
for loc, h in re.findall(r"<p id='" + re.escape(urn) + r":([\w.]+)'>(.*?)</p>", t, flags=re.S):
    ids = []
    for m in re.finditer(r'<a about="https://topostext.org/place/([^"]+)" class="([^"]*)" long="([^"]*)" lat="([^"]*)">(.*?)</a>', h):
        i, cls, lon, lat, nm = m.groups()
        if i not in places:
            g = G.get(i, {}); places[i] = {'name': g.get('name') or nm, 'class': cls, 'lon': float(lon), 'lat': float(lat), 'greek': g.get('Greek'), 'type': g.get('type'), 'region': g.get('region'), 'country': g.get('country'), 'pleiades': (g.get('Pleiades') or '').rsplit('/', 1)[-1] or None, 'wikidata': g.get('Wikidata'), 'n': 0}
        places[i]['n'] += 1
        if i not in ids: ids.append(i)
    paras[loc] = ids; wordsof[loc] = words(h)
json.dump({'work': title, 'urn': urn, 'source': 'ToposText (topostext.org), ODC-BY; Texte: W. Whiston, Perseus', 'places': places, 'paras': paras, 'words': wordsof}, open(out, 'w'), ensure_ascii=False, indent=0)
print(title, len(paras), 'Abschnitte', len(places), 'Orte', sum(1 for p in places.values() if p['pleiades']), 'mit Pleiades', sum(1 for p in places.values() if p['wikidata']), 'mit Wikidata', sum(1 for i in places if i in G), 'im Gazetteer')
