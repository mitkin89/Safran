#!/usr/bin/env python3
"""Schreibt map/jer/meta.js: Ausrichtung (Affine) der Wilson-Karte und die Namen der Jerusalem-Detailkarte.
Aufruf: build_jer_meta.py <wil_meta.json> <map/jer/meta.js>
wil_meta.json: {"file","w","h","A":[lon0,du,dv],"B":[lat0,du,dv]} (Pixel der Bilddatei -> Länge/Breite).
Die Ausrichtung entstand aus Passpunkten (Tore/Ecken der Altstadtmauer) und wurde per Mauerlinie aus OSM nachjustiert;
Kontrolle: Gihon-Quelle (OSM) liegt auf Wilsons „Virgin's Well“ (Abweichung ~1 m)."""
import sys, json
wil = json.load(open(sys.argv[1]))
# [en, de, he], Art (hill, val, pt, gate, wall), Länge/Breite, Winkel (Grad), kleinster Zoom (0 = immer)
L = [
 [['Mount Zion', 'Berg Zion', 'הר ציון'], 'hill', 35.2287, 31.7712, 0, 0],
 [['Mount of Olives', 'Ölberg', 'הר הזיתים'], 'hill', 35.2455, 31.7789, 0, 0],
 [['Temple Mount (Moriah)', 'Tempelberg (Morija)', 'הר הבית'], 'hill', 35.2362, 31.7805, 0, 0],
 [['Ophel', 'Ofel', 'עופל'], 'hill', 35.2372, 31.7750, 0, 60],
 [['City of David', 'Davidstadt', 'עיר דוד'], 'hill', 35.2366, 31.7712, 0, 60],
 [['Hill of Evil Counsel', 'Berg des bösen Rates', 'הר העצה הרעה'], 'hill', 35.2300, 31.7650, 0, 60],
 [['Mount Scopus', 'Skopusberg', 'הר הצופים'], 'hill', 35.2430, 31.7935, 0, 0],
 [['Bezetha', 'Bezetha (Neustadt)', 'בית זיתא'], 'hill', 35.2338, 31.7838, 0, 120],
 [['Kidron Valley', 'Kidrontal', 'נחל קדרון'], 'val', 35.2395, 31.7740, -78, 0],
 [['Hinnom Valley', 'Hinnomtal', 'גיא בן הנום'], 'val', 35.2250, 31.7708, -88, 0],
 [['Tyropoeon Valley', 'Tyropoion-Tal', 'עמק הטירופויון'], 'val', 35.2332, 31.7735, -80, 90],
 [['Gihon Spring', 'Gihon-Quelle', 'מעיין הגיחון'], 'pt', 35.23683, 31.77323, 0, 160],
 [['Pool of Siloam', 'Schiloach-Teich', 'ברכת השילוח'], 'pt', 35.23512, 31.7704, 0, 160],
 [['Dome of the Rock', 'Felsendom', 'כיפת הסלע'], 'pt', 35.23543, 31.77799, 0, 200],
 [['Western Wall', 'Westmauer', 'הכותל המערבי'], 'pt', 35.23386, 31.77562, 0, 260],
 [["Robinson's Arch", 'Robinson-Bogen', 'קשת רובינסון'], 'pt', 35.23459, 31.77582, 0, 420],
 [['Hulda Gates', 'Hulda-Tore', 'שערי חולדה'], 'pt', 35.23600, 31.77584, 0, 420],
 [['Broad Wall (c. 700 BC)', 'Breite Mauer (um 700 v. Chr.)', 'החומה הרחבה'], 'pt', 35.23165, 31.77594, 0, 320],
 [["David's Tomb", 'Davidsgrab', 'קבר דוד'], 'pt', 35.22922, 31.77171, 0, 260],
 [['Citadel (Tower of David)', 'Zitadelle (Davidsturm)', 'מגדל דוד'], 'pt', 35.2279, 31.7770, 0, 200],
 [['Holy Sepulchre', 'Grabeskirche', 'כנסיית הקבר'], 'pt', 35.22951, 31.77847, 0, 200],
 [['Gethsemane', 'Gethsemane', 'גת שמנים'], 'pt', 35.2402, 31.7794, 0, 160],
 [['Ketef Hinnom', 'Ketef Hinnom', 'כתף הינום'], 'pt', 35.22537, 31.76886, 0, 260],
 [['Jaffa Gate', 'Jaffa-Tor', 'שער יפו'], 'gate', 35.22762, 31.77650, 0, 160],
 [['New Gate', 'Neues Tor', 'השער החדש'], 'gate', 35.22619, 31.7793, 0, 200],
 [['Damascus Gate', 'Damaskustor', 'שער שכם'], 'gate', 35.2301, 31.7817, 0, 160],
 [["Herod's Gate", 'Herodestor', 'שער הפרחים'], 'gate', 35.23314, 31.78293, 0, 200],
 [["Lions' Gate", 'Löwentor (Stephanstor)', 'שער האריות'], 'gate', 35.2370, 31.7813, 0, 160],
 [['Golden Gate', 'Goldenes Tor', 'שער הרחמים'], 'gate', 35.23747, 31.7789, 0, 200],
 [['Dung Gate', 'Misttor', 'שער האשפות'], 'gate', 35.23417, 31.77483, 0, 160],
 [['Zion Gate', 'Zionstor', 'שער ציון'], 'gate', 35.22964, 31.77286, 0, 160],
]
labels = [{'n': l[0], 't': l[1], 'p': [l[2], l[3]], 'a': l[4], 'z': l[5]} for l in L]
meta = {'wil': {'file': wil['file'], 'w': wil['w'], 'h': wil['h'], 'A': wil['A'], 'B': wil['B']}, 'labels': labels}
open(sys.argv[2], 'w').write('window.BJERMETA=' + json.dumps(meta, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(labels), 'Namen')
