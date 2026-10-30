#!/usr/bin/env python3
# python3 assemble_outline_photos.py <tr-Ordner mit b*.json> <Ausgabe-Ordner>: setzt abgeschriebene Foto-Tabellen zu outlines/<Buch>.json zusammen
import json, sys, os, glob, re
src, out = sys.argv[1], sys.argv[2]
FIX = {'1 Chronicles': 'I Chronicles', '2 Chronicles': 'II Chronicles'}
HEB = {'Jeremiah':'ירמיהו','Ezekiel':'יחזקאל','Hosea':'הושע','Joel':'יואל','Amos':'עמוס','Obadiah':'עובדיה','Jonah':'יונה','Micah':'מיכה','Nahum':'נחום','Habakkuk':'חבקוק','Zephaniah':'צפניה','Haggai':'חגי','Zechariah':'זכריה','Malachi':'מלאכי','Ecclesiastes':'קהלת','Esther':'אסתר','Daniel':'דניאל','Ezra':'עזרא','Nehemiah':'נחמיה','I Chronicles':'דברי הימים א','II Chronicles':'דברי הימים ב'}
SEC = {'תולדות ויחסים': 'תולדות ויחוסים'}
books = {}
for f in sorted(glob.glob(os.path.join(src, 'b*.json'))):
    for e in json.load(open(f, encoding='utf8')):
        b = FIX.get(e['book'], e['book']); rows = e['rows']
        if b == 'Ezra':  # p29: Ende Esra, dann Nehemia ab 1:1
            for i, r in enumerate(rows):
                if i and r.get('section') == 'בניית חומות ירושלים':
                    books.setdefault('Ezra', []).extend(rows[:i]); books.setdefault('Nehemiah', []).extend(rows[i:]); break
            else: books.setdefault(b, []).extend(rows)
        else: books.setdefault(b, []).extend(rows)
for b, rows in books.items():
    secs = []; seen = None
    for r in rows:
        if seen and r.get('ref') == seen.get('ref'):  # Überlappung zweier Fotos
            for k, v in r.items(): seen.setdefault(k, v)
            continue
        sec = SEC.get(r.get('section'), r.get('section')) or (secs[-1]['head'] if secs else '')
        sec = sec.replace('היתום', 'חתימה')
        if not secs or secs[-1]['head'] != sec: secs.append({'head': sec, 'items': []})
        it = {'ref': r['ref'].replace(' ', '') if r.get('ref') else ''}
        for k in ('text', 'time', 'place', 'par', 'extra'):
            if r.get(k): it[k] = r[k].replace('היתום', 'חתימה') if k == 'text' else r[k]
        secs[-1]['items'].append(it); seen = it
    d = {'book': b, 'title': 'תוכן ספר ' + HEB[b], 'note': 'Abgeschrieben aus Fotos einer Übersichtstabelle. Kapitel- und Verszählung sowie Daten (jüdische Zählung) wie in der Vorlage gedruckt; mit [?] sind schwer lesbare Stellen markiert.', 'sections': secs}
    json.dump(d, open(os.path.join(out, b + '.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(b, len(secs), 'Abschnitte', sum(len(s['items']) for s in secs), 'Einträge', sum(json.dumps(s, ensure_ascii=False).count('[?]') for s in secs), '[?]')
