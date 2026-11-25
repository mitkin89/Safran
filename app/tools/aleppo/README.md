# Aleppo-Text (MAM)

`aleppo.py` holt den Aleppo-Text („Miqra according to the Masorah“, he.wikisource, CC BY-SA 4.0) aus dem
Text-Fabric-Datensatz CACCHT (Martijn Naaijer) als hebräische Version aller 39 Bücher.

`compare.py` vergleicht ihn Wort für Wort mit dem Leningradensis (Westminster/OSHB) und schreibt
`aleppo-diff/<Buch>.js` für den Apparatzeugen „MA“ (`library-textcrit-aleppo.js`). Abgeglichen wird je Kapitel,
weil die Verstrennung abweicht (Dekalog, 1 Sam 24, Jer 31). Arten: Konsonanten, plene/defektiv, Vokale, Akzente,
Wortbestand. Nicht gezählt: das Ketiv der OSHB (MAM druckt nur das Qere), Qamets qatan, CGJ und Varika von MAM,
Paseq, Meteg/Ga'ya, die Vokalisierung des Gottesnamens, doppelt gesetzte prä-/postpositive Akzente, die
Kodierung von Paschta/Qadma, Zarqa und Galgal.

Stand: 107 Konsonanten, 807 plene/defektiv, 838 Vokale, 854 Akzente, 76 Wortbestand.

MAM ist eine Ausgabe: Wo der Aleppo-Kodex verloren ist (Tora bis Dtn 28:16, 2 Kön 14:21–18:13, Jer 29:9–31:34,
32:2–13, Am 8:13–Mi 5:1, Zef 3:20–Sach 9:17, Hld ab 3:11, Koh, Klgl, Est, Dan, Esra, Neh), folgt sie anderen
tiberischen Handschriften; der Apparat markiert diese Stellen mit *.
