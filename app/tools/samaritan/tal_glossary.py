"""Tal–Florentin, Symbols and Abbreviations, pp. 81–84; References, pp. 71–78.
German hover explanations; source spelling and punctuation remain unchanged.
"""
import html, re
GLOSSARY = dict(line.split('=', 1) for line in '''ABS=Status absolutus
ABST=Abstraktum
ACT=Aktiv
ADJ=Adjektiv; adjektivisch
ADV=Adverb; adverbial
AH=Samaritanisch-arabische Fassung des Ab Hisda (11. Jahrhundert)
ARCH=Archaisch
AS=Samaritanisch-arabische Fassung des Abu Saʿid (13. Jahrhundert)
C=Gemeinsames Genus (männlich und weiblich)
COND=Konditional
CONJ=Konjunktion
CONV IMPF=Konvertiertes Imperfekt
CONV PF=Konvertiertes Perfekt
CSTR=Status constructus
DEF=Bestimmt; bestimmter Artikel
DENOM=Denominativ
DIREC he=Richtungsweisendes He (He locale)
Deut.=Deuteronomium
EMPH=Emphatisch
Exod.=Exodus
EXCLAM=Exklamativ; Ausruf
EXCLAM he=He des Ausrufs
F=Weiblich (Femininum)
fn.=Fußnote
GENT=Herkunftsbezeichnung
Gen.=Genesis
hif=Hifʿil
hitp=Hitpaʿʿel
hit B=Hitpaʿel B (GSH §2.1.5.3)
hof=Hofʿal
hot=Hotpaʿel
IMPF=Imperfekt
IMV=Imperativ
INDEF=Unbestimmt; ohne bestimmten Artikel
INDEP=Selbständig
INF=Infinitiv
INF ABS=Infinitivus absolutus
INTERJ=Interjektion
INTERROG=Interrogativ; Frage
INTERROG he=Frage-He
LENG IMPF=Verlängertes Imperfekt
LENG IMV=Verlängerter Imperativ
Lev.=Levitikus
lit.=Wörtlich
M=Männlich (Maskulinum)
MH=Mischnisches Hebräisch
MORPH=Morphologie
MS=Handschrift
MSS=Handschriften
MT=Masoretischer Text
N=Substantiv
NEG=Negation
nif=Nifʿal
nif B=Nifʿal B (GSH §2.1.4.6)
NOTA ACC=Akkusativzeichen
NUM=Numerale; Zahlwort
Num.=Numeri
ORTH=Orthographie
PARAG nun=Paragogisches Nun
PARTIC=Partikel
PASS=Passiv
PERS=Persönlich; Personal-
PF=Perfekt
PHON=Lautung; Phonetik
pi=Piʿʿel
pi B=Piʿel B (GSH §2.1.3.5)
PL=Plural; Mehrzahl
PREP=Präposition
PRON=Pronomen; Pronominalsuffix
PROP N=Eigenname
PT=Partizip
pu=Puʿʿal
qal=Qal (Grundstamm)
REL=Relativ
SG=Singular; Einzahl
SAV=Samaritanisch-arabische Übersetzung
SHORT IMPF=Verkürztes Imperfekt
SHORT IMV=Verkürzter Imperativ
SH=Samaritanisches Hebräisch
SP=Samaritanischer Pentateuch
ST=Samaritanischer Targum
SUFF=Suffix
TOP=Ortsname
v.=Vers
var.=Variante
VB=Verb
GSH=Zeʾev Ben-Ḥayyim, A Grammar of Samaritan Hebrew (2000)
DSA=Abraham Tal, A Dictionary of Samaritan Aramaic
LOT=Zeʾev Ben-Ḥayyim, The Literary and Oral Tradition amongst the Samaritans (1957–1977)
GKC=Gesenius’ Hebrew Grammar, herausgegeben von E. Kautzsch, übersetzt von A. Cowley (1910)
HALOT=The Hebrew and Aramaic Lexicon of the Old Testament (1994–2000)
BDB=Brown–Driver–Briggs, A Hebrew and English Lexicon of the Old Testament (1906)
LSH=Moshe Florentin, Late Samaritan Hebrew: A Linguistic Analysis of Its Different Texts (2005)
TM=Abraham Tal, Tibåt Mårqe: Edition, Translation, Commentary (2019)
LXX=Septuaginta; griechische Übersetzung
SA=Samaritanisches Aramäisch
RSV=Revised Standard Version
NRSV=New Revised Standard Version
JPS=Jewish Publication Society; englische Bibelübersetzung
CST=Status constructus
DET=Bestimmt; determiniert
COLLEC=Kollektiv; Sammelbezeichnung
DUAL=Dual; Zweizahl
DEMONST=Demonstrativ; hinweisend
CONSEC=Konsekutiv
OPT=Optativ; Wunsch
NOM AG=Nomen agentis; Bezeichnung des Handelnden
PART=Partikel
POSS=Possessiv; besitzanzeigend
APP=Apposition
INTRANS=Intransitiv
TRANS=Transitiv
CE=Allgemeine Zeitrechnung
cf.=Vergleiche
vs=Gegenüber; im Vergleich mit
s.v.=Unter dem Stichwort
§=Paragraph
§§=Paragraphen
]=Inhaltliche Abweichung zwischen SP und MT; im Buch rot gedruckt
≈=Nicht inhaltliche Abweichung zwischen SP und MT
//=Zwei Eigennamen im Vergleich: SP gegenüber MT
^=Abweichung zwischen Handschrift Nablus 6 (C) und samaritanischer mündlicher Überlieferung (§4.3.2.10)
|=Trennt Verse desselben Kapitels im Apparat
⇓=Verweis auf eine Endnote
«=In SP gegenüber MT fehlender Text (Anfang)
»=In SP gegenüber MT fehlender Text (Ende)
1°=Erstes Vorkommen des Wortes in diesem Vers
2°=Zweites Vorkommen des Wortes in diesem Vers
3°=Drittes Vorkommen des Wortes in diesem Vers
+DEF=MT hat gegenüber SP zusätzlich den bestimmten Artikel (grammatischer Unterschied)
−DEF=MT fehlt gegenüber SP der bestimmte Artikel (grammatischer Unterschied)
+ו=MT hat gegenüber SP zusätzlich das verbindende Waw
−ו=MT fehlt gegenüber SP das verbindende Waw
ו+=MT hat gegenüber SP zusätzlich das verbindende Waw
ו−=MT fehlt gegenüber SP das verbindende Waw
:>— —=Ende einer Qiṣṣa (samaritanischer Textabschnitt)
——>::=Ende einer Qiṣṣa (samaritanischer Textabschnitt)'''.splitlines())
GLOSSARY['=']='Gleicher Wortlaut in SP und MT, der dennoch erläutert wird'
# Components may be separate PDF font spans; each remains understandable on hover.
GLOSSARY.update({
    'LENG':'Verlängerte Form', 'SHORT':'Verkürzte Form',
    'PROP':'Eigenname (proper noun)', 'CONV':'Konvertierte Verbform',
    'PARAG':'Paragogischer Zusatz', 'DIREC':'Richtungsweisend (He locale)',
    'NOTA':'Zeichen (NOTA ACC: Akkusativzeichen)', 'ACC':'Akkusativ',
    'NOM':'Nomen (NOM AG: Nomen agentis)', 'AG':'Handelnder (NOM AG: Nomen agentis)',
    'CNST':'Status constructus', 'COLLECT':'Kollektiv; Sammelbezeichnung',
    'ARAM':'Aramäisch', 'INTEROG':'Interrogativ; Frage', 'IMPV':'Imperativ',
    'DIRECT':'Richtungsweisend (He locale)', 'CONVER':'Konvertierte Verbform',
    'ABSTR':'Abstraktum', 'NS':'Substantive (Plural von N)',
    'BL':'British Library', 'CAD':'The Assyrian Dictionary of the University of Chicago',
    'ASV':'American Standard Version', 'WEB':'World English Bible',
    'KJV':'King James Version', 'RH':'Rabbinisches Hebräisch', 'BH':'Biblisches Hebräisch',
    'BHQ':'Biblia Hebraica Quinta', 'COMP':'Komparativ; Vergleich',
    'e.g.':'Zum Beispiel', 'i.e.':'Das heißt', 'etc.':'Und so weiter',
    'n.':'Anmerkung', 'nn.':'Anmerkungen', 'pp.':'Seiten', 'p.':'Seite',
    '+':'Zusätzliches Element in MT gegenüber SP',
    '−':'In MT gegenüber SP fehlendes Element',
    # The embedded Hebrew-font runs leave these Latin abbreviations reversed.
    # Explain their actual source meaning without changing the extracted wording.
    'NOHP':'Phonetik (PHON; im extrahierten PDF-Lauf umgekehrt)',
    'LP':'Plural (PL; im extrahierten PDF-Lauf umgekehrt)',
    'GS':'Singular (SG; im extrahierten PDF-Lauf umgekehrt)',
    'JDA':'Adjektiv (ADJ; im extrahierten PDF-Lauf umgekehrt)',
})
# Joined person/gender/number notation in the apparatus, including 3MSG.
for gender, label in [('M','männlich'),('F','weiblich'),('C','gemeinsames Genus')]:
    for number, nlabel in [('SG','Singular'),('PL','Plural')]:
        GLOSSARY[gender+number]=label+', '+nlabel
        for person in '123':GLOSSARY[person+gender+number]=person+'. Person, '+label+', '+nlabel
for person in '123':
    for number, label in [('SG','Singular'),('PL','Plural')]:GLOSSARY[person+number]=person+'. Person, '+label
PATTERN=re.compile('|'.join((r'(?<![A-Za-z0-9])'+re.escape(k)+r'(?![A-Za-z0-9])') if re.search('[A-Za-z0-9]',k) else re.escape(k) for k in sorted(GLOSSARY,key=len,reverse=True)))
def markup(text):
    """Escape plain text and annotate complete tokens, never markup/attributes."""
    out=[];start=0
    for match in PATTERN.finditer(text):
        out.append(html.escape(text[start:match.start()]))
        tip=GLOSSARY[match[0]]
        assert not re.search('["<>&]',tip) and len(tip)<=200
        out.append('<span class="ab" data-t="'+tip+'">'+html.escape(match[0])+'</span>')
        start=match.end()
    return ''.join(out)+html.escape(text[start:])
