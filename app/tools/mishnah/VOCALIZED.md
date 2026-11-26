# Vier Vergleichszeilen unter der vokalisierten Kaufmann-Lesefassung

Die Reihenfolge lautet:

1. Vokalisierte Ausgabe: „Mishnah based on the Kaufmann manuscript, edited by Dan Be’eri“.
2. Kaufmann A50: die eigenständige, weitgehend unvokalisierte Digital-Mishnah-Transkription.
3. Parma, de Rossi 138.
4. Cambridge Add. 470.1.

Die Kaufmann-Zeile stammt aus der Projektdatei `S07326.xml`, nicht aus einer
Entfernung der Vokalzeichen der Be’eri-Ausgabe. Ihre gelegentlichen originalen
Punktierungen, Korrekturen, Abkürzungen und Lücken bleiben erhalten.

## Umfang und Verfahren

Alle 63 Traktate, 525 Kapitel und 190.841 Wortpositionen der vokalisierten Ausgabe
sind eingebunden. Ihr vollständiger Text, die Vokalisierung, Interpunktion,
Wortpositionen und die bestehenden Seraim-Wortkarten bleiben unverändert.
Es werden keine morphologischen Analysen auf Handschriftenzeilen übertragen.

Die Projektaufbereitung und CollateX vergleichen die vier Textstände gemeinsam,
kapitelweise. Die Daten verwenden intern `K` für die vokalisierte Basis,
`D` für Digital-Mishnah-Kaufmann, `P` für Parma und `C` für Cambridge.
`V00001` bezeichnet synthetische Vergleichstokens der Lesefassung, keine
Handschriften-Wort-IDs. Der Editionspfad und der Fingerprint werden vor dem
Verwenden eines Vergleichs geprüft.

| Zeuge | Quellenpositionen | an Basis gebunden | Zusätze | Lückenpositionen | Quellenkommentar | offen |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Digital-Mishnah-Kaufmann | 188.096 | 185.948 | 2.001 | 125 | 16 | 6 |
| Parma | 190.836 | 183.680 | 3.269 | 54 | 3.773 | 60 |
| Cambridge | 185.619 | 180.363 | 5.202 | 41 | 0 | 13 |

Die Zahlen beschreiben automatische Platzierungen, keine philologische
Gewissheit. Zusätze haben hier kein Gegenstück im automatischen Vergleich.
Alle **79 offenen Positionen** bleiben gesondert sichtbar; sie werden nicht
erraten oder verworfen. Quellenkommentare stehen aufklappbar unter dem
betreffenden Abschnitt. Die Details und offenen Positionen je Traktat stehen
in `project-corpus-audit.json`.

## Bedienung und Abdeckung

Die Handschriftenauswahl schaltet Digital-Mishnah-Kaufmann, Parma und Cambridge
einzeln. Bestehende Einstellungen werden beim ersten Verwenden um die neue
Kaufmann-Zeile ergänzt. „Keine“ zeigt den normalen Lesetext mit seinen bisherigen
Wortkarten. Die neue Auswahl bleibt unabhängig von separat geöffneten Versionen.

Cambridge fehlt in Demai. In Keritot 4 ist die vokalisierte Basis vorhanden,
obwohl der diplomatische Kaufmann dort fehlt. Avot 6 zeigt die Lesefassung mit
einem Hinweis auf die fehlenden Projektzeugen. Diese Quellenlücken werden
nicht als textliche Auslassungen klassifiziert.

Die Originaltranskriptionen behalten die Quellen- und Lizenzangaben aus
[CORPUS.md](CORPUS.md). Die Lesefassung behält ihre bisherigen Metadaten und
Rechte. Sie wird nicht als Digital-Mishnah-Transkription umbenannt.

## Reproduktion und Prüfung

`build_vocalized.py` verwendet die vorbereiteten, editionsgebundenen
Projektkollationen. [CORPUS.md](CORPUS.md) beschreibt den vollständigen Neubau.

```
node --test app/tests/mishnah-vocalized.test.js app/tests/mishnah-textcrit-corpus.test.js
```

Die Prüfungen kontrollieren alle Wortpositionen und alle drei Quellenzeilen in
sämtlichen Kapiteln. Electron öffnet alle 63 Traktate und prüft Reihenfolge,
Worterhaltung, Randkommentare und die genannten Abdeckungslücken.
