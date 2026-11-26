# Interlinear auf der vokalisierten Kaufmann-Lesefassung

Die Hauptansicht verwendet jetzt die in Safran vorhandene Ausgabe
„Mishnah based on the Kaufmann manuscript, edited by Dan Be’eri“ als Bezugstext.
Parma und Cambridge werden **direkt gegen diese Ausgabe** verglichen; die
Zuordnungen gegen die Digital-Mishnah-Kaufmann-Transkription werden nicht
übertragen. Der alte diplomatische Quellenbestand bleibt unverändert für
Quellenansicht, Apparat und Tosefta-Verknüpfungen erhalten.

## Umfang und Grenzen

Alle 63 Traktate, 525 Kapitel und 190.841 laufenden Wortpositionen der
vokalisierten Lesefassung sind eingebunden. Wortprojektion und Tokenisierung
verwenden dieselben Funktionen wie die bestehenden Wortkarten. Der gesamte
Originaltext bleibt unverändert gespeichert. In der Interlinearzeile bleiben
Vokalisierung und die Interpunktion der projizierten Haupttexte erhalten.
Editorische Anmerkungen werden nicht als Mischna-Wörter gezählt.

| Zeuge | Quellenwörter | an Basiswörter/-gruppen gebunden | Zusätze | offen |
| --- | ---: | ---: | ---: | ---: |
| Parma | 190.836 | 177.084 | 4.563 | 9.189 |
| Cambridge | 185.619 | 168.445 | 2.007 | 15.167 |

Jedes Quellenwort wird einmal gezeigt. „Vollständig eingebunden“ bedeutet
nicht, dass jedes Wort sicher zugeordnet ist. Nur Verbindungen, die in allen
optimalen Vergleichspfaden vorkommen, werden übernommen; Wiederholungsambiguität
und beschädigte oder unverbundene Lesarten bleiben offen. Der Vergleich erfolgt
kapitelweise, ohne gleiche Mischnanummern als Wortgleichheit vorauszusetzen.
Die zwei früheren Berakhot-Korrekturen gegen den diplomatischen Kaufmann-Text
werden nicht auf die andere Ausgabe übertragen. Das Verfahren ist maschinell,
keine vollständig philologisch geprüfte Edition.

Cambridge fehlt weiterhin in Demai. In Keritot 4 ist nun ein Bezugstext aus
unserer vokalisierten Lesefassung vorhanden, obwohl die diplomatische
Digital-Mishnah-Kaufmann-Quelle dort eine Abdeckungslücke hat. Avot 6 zeigt
unseren vorhandenen Lesetext; die fehlenden Parma-/Cambridge-Texte werden als
Abdeckungslücken gekennzeichnet, nicht als Auslassungen.

Die vorhandenen Wortkarten bleiben auf die exakt passende Be’eri-Ausgabe und
den bisher unterstützten Seder Seraim beschränkt. Handschriftenzeilen erhalten
keine übertragenen morphologischen Analysen. Auch außerhalb Seraims erscheint
jedes Basiswort interlinear, ohne damit bereits eine Wortbestimmung zu besitzen.

## Bedienung und Herkunft

Die Handschriftenauswahl verwendet die vokalisierte Lesefassung. Eine gespeicherte
Auswahl der alten Digital-Mishnah-Kaufmann-Version wird bei verfügbarer
Lesefassung darauf umgestellt. Parma und Cambridge sind einzeln schaltbar.
„Keine“ zeigt wieder den normalen Lesetext mit seinen Wortkarten. Im
Apparatfenster verwendet die Interlinearansicht ebenfalls die vokalisierte
Basis; diplomatischer Apparat und Tosefta behalten ihre bezeichnete
Digital-Mishnah-Zählung.

Die Quellen für Parma und Cambridge sowie deren Original-IDs und Original-TEI
bleiben die in [CORPUS.md](CORPUS.md) dokumentierten, gepinnten Digital-Mishnah-Dateien
unter CC BY 4.0. Die Lesefassung behält ihre bisherigen Metadaten und Rechte;
sie wird nicht als Digital-Mishnah-Transkription umbenannt oder lizenziert.
`vocalized-audit.json` dokumentiert Zahlen, Editionspfade und Text-Fingerprints.

## Reproduktion und Prüfung

```
python app/tools/mishnah/build_vocalized.py
node --test app/tests/mishnah-vocalized.test.js
```

Der Build benötigt Node, Python und g++ und arbeitet mit den bereits gebündelten
Quellen ohne Netzwerk. Die Datensätze in `mishnah-vocalized/*.js` werden nur für
den geöffneten Traktat geladen. Die Prüfung kontrolliert alle Wortpositionen,
Quellfingerprints und vollständige, duplikatfreie Darstellung beider Handschriften
in sämtlichen Kapiteln. Electron prüft alle 63 Traktate, die genannten Lückenfälle,
alle 23.447 Seraim-Wortkartenpositionen sowie die Berakhot-Bedienabläufe.
