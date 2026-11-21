#!/usr/bin/env python3
"""Wortkarte: Wie gibt eine wortgenau zugeordnete Übersetzung (interlin/<Buch>.js: Zunz, Breuer, Philippson, Herxheimer, Goldschmidt, Hirsch, Julius Hirsch, Mendelssohn) ein hebräisches Lemma wieder?
Je Vorkommen des Lemmas im Westminster-Text werden die deutschen Segmente gesammelt, die diesem Wort zugeordnet sind
(nur Segmente, deren einziges Inhaltswort dieses Wort ist; את zählt nicht als Inhaltswort). Der Text wird bereinigt
(Satzzeichen, „und“ und Artikel am Anfang weg, klein geschrieben) und nach einem einfachen Wortstamm gruppiert
(kehrt, kehrte, kehrten -> eine Gruppe).
Ausgabe: interlin-ren.js
  window.INTERLIN_REN = {books, tr: {Übersetzung: {Lemma: [Gruppen, Zellen, Paradigma]}}}
  Gruppen: [[Grundform, [Form, Anzahl] …] …]; Zellen: [[Gruppe, Bestimmung, Anzahl, Stellen, häufigste Form bei dieser Bestimmung] …]
  Stellen: Vers-Nummern (Buch*1000000 + Kapitel*1000 + Vers) als Differenzen in Basis 36, durch „.“ getrennt; Buch = Index in BOOKS.
  Paradigma (Formentabelle, „Übersetzung unter den Formen“): je Form der Tabelle – Schlüssel und Form genau wie forms.js sie bildet
  (Forms.analyze: key, raw) – die Wiedergaben an den Stellen dieser Form:
    {Schlüssel: {Form: [Belege, verschiedene Wiedergaben, [[Wiedergabe, Anzahl, Gruppe, Bindewort?, Anzahl mit Bindewort?] … bis 6],
                        [[Gruppe, Anzahl] … bis 4]? (nur bei mehr als 6 Wiedergaben, sonst 0 oder weggelassen), Kollokation?]}}
    Einzelbeleg kurz: [Wiedergabe, Gruppe, Bindewort?]
  Wiedergabe: ohne Satzzeichen, Satzanfang klein, ohne das Bindewort am Anfang („und“, „da“, „so“ … – das steht für das ו und wird eigens gezählt).
  Kollokation (nur wenn ein Wort davor überwiegt und die Wiedergabe daran hängt, z. B. כֹּה אָמַר „spricht“ 94 %, sonst 33 %):
    [Wort davor, Belege danach, [Wiedergabe, Anzahl], [[Wiedergabe sonst, Anzahl] … bis 2]]
Aufruf: python3 -I tools/interlinear/renderings.py   (braucht node für forms.js)"""
import json, glob, re, os, subprocess
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
IL = {}  # aus interlin/<Buch>.js (tools/interlinear/build.py) zusammengesetzt: {Übersetzung: {Buch: {Vers: Segmente}}}
for fp in sorted(glob.glob(os.path.join(R, 'interlin', '*.js'))):
    if os.path.basename(fp) == 'index.js': continue
    s = open(fp, encoding='utf8').read(); m = re.search(r'window\.INTERLIN_PARTS\[("(?:[^"\\]|\\.)*")\]=', s)
    book = json.loads(m.group(1)); part = json.loads(s[m.end():].strip().rstrip(';'))
    for n, v in part.items(): IL.setdefault(n, {})[book] = v
_ix = open(os.path.join(R, 'interlin', 'index.js'), encoding='utf8').read()  # Reihenfolge der Übersetzungen wie in build.py (bestimmt das Ergebnis)
_order = json.loads(re.search(r'window\.INTERLIN_ORDER=(\[.*?\]);', _ix).group(1))
_books = json.loads(re.search(r'window\.INTERLIN_BOOKS=(\[.*?\]);', _ix).group(1))
IL = {n: {b: IL[n][b] for b in _books if b in IL[n]} for n in _order if n in IL}
BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'I Samuel', 'II Samuel', 'I Kings', 'II Kings', 'Isaiah', 'Jeremiah', 'Ezekiel',
         'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Psalms', 'Proverbs', 'Job', 'Song of Songs',
         'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah', 'I Chronicles', 'II Chronicles']
FUNC = {'853'}  # Akkusativzeichen
ART = {'der', 'die', 'das', 'den', 'dem', 'des'}
# für die Gruppierung ohne Bedeutung: Pronomen, Artikel, Partikeln und Präpositionen (die stehen im Hebräischen meist als Vorsilbe oder Suffix)
STOPW = set('und da so dann nun auch o ja er sie es ich du wir ihr ihn ihm ihnen mich mir dich dir uns euch sich der die das den dem des ein eine einen einem einer eines zu in im an am auf aus von vom mit nach bei beim für um über unter vor wie als zum zur gen denn aber doch daß dass ist sind war waren bin bist sei seid seyn sein man wenn ob was wer nicht kein keine keinen nur noch schon gegen durch indem weiter wider ohne bis seit samt sammt nebst wegen halber willen also'.split()) - {'also'}
# Hilfs- und Modalverben: für die Bedeutung ohne Belang („hat geantwortet“, „willst du antworten“ -> antworten)
AUX = set('hat habe hast habt haben hatte hatten hattest hätte hätten will willst wollen wollt wollte wollten soll sollst sollen sollt sollte sollten werde wirst wird werden werdet würde würden wurde wurden ward möge mögen mag magst kann kannst können könnt konnte konnten müsse muß mußt müssen darf darfst dürfen laß läßt lasset lassen ließ ließen'.split())
# trennbare Vorsilben, die bei Zunz nachgestellt stehen („hub an“ -> anheben)
PART = set('an auf aus ab ein zu vor nach mit zurück heraus hinaus herab hinab herauf hinauf herbei hinweg weg fort dar bei entgegen hervor nieder um los hin her heim wieder kund'.split())
# starke Verben: Präteritum/Partizip/3. Person -> Infinitiv (Zunz-Schreibung)
STRONG = {}
for inf, forms in {
    'heben': 'hub hob huben hoben hebt gehoben', 'rufen': 'rief riefen ruft gerufen', 'singen': 'sang sangen singt gesungen', 'fahren': 'fuhr fuhren fährt gefahren',
    'sprechen': 'sprach sprachen spricht sprich gesprochen spräche sprächen sprächet', 'geben': 'gab gaben giebt gibt gieb gegeben', 'nehmen': 'nahm nahmen nimmt nimm genommen', 'kommen': 'kam kamen kommt gekommen',
    'gehen': 'ging gingen geht gehet gegangen', 'sehen': 'sah sahen sieht siehet sieh gesehen', 'stehen': 'stand standen steht gestanden', 'ziehen': 'zog zogen zieht gezogen',
    'tragen': 'trug trugen trägt getragen', 'schlagen': 'schlug schlugen schlägt geschlagen', 'fallen': 'fiel fielen fällt gefallen', 'halten': 'hielt hielten hält gehalten',
    'essen': 'aß aßen ißt iß gegessen', 'sitzen': 'saß saßen sitzt gesessen', 'liegen': 'lag lagen liegt gelegen', 'finden': 'fand fanden findet gefunden', 'binden': 'band banden bindet gebunden',
    'senden': 'sandte sandten sendet gesandt', 'bringen': 'brachte brachten bringt gebracht', 'denken': 'dachte dachten denkt gedacht', 'wissen': 'wußte wußten weiß gewußt',
    'sterben': 'starb starben stirbt gestorben', 'helfen': 'half halfen hilft geholfen', 'werfen': 'warf warfen wirft geworfen', 'schreiben': 'schrieb schrieben schreibt geschrieben',
    'treiben': 'trieb trieben treibt getrieben', 'bleiben': 'blieb blieben bleibt geblieben', 'schweigen': 'schwieg schwiegen schweigt geschwiegen', 'steigen': 'stieg stiegen steigt gestiegen',
    'weichen': 'wich wichen weicht gewichen', 'brechen': 'brach brachen bricht gebrochen', 'trinken': 'trank tranken trinkt getrunken', 'sinken': 'sank sanken sinkt gesunken',
    'schwören': 'schwur schwor schwuren schworen schwört geschworen', 'vergessen': 'vergaß vergaßen vergißt', 'lesen': 'las lasen liest gelesen', 'bitten': 'bat baten bittet gebeten',
    'wachsen': 'wuchs wuchsen wächst gewachsen', 'graben': 'grub gruben gräbt gegraben', 'schaffen': 'schuf schufen schafft geschaffen', 'tun': 'that thaten thut thue gethan',
    'thun': 'that thaten thut thue gethan', 'sein': '', 'befehlen': 'befahl befahlen befiehlt befohlen', 'erschrecken': 'erschrak erschraken erschrickt', 'verbergen': 'verbarg verbargen verbirgt verborgen',
    'gebären': 'gebar gebaren gebiert geboren', 'vergeben': 'vergab vergaben vergiebt', 'leiden': 'litt litten leidet gelitten', 'streiten': 'stritt stritten streitet gestritten',
    'reiten': 'ritt ritten reitet geritten', 'schneiden': 'schnitt schnitten schneidet geschnitten', 'greifen': 'griff griffen greift gegriffen', 'fliehen': 'floh flohen flieht geflohen',
    'fliegen': 'flog flogen fliegt geflogen', 'fließen': 'floß flossen fließt geflossen', 'schließen': 'schloß schlossen schließt geschlossen', 'gießen': 'goß gossen gießt gegossen',
    'genießen': 'genoß genossen genießt', 'verlieren': 'verlor verloren verliert', 'frieren': 'fror froren friert gefroren', 'wägen': 'wog wogen gewogen', 'beten': '', 'sein': 'war waren warst wart ist sind bin bist sei seien seiest seid seyn wäre wären wärst gewesen', 'werden': 'wird wirst werdet ward wurde wurden würde würden würdest geworden', 'geschehen': 'geschah geschahen geschieht geschiehet', 'ergehen': 'erging ergingen ergeht ergehet ergangen', 'kennen': 'kannte kannten kanntest gekannt', 'erkennen': 'erkannte erkannten erkanntest erkannt', 'nennen': 'nannte nannten genannt', 'brennen': 'brannte brannten gebrannt', 'erscheinen': 'erschien erschienen erscheint', 'scheinen': 'schien schienen scheint geschienen', 'wandeln': 'wandle wandelt wandelte wandelten gewandelt wandelst', 'bezwingen': 'bezwang bezwangen bezwingt bezwungen', 'heißen': 'hieß hießen heißt geheißen', 'gebieten': 'gebot geboten gebietet gebeut', 'meinen': '', 'preisen': 'pries priesen preist gepriesen', 'erwidern': 'erwiederte erwiederten erwiedert erwiedern erwiedere',
}.items():
    for f in forms.split():
        STRONG.setdefault(f, inf)
        if f.startswith('ge') and len(f) > 6 and f[2:] not in ('legen', 'wogen'): STRONG.setdefault(f[2:], inf)  # (aus)ge|sprochen
STRONG.update({'geb': 'geben', 'gebe': 'geben', 'gebet': 'geben', 'sprech': 'sprechen'})
GEKEEP = {'gerecht', 'gesamt', 'gelinde', 'gemach', 'getreu', 'gewiß', 'genug'}
SUF = ['test', 'ten', 'tet', 'est', 'te', 'et', 'en', 'em', 'er', 'es', 'st', 'e', 'n', 's', 't']
PRON = set('er sie es ich du wir ihr ihn ihm ihnen mich mir dich dir uns euch sich man'.split())
JUNK = set('und da so dann nun auch o ja denn aber doch also wie als daß dass der die das den dem des ein eine'.split())  # bei Verb/Nomen allein: Zuordnungsfehler
POSS = re.compile(r'^(mein|dein|sein|unser|euer|eur|ihr)(e|en|em|er|es|m|n|s)?$')
def clean(t):
    t = re.sub(r'[„“”‚‘’"«»,.;:!?()\[\]—–…]|\.\.\.', ' ', t)
    t = t.replace("'", ' ')
    w = t.split()
    while w and (w[0].lower() == 'und' or w[0].lower() in ART) and len(w) > 1: w = w[1:]
    return ' '.join(w)
def stem(w):  # Endungen abschneiden, bis nichts mehr passt (segnete -> segne -> segn), Stamm mindestens 4 Buchstaben
    w = w.lower()
    while True:
        x = next((x for x in SUF if w.endswith(x) and len(w) - len(x) >= 3), None)
        if not x: return w
        w = w[:-len(x)]
def base(w):
    r = base0(w)
    return w if r == w.lower() else r
def base0(w):  # Wortform -> Grundform (Infinitiv starker Verben, Partizip ohne ge-, Zunz-Schreibung)
    lower = w == w.lower()
    w = w.lower().replace('erwied', 'erwid')
    if w in STRONG: return STRONG[w]
    for x in ('est', 'st', 'et', 't', 'e'):  # sprichst, sprachet, gabst
        if w.endswith(x) and w[:-len(x)] in STRONG and len(w) - len(x) >= 3: return STRONG[w[:-len(x)]]
    m = re.match(r'^(%s)ge(\w{4,})$' % '|'.join(sorted(PART, key=len, reverse=True)), w)  # angehoben, aufgerichtet
    if m: return m.group(1) + base0(m.group(2) if m.group(2) not in STRONG else STRONG[m.group(2)])
    if not lower and w.startswith('ge') and len(w) >= 8 and w.endswith('et'): return w[2:]  # Gesegnet (Satzanfang)
    if lower and w.startswith('ge') and len(w) >= 6 and w.endswith('t') and w not in GEKEEP and not w.startswith(('gegen', 'geh')):
        return w[2:]  # geantwortet -> antwortet, gezeugt -> zeugt, geredet -> redet
    return w
def content(form, pos='V'):  # Inhaltswörter einer Wiedergabe in Grundform, trennbare Vorsilbe wieder vorn („hub an“ -> anheben)
    if pos not in 'VNA':  # Pronomen, Präpositionen, Partikeln: die Wörter selbst („zu ihm“ -> zu, „ich bin“ -> ich)
        lw = [w.lower() for w in form.split()]
        return ([l for l in lw if l in PRON] if pos == 'P' else []) or [l for l in lw if l not in STOPW] or [l for l in lw if l not in PRON and l not in AUX] or lw
    ws = [w for w in form.split() if not POSS.match(w.lower())]
    lw = [w.lower() for w in ws]
    part = None
    if len(lw) > 1 and lw[-1] in PART: part = lw[-1]; ws, lw = ws[:-1], lw[:-1]
    out = [base(w) for w, l in zip(ws, lw) if l not in STOPW and l not in AUX]
    if not out: out = [base(w) for w, l in zip(ws, lw) if l not in STOPW]
    if not out: out = [base(w) for w, l in zip(ws, lw) if l not in JUNK and l not in PRON]
    if not out: out = [w.lower() for w in ws]  # Pronomen, Partikeln: die Form selbst
    if part and out: out[0] = part + out[0]
    return out
# ----- Paradigma: Wiedergabe je Form der Formentabelle -----
CONJ = {'und', 'da', 'so', 'dann', 'aber', 'nun', 'auch', 'doch', 'also', 'denn'}  # Bindewörter am Anfang: stehen für das ו
FUNCW = STOPW | AUX | ART | JUNK | PRON | CONJ
LOWER = set()  # klein geschriebene Wörter der Übersetzungen (erster Durchlauf): „Sprach“ am Satzanfang -> „sprach“, „König“ bleibt
def para(segs, pos):  # [(Segment-Nummer, Text)] -> (Bindewort, Wiedergabe); nicht benachbarte Segmente mit „…“ verbunden
    t = ''
    for j, (k, x) in enumerate(segs): t += ('' if not j else ' ' if k == segs[j - 1][0] + 1 else ' … ') + x
    t = re.sub(r'\.\.\.|[„“”‚‘"«»,.;:!?()\[\]—–]', ' ', t)
    w = t.split()
    while w and w[0] == '…': w = w[1:]
    while w and w[-1] == '…': w = w[:-1]
    if not w: return '', ''
    low = lambda x: x[:1].isupper() and (x.lower().rstrip("'’") in FUNCW or (pos != 'N' and x.lower().rstrip("'’") in LOWER))  # Satzanfang, kein Nomen
    if low(w[0]): w[0] = w[0].lower()
    cj = []
    while len(w) > 1 and w[0].lower() in CONJ:
        cj.append(w[0].lower()); w = w[1:]
        while len(w) > 1 and w[0] == '…': w = w[1:]
        if low(w[0]): w[0] = w[0].lower()
    return ' '.join(cj), ' '.join(w)
def formkeys():  # je Buch und Vers: je Wort „Schlüssel|Form|Wort ohne Akzente“ wie Forms.analyze (forms.js) – dieselbe Zerlegung wie in der Formentabelle
    js = ("const fs=require('fs'),path=require('path'),R=process.argv[1],F=require(path.join(R,'forms.js'));const out={};"
          "for(const b of JSON.parse(process.argv[2])){const f=fs.readdirSync(path.join(R,'bundled','own',b,'he')).find(x=>x.startsWith('Westminster'));if(!f)continue;"
          "const T=JSON.parse(fs.readFileSync(path.join(R,'bundled','own',b,'he',f),'utf8')).text,o=out[b]={};"
          "T.forEach((ch,c)=>(Array.isArray(ch)?ch:[]).forEach((v,i)=>{if(typeof v!=='string')return;"
          "o[(c+1)+':'+(i+1)]=[...v.matchAll(/<span class=\"w\" data-l=\"([^\"]*)\" data-m=\"([^\"]*)\"[^>]*>(.*?)<\\/span>/g)].map(m=>{const a=F.analyze(m[3],m[2],m[1]);return (a?a.key+'|'+a.raw:'|')+'|'+F.clean(m[3]);});}));}"
          "process.stdout.write(JSON.stringify(out));")
    r = subprocess.run(['node', '-e', js, os.path.abspath(R), json.dumps(BOOKS)], capture_output=True, text=True, encoding='utf8', check=True)
    return json.loads(r.stdout)
FK = formkeys()
def mcode(dl, dm):  # Bestimmung des Hauptworts (ohne Vorsilben), Suffix angehängt: „HVqw3ms“, „HNcmsc/Sp3ms“
    ls, ms = dl.split('/'), dm[1:].split('/')
    i = next((k for k, x in enumerate(ls) if re.search(r'\d', x)), len(ls) - 1)
    main = ms[i] if i < len(ms) else ms[-1]
    suf = [x for x in ms[i + 1:] if x.startswith('S')]
    return dm[0] + main + ('/' + suf[0] if suf else '')
def b36(n):
    d = '0123456789abcdefghijklmnopqrstuvwxyz'; o = ''
    while True:
        n, r = divmod(n, 36); o = d[r] + o
        if not n: return o
out = {}
NAMESET = set(); NAMEC = {}  # Eigennamen (deutsche Form -> [bei Namen, bei anderen Wörtern]); bei Nicht-Namen gelten sie als Zuordnungsfehler
for NAMES in (None, True):
 if NAMES: NAMESET = {f for f, (a, b) in NAMEC.items() if a >= 3 and a > 4 * b}
 for tr, books in IL.items():
    if tr == 'Umschrift': continue  # Aussprache, keine Übersetzung: keine Übersetzungsstatistik
    acc = {}  # Lemma -> Stamm -> [Anzahl, {Form: n}, [Stellen]]
    pacc = {}  # Lemma -> (Schlüssel, Form) -> [Anzahl, {Wiedergabe: [n, {Bindewort: n}, Stamm]}, {Stamm: n}, {Lemma davor: [n, {Wiedergabe: n}, {Wort: n}]}]
    for book, verses in books.items():
        if book not in BOOKS: continue
        bi = BOOKS.index(book)
        f = glob.glob(os.path.join(R, 'bundled', 'own', book, 'he', 'Westminster*'))
        if not f: continue
        he = json.load(open(f[0], encoding='utf8'))['text']
        for k, segs in verses.items():
            c, v = map(int, k.split(':'))
            if c > len(he) or v > len(he[c - 1]): continue
            ws = re.findall(r'<span class="w" data-l="([^"]*)" data-m="([^"]*)"', he[c - 1][v - 1])
            lems = [next((x.strip() for x in l.split('/') if re.search(r'\d', x)), '') for l, m in ws]
            per = {}
            if NAMES is None:  # erster Durchlauf sammelt nur Eigennamen (und die klein geschriebenen Wörter)
                for idx, t in segs:
                    LOWER.update(x for x in re.findall(r'[^\W\d_]+', t) if x == x.lower())
                    if len(idx) == 1 and 1 <= idx[0] <= len(ws) and t[:1].isupper():
                        c = NAMEC.setdefault(clean(t), [0, 0]); c['Np' not in mcode(*ws[idx[0] - 1])] += 1
                continue
            perk = {}; fks = FK.get(book, {}).get(k, [])
            for sk, (idx, t) in enumerate(segs):
                cidx = [i for i in idx if 1 <= i <= len(lems) and lems[i - 1] and lems[i - 1] not in FUNC]
                if len(cidx) != 1: continue
                per.setdefault(cidx[0], []).append(t); perk.setdefault(cidx[0], []).append((sk, t))
            for i, ts in per.items():
                form = clean(' '.join(ts))
                if not form: continue
                if form in NAMESET and 'Np' not in ws[i - 1][1]:
                    continue  # Eigenname bei einem Nicht-Namen: Zuordnungsfehler
                pos = mcode(*ws[i - 1])[1]
                cw = content(form, pos)
                if not cw or (pos in 'VN' and all(w in JUNK for w in form.lower().split())):
                    continue  # nur Partikeln („Und“)
                key = ' '.join(stem(w) for w in cw)
                e = acc.setdefault(lems[i - 1], {}).setdefault(key, [0, {}, {}, {}, key, {}])
                e[0] += 1; fl = form.lower() if not form[:1].isupper() or len(form.split()) > 1 else form
                e[1][fl] = e[1].get(fl, 0) + 1
                tt = ' '.join(cw); tt = tt if not form[:1].isupper() or len(cw) > 1 or cw[0] != form.lower() else form
                e[3][tt] = e[3].get(tt, 0) + 1
                e[2].setdefault(mcode(*ws[i - 1]), []).append(bi * 1000000 + c * 1000 + v)
                fc = e[5].setdefault(mcode(*ws[i - 1]), {}); fc[fl] = fc.get(fl, 0) + 1  # häufigste Form je Bestimmung (Paradigmen: „er ging aus“ statt „ausgehen“)
                # Paradigma: Wiedergabe an der Stelle genau dieser Form (Schlüssel und Form wie in der Formentabelle)
                fk = fks[i - 1].split('|') if len(fks) == len(ws) else None
                cj, core = para(perk[i], pos)
                if fk and fk[0] and core:
                    pe = pacc.setdefault(lems[i - 1], {}).setdefault((fk[0], fk[1]), [0, {}, {}, {}])
                    pe[0] += 1
                    ce = pe[1].setdefault(core, [0, {}, key]); ce[0] += 1; ce[1][cj] = ce[1].get(cj, 0) + 1
                    pe[2][key] = pe[2].get(key, 0) + 1
                    if i >= 2 and lems[i - 2]:
                        pv = pe[3].setdefault(lems[i - 2], [0, {}, {}]); pv[0] += 1; pv[1][core] = pv[1].get(core, 0) + 1
                        hw = fks[i - 2].split('|')[2]; pv[2][hw] = pv[2].get(hw, 0) + 1
    res = {}
    for lem, groups in acc.items():
        gs = sorted(groups.values(), key=lambda g: -g[0])
        labels, cells = [], []
        for gi, g in enumerate(gs):
            # Überschrift: Infinitiv (Stamm + -en), wenn die Gruppe ein Verb ist und die Form vorkommt; sonst die häufigste Grundform
            k = g[4]; low = sum(n for t, n in g[3].items() if t == t.lower())
            mx = max(g[3].values()); inf = [t for t in g[3] if t == t.lower() and ' ' not in t and stem(t) == k and re.search(r'(en|ern|eln)$', t) and g[3][t] * 20 >= mx]
            verb = low * 2 > g[0] and ' ' not in k and (inf or any(re.search(r'(te|ten|test|tet|t)$', t) for t in g[3] if t == t.lower()))
            # Präteritum statt Infinitiv („setzten“, wenn auch „setze“/„setzt“ belegt ist) -> setzen
            inf = [t[:-3] + ('n' if t[:-3].endswith(('er', 'el')) else 'en') if t.endswith('ten') and not t.endswith('eten') and t[:-3] + 'e' in g[3] and len(t) >= 7 else t for t in inf]
            if inf and verb: title = min(inf, key=lambda t: (len(t), -g[3].get(t, 0)))
            elif verb:  # schwaches Verb ohne Infinitiv-Beleg: zugesagt -> zusagen, antwortete -> antworten
                t0 = max(g[3], key=lambda t: g[3][t]); b0 = re.sub(r'(eten|ete|et|ten|te|t)$', '', t0); title = b0 + ('n' if b0.endswith(('er', 'el')) else 'en')
                if not title.endswith(('en', 'ern', 'eln')) or len(title) < 4: title = t0
            else:
                mx = max(g[3].values()); same = [t for t in g[3] if ' ' not in t and t == t.lower() and stem(t) == k and g[3][t] * 5 >= mx]  # Adjektive: gut statt guten
                title = min(same, key=lambda t: (len(t), -g[3][t])) if same and low * 2 > g[0] else max(g[3], key=lambda t: (g[3][t], -len(t)))
            labels.append([title] + [[f, n] for f, n in sorted(g[1].items(), key=lambda x: -x[1])[:8]])
            for code, refs in sorted(g[2].items()):
                refs = sorted(refs); prev = 0; enc = []
                for r in refs: enc.append(b36(r - prev)); prev = r
                fc = g[5].get(code, {}); cells.append([gi, code, len(refs), '.'.join(enc), max(fc, key=lambda f: (fc[f], -len(f))) if fc else ''])
        gix = {g[4]: gi for gi, g in enumerate(gs)}
        P = {}
        for (fkey, raw), (n, cores, gn, prev) in sorted(pacc.get(lem, {}).items()):
            top = sorted(cores.items(), key=lambda x: (-x[1][0], x[0]))
            cj = lambda v: [x for x in [max(v[1].items(), key=lambda y: (y[1], y[0] != ''))] if x[0]]  # häufigstes Bindewort; fehlt, wenn meist keines steht
            row = [n, len(cores), [[c, v[0], gix[v[2]]] + [y for x in cj(v) for y in x] for c, v in top[:6]]]
            if len(cores) > 6: row.append([[gix[g], m] for g, m in sorted(gn.items(), key=lambda x: (-x[1], gix[x[0]]))[:4]])  # sonst aus den Wiedergaben zu zählen
            # Kollokation: ein Wort davor überwiegt (mindestens die Hälfte der Stellen) und die Wiedergabe hängt daran –
            # die dort häufigste Wiedergabe ist sonst deutlich seltener (כֹּה אָמַר „spricht“ 94 %, sonst 33 %)
            if n >= 10 and prev and fkey[1] == 'V':  # nur Verben: bei Nomen hinge daran bloß der Kasus (אֱלֹהֵי אֲבוֹתֵיהֶם „ihrer Väter“)
                pl, (pn, pc, pw) = max(prev.items(), key=lambda x: (x[1][0], x[0]))
                if pn * 2 >= n and n - pn >= 5:
                    cin, nin = max(pc.items(), key=lambda x: (x[1], x[0]))
                    rest = {c: v[0] - pc.get(c, 0) for c, v in cores.items() if v[0] - pc.get(c, 0) > 0}
                    if nin >= 5 and nin / pn - rest.get(cin, 0) / (n - pn) >= 0.3:
                        if len(row) == 3: row.append(0)
                        row.append([max(pw.items(), key=lambda x: (x[1], x[0]))[0], pn, [cin, nin], [[c, m] for c, m in sorted(rest.items(), key=lambda x: (-x[1], x[0]))[:2]]])
            if n == 1: row = row[2][0][:1] + row[2][0][2:4]  # Einzelbeleg: [Wiedergabe, Gruppe, Bindewort?]
            P.setdefault(fkey, {})[raw] = row
        res[lem] = [labels, cells, P]
    out[tr] = res
p = os.path.join(R, 'interlin-ren.js')
open(p, 'w', encoding='utf8').write('// Wortkarte: Wiedergabe hebräischer Lemmata in den wortgenau zugeordneten Übersetzungen (interlin.js) – erzeugt von tools/interlinear/renderings.py\n'
                                    '// Format: {books, tr: {Übersetzung: {Lemma: [[Grundform, [Form, Anzahl] …] je Gruppe …], [[Gruppe, Bestimmung (OSHB-Code des Hauptworts), Anzahl, Stellen, häufigste Form bei dieser Bestimmung] …], Paradigma]}}}; Stellen: Buch*1000000+Kapitel*1000+Vers als Differenzen (Basis 36)\n'
                                    '// Paradigma (Formentabelle): {Schlüssel: {Form (wie forms.js): [Belege, verschiedene Wiedergaben, [[Wiedergabe, Anzahl, Gruppe, Bindewort?, Anzahl mit Bindewort?] …], [[Gruppe, Anzahl] …]? (nur bei mehr als 6 Wiedergaben), [Wort davor, Belege danach, [Wiedergabe, Anzahl], [[Wiedergabe sonst, Anzahl] …]]?]; Einzelbeleg: [Wiedergabe, Gruppe, Bindewort?]}}\n'
                                    'window.INTERLIN_REN=' + json.dumps({'books': BOOKS, 'tr': out}, ensure_ascii=False, separators=(',', ':')) + ';\n')
print({k: len(v) for k, v in out.items()}, os.path.getsize(p), 'Bytes')
