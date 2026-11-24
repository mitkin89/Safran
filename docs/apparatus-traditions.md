# Jüdische Auslegung im Apparat

Die Lesartensuche bietet vier Gruppen. Der Filter lässt sich mit Buch, Zeuge, Art und Volltext kombinieren. Eine Lesart kann mehrere Merkmale tragen. Die Anzeige nennt im Hinweis zum Merkmal die Einordnung, die Quelle und gegebenenfalls das Ergebnis des Quellenvergleichs.

Die redaktionellen Einträge liegen in `textcrit-traditions-data.js`. Ein Schlüssel enthält Zeuge, Ausgabe oder Buch, Vers, Lesarttyp, MT-Positionen, syrische Positionen und die Position eines Zusatzes. Für die Hexapla wird der Schlüssel aus `hexapla-vorlage.js` verwendet. Einträge bleiben bei einer Umformulierung der Erläuterung erhalten. Bei Änderungen an Wortpositionen prüft der Test, ob jeder Eintrag noch eindeutig auflösbar ist.

Für die weitere Einordnung mit Claude erhält jede tatsächlich von Claude erstellte Zuordnung `author: "Claude"` und eine konkrete Quelle. Für einen durchgeführten Quellenvergleich lässt sich zusätzlich `check: "source-checked"` setzen und in `de` und `en` erläutern, worin die Übereinstimmung besteht. Aussagen zur jüdischen Auslegung können mehrere Gruppen berühren. „Gemeinsam mit den Targumim“ setzt die Übereinstimmung in einem konkreten Punkt der Lesart voraus.

Die erste Einordnung stammt von Codex. Die zehn bis dahin ungeprüften Vergleiche in den Propheten wurden mit der aramäischen Fassung *Mikraot Gedolot* von Targum Jonathan bei Sefaria verglichen. Jesaja 10,27 teilt die messianische Deutung, Habakuk 3,13 die Ewigkeitsformel. Die jeweiligen Unterschiede stehen eigens beim Beleg.

Verglichene Quellstellen im Targum Jonathan

- [Joshua 14:6](https://www.sefaria.org/Targum_Jonathan_on_Joshua.14.6)
- [II Samuel 17:17](https://www.sefaria.org/Targum_Jonathan_on_II_Samuel.17.17)
- [I Kings 1:9](https://www.sefaria.org/Targum_Jonathan_on_I_Kings.1.9)
- [I Kings 21:27](https://www.sefaria.org/Targum_Jonathan_on_I_Kings.21.27)
- [I Kings 22:38](https://www.sefaria.org/Targum_Jonathan_on_I_Kings.22.38)
- [Isaiah 6:10](https://www.sefaria.org/Targum_Jonathan_on_Isaiah.6.10)
- [Isaiah 10:27](https://www.sefaria.org/Targum_Jonathan_on_Isaiah.10.27)
- [Ezekiel 7:5](https://www.sefaria.org/Targum_Jonathan_on_Ezekiel.7.5)
- [Obadiah 1:20](https://www.sefaria.org/Targum_Jonathan_on_Obadiah.1.20)
- [Habakkuk 3:13](https://www.sefaria.org/Targum_Jonathan_on_Habakkuk.3.13)

## Quellenvergleich vom 24. November 2026

Der vollständige Bestand der ausformulierten LXX- und Peschitta-Erläuterungen
(13.414 bzw. 11.132) sowie 26.963 Field-Einheiten einschließlich ihrer zugeordneten
Fußnoten wurde nach Auslegungshinweisen durchsucht. Zusätzlich wurden die
59 Hexapla-Einordnungen und die Quelldateien für CATSS, Samaritanus, Kennicott,
Qumran und MAM/Aleppo in die Suche einbezogen. Das ist ein vollständiger
**Suchdurchlauf**, keine individuelle fachliche Verifikation jeder Lesart.
Die zusätzlichen Zeugen enthalten überwiegend Textbefunde und Handschriftenangaben.
Erwähnungen eines Targums oder rabbinischen Wörterbuchs sind für sich keine Auslegung.

26 Zuordnungen wurden an konkreten Primärtexten verglichen: **22 neue Merkmale**
und **vier präzisierte, zuvor nicht am Quelltext geprüfte Merkmale**. Darunter sind
neun neue halachische oder aggadische Zuordnungen und 13 neue Targum-Parallelen.
Eine Lesart kann mehrere Merkmale haben; dies sind keine 26 neuen Textvarianten.
Die bisherigen sieben geprüften Halacha-/Aggada-Belege bleiben erhalten.

Beispiele:

- Exodus 21,2: jüdischer Knecht, verglichen mit Raschi zu Exodus 21,2.
- Numeri 4,20: Bedecken der heiligen Geräte, verglichen mit Raschi und Onkelos.
- Exodus 12,40: Aufenthalt auch außerhalb Ägyptens, verglichen mit Megilla 9a.
  „Kanaan“ und „andere Länder“ sowie die Zahlenangaben sind nicht identisch.
- Deuteronomium 32,24: Dämonendeutung, verglichen mit Pesachim 111b und Onkelos.
- 1 Samuel 13,1: Sauls Unschuld wie die eines einjährigen Kindes, in Fields
  Fußnote zu Symmachus/Theodoret; Parallele in Joma 22b und Targum Jonathan.
- Psalm 48,15: Aquilas „Welt ohne Tod“, belegt in Jerusalemer Talmud Megilla 2,4
  und Wajikra Rabba 11,9. Die Frage nach dem ursprünglichen griechischen Wortlaut
  bleibt offen.
- Exodus 21,22: Philons Rechtsauslegung zu geformtem/ungeformtem Fötus
  (*De specialibus legibus* III 108–109). Die Kennzeichnung nennt ausdrücklich
  hellenistisch-jüdische Rechtsauslegung und behauptet keinen rabbinischen Konsens.

Die neuen Field-Merkmale sind an den exakten Wortlaut einer einzelnen Einheit
gebunden und nennen ihre Fußnotennummer. In Exodus 35,22 betrifft der Vergleich
Fields Hinweis auf den **Graeco-Venetus**, nicht die LXX-Zeile. Diese Fußnotenvergleiche
sind auch in der Lesartensuche als „Quellenvergleich (Field)“ filterbar. Sie zählen
nicht als gemeinsame LXX-/Peschitta-Abweichung und bescheinigen keine Sicherheit
rekonstruierter griechischer Lesarten.

Eine bloß aus der vorhandenen Erläuterung übernommene Halacha-Kennzeichnung zu
Exodus 16,29 wurde zurückgenommen: Eine konkrete jüdische Quelle für die Beschränkung
auf die Haustür ist damit nicht nachgewiesen. Der syrische Textbefund bleibt erhalten.
Weitere Vorschläge werden nicht automatisch bestätigt: Bei Exodus 23,19 und
Kohelet 12,5 verwirft Field die herangezogene Hypothese; ein Eintrag unter
Levitikus 23,39 behandelt tatsächlich 23,40 und hat zusätzlich eine umstrittene
Aquila-Zuschreibung. Der falsche Anker wurde hier nicht durch eine neue Kennzeichnung
überdeckt.

Reproduzierbare Arbeitsgrundlage:

- `tools/textcrit/traditions/reviewed.json`: einzelne Entscheidungen, Quellstellen,
  kurze Originalbelege, Quellenfassungen und Prüfsummen; Autorschaft Codex.
- `tools/textcrit/traditions/screening.json`: alle durchsuchten Dateien mit Prüfsummen
  und Trefferliste. `unconfirmed` bedeutet lediglich Suchtreffer, keinen bestätigten
  oder bereits widerlegten Auslegungsvergleich. Viele Treffer sind Eigennamen,
  Sabbat-Erwähnungen oder rein lexikalische Hinweise.
- `node tools/textcrit/traditions/apply.cjs --check` prüft die Übernahme der
  freigegebenen Metadaten. Ohne `--check` schreibt das Skript nur die Merkmaldatei.
- `node tools/textcrit/traditions/scan.cjs --check` prüft den Suchbericht gegen die
  aktuellen Quelldateien; ohne `--check` aktualisiert es den Bericht. Die Suche ist
  vollständig offline und vergibt keine Merkmale.

„Am Quelltext geprüft“ heißt: Der konkret beschriebene gemeinsame Auslegungspunkt
wurde im angegebenen Quelltext gefunden. Es bedeutet weder eine unabhängig
abgesicherte Edition der alten Übersetzung noch den Nachweis ihrer Abhängigkeit
vom späteren rabbinischen Text. Unbestätigte Suchtreffer bleiben als Arbeitsliste
erhalten und erscheinen nicht als neue jüdische Auslegungen im Apparat.
