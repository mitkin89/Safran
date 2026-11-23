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
