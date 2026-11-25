# Gliederungen aller Bavli-Traktate aus talmud.dev (raw/<Traktat>/<amud>.json) -> out/<Sefaria-Titel>.json
import json, os, glob, sys
from fetch import T, pages
os.makedirs('out', exist_ok=True)
tot = [0, 0, 0, 0]
for tr, a, b in T:
    items = []
    for p in pages(a, b):
        f = f'raw/{tr}/{p}.json'
        if not os.path.exists(f): continue
        d = json.load(open(f)); en, he = d.get('en') or {}, d.get('he') or {}
        hs = {(i['s'], i['e']): i for i in he.get('argument') or []}
        hm = {}
        for m in he.get('argument-move') or []:
            g = m['f'] or {}; hm.setdefault((g.get('sectionStartSegIdx'), g.get('sectionEndSegIdx'), m['s']), m)
        seen = set(); emv = []
        for m in en.get('argument-move') or []:
            g = m['f'] or {}
            if g.get('id') in seen: continue  # doppelt erzeugte Schritte: den ersten nehmen
            seen.add(g.get('id')); emv.append(m)
        for i in en.get('argument') or []:
            g = i['f'] or {}
            if not g.get('title'): continue
            ref = f"{p}:{i['s'] + 1}" + (f"-{i['e'] + 1}" if i['e'] > i['s'] else '')
            h = hs.get((i['s'], i['e'])); hg = (h or {}).get('f') or {}
            it = {'ref': ref, 'text': hg.get('title') or g['title'], 'text_en': g['title'], 'desc_en': g.get('summary')}
            if hg.get('summary'): it['desc'] = hg['summary']; tot[2] += 1
            mv = [m for m in emv if [m['f'].get('sectionStartSegIdx'), m['f'].get('sectionEndSegIdx')] == [i['s'], i['e']] and m['f'].get('voice')]
            mv.sort(key=lambda m: (m['f'].get('moveOrder') if m['f'].get('moveOrder') is not None else 99, m['s']))
            if mv:
                it['sub'] = []
                for m in mv:
                    g2 = m['f']; x = hm.get((i['s'], i['e'], m['s'])) if h else None; xg = (x or {}).get('f') or {}
                    s = {'ref': f"{p}:{m['s'] + 1}", 'text': xg.get('voice') or g2['voice'], 'text_en': g2['voice'], 'desc_en': g2.get('summary')}
                    if xg.get('summary'): s['desc'] = xg['summary']; tot[3] += 1
                    it['sub'].append(s)
            items.append(it)
    if not items: continue
    title = tr.replace('_', ' ')
    ol = {'book': title, 'title': f'מבנה הסוגיות – {title}', 'title_de': f'Aufbau der Sugjot – {title}', 'title_en': f'Argument sections – {title}',
          'note': 'חלוקה לסוגיות ולשלבי הדיון שנוצרה בבינה מלאכותית באתר talmud.dev (Shaun Regenbaum).',
          'note_de': 'KI-erzeugte Einteilung in Sugjot und Argumentationsschritte von talmud.dev (Shaun Regenbaum); englisch, hebräisch wo dort vorhanden.',
          'note_en': 'AI-generated sugya sections and argument steps from talmud.dev (Shaun Regenbaum).',
          'sections': [{'head': title, 'head_de': title, 'head_en': title, 'items': items}]}
    json.dump(ol, open(f'out/{title}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    tot[0] += len(items); tot[1] += sum(len(i.get('sub', [])) for i in items)
print('Abschnitte', tot[0], '| Schritte', tot[1], '| hebr. Abschnitte', tot[2], '| hebr. Schritte', tot[3])
