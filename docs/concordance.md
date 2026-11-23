# Werkübergreifende Konkordanz

Unter **Suche → Werkübergreifende Konkordanz** ein einzelnes Wort eingeben. In der **Wortkarte → Konkordanz** erscheinen Belege mit Kontext und zugeordneten Entsprechungen direkt neben dem Lesetext. Über den Knopf zur Suche stehen der Werkfilter und der CSV-Export zur Verfügung.

- **Wortform:** ganze Wörter, unabhängig von Großschreibung und hebräischen, griechischen beziehungsweise syrischen Vokal-/Akzentzeichen. Lateinische Umlaute bleiben unterschieden. Keine Teilwortsuche und kein automatisches Abschneiden von Vorsilben.
- **Grundform (wo belegt):** zusätzlich die eingegebene Grundform mit vorhandenen Wortanalysen vergleichen. Unterstützt Westminster/OSHB, passende Septuaginta-Fassungen, eingebettete OGA-Analysen bei Josephus/Philo und ETCBC-Peschitta-Analysen. Nicht passende oder fehlende Analysen werden nicht ergänzt. Solche Stellen bleiben nur über die Wortform auffindbar. Die Eingabe ist keine automatische Auflösung einer beliebigen flektierten Form in alle möglichen Lemmata.
- Jedes Vorkommen erhält eine eigene Zeile mit Originalschreibweise, bis zu sieben Kontextwörtern auf jeder Seite, Werk, Fassung und ursprünglicher Stellenzählung. Anklicken öffnet die Fundstelle im Leser.
- Häufigkeiten zählen alle durchsuchten Belege, auch bei begrenzter Anzeige. Verschiedene Fassungen zählen getrennt; Zahlen sind keine sprachübergreifenden Äquivalenzzählungen. Abbruch und unlesbare Dateien werden angezeigt.
- Die Übersicht zeigt zunächst höchstens 25 Vorkommen je Quelldatei und insgesamt 1.000. Ein Werkfilter erhöht die Anzeige auf bis zu 500 je Datei. Es findet keine Hochrechnung statt.
- Kategorien und Werkauswahl grenzen die lokalen Texte ein. Nicht heruntergeladene Werke sind nicht enthalten. Fußnoten und als `small` ausgezeichnete Zählungshinweise sind ausgeschlossen.
- CSV exportiert die **angezeigten** Belege mit Wortposition und Analysequelle. Suchverlauf und Favoriten bewahren den Konkordanzmodus.

Griechische und syrische eingebettete Analysen werden nur bei passendem Quelltext-Hash und passenden Wortfolgen verwendet. OGA ist als Quelle gekennzeichnet und kann automatische Analysen enthalten. Eine gemeinsame Schreibweise kann verschiedene lexikalische Einträge vertreten; die Konkordanz behauptet keine Bedeutungsidentität und setzt eine Wortzuordnung nicht mit allgemeiner Bedeutungsidentität gleich.


## Sprachübergreifende Entsprechungen

Die aktivierte Option **Sprachübergreifende Entsprechungen** ergänzt zu angezeigten Bibelbelegen die zugeordneten Wörter des Westminster-MT, der Septuaginta (CATSS) und der ETCBC-Peschitta. Der Einstieg funktioniert aus allen drei Sprachen. Ein Klick auf die Entsprechung öffnet ihre eigene Quelle und Zählung. CSV enthält diese Verknüpfungen in einer zusätzlichen Spalte.

Die Verbindung erfolgt über dieselbe MT-Wortposition, nicht über ähnliche Wörterbuchglossen. CATSS-Gruppen werden nur verwendet, wenn ihr hebräischer Quelltext vollständig zum betreffenden MT-Vers passt und beide Fassungen dem gebündelten Stand entsprechen. Peschitta-Zuordnungen verlangen passende Quelltext-Hashes, Wortfolgen und originale syrische Wort-IDs; die eigene Peschitta-Zählung bleibt erhalten. Automatische und von Claude geprüfte Peschitta-Zuordnungen sind entsprechend gekennzeichnet.

Entsprechungen sind zusätzliche Hinweise bei **angezeigten** Belegen und werden nicht zu den Vorkommenszahlen addiert. Fehlende oder unpassende Zuordnungen werden nicht geraten. Für Josephus, Philo oder andere Werke ohne solche Paralleltext-Zuordnungen funktioniert weiterhin die werkübergreifende Wortform-/Grundformsuche; aus einer Bibelübersetzung wird keine automatische Bedeutungszuordnung auf sämtliche anderen Werke übertragen.
