# Samaritanus und Peschitta in der Wortkarte

Die Wiedergaben verwenden weiterhin nur die vorhandenen Interlinear-Zuordnungen zu einem einzelnen Westminster-Wort. Gezählt wird jedes Vorkommen, auch mehrmals im selben Vers. Die Zuordnungen sind keine unabhängige Garantie, dass jede seltene Wiedergabe semantisch richtig zugeordnet ist.

Die Hauptliste gruppiert jetzt nach **belegten Lexemen der jeweiligen Fassung**. Beim Samaritanus stammen sie aus den eigenen CACCHT-Wortanalysen; bei der Peschitta aus passenden ETCBC-Analysen und bereits vorhandenen, an Ausgabe, Wort-ID, Schreibweise und native Verszählung gebundenen lexikalischen Ergänzungen. Homonymmarker bleiben Bestandteil des Gruppenschlüssels. Die Gruppierung entfernt keine Vorsilben anhand der Schreibweise und übernimmt kein Lemma aus dem hebräischen Vergleichstext.

Wortformen ohne eine solche sichere lexikalische Zuordnung sowie mehrteilige Wortgruppen bleiben in getrennten, zunächst eingeklappten Abschnitten. Die Übersicht zählt Lemmata, offene Wortformen und Wortgruppen getrennt. Aufgeklappte Gruppen zeigen die Fundstellen direkt. Die vollständige Liste der Originalformen mit Häufigkeiten liegt in einem separat aufklappbaren Abschnitt. Auch im Vergleich zweier Fassungen bleiben die Originalformen erhalten. Die Vorschau verwendet die in der Wortkarte gewählte Fassung, einschließlich Peschitta und Samaritanus.

Beispiel Wasser (Strong 4325): Die 204 Samaritanus-Belege mit 19 Formen bilden ein Lexem. Bei der Peschitta bleiben alle 535 Belege erhalten; 427 gehören zum lexikalisch belegten Wasser-Lexem. Andere Lexeme, offene Formen und Wortgruppen werden nicht aufgrund ähnlicher Schreibweise damit vereinigt.

`app/tools/interlinear/witness-renderings.cjs` erzeugt `app/witness-ren.js`. Die bisherigen Rohform-Indizes bleiben unverändert erhalten; `groups` ergänzt die lexikalische Gruppierung. Jede gruppierte Zelle behält zusätzlich ihre Originalform. Die Korpusprüfung in `app/tests/witness-renderings.test.js` vergleicht für beide Fassungen jede Kombination aus Form, hebräischer Morphologie, Versreferenz und Häufigkeit einschließlich Wiederholungen mit dem Rohform-Index.

## Targum-Fundstellen und Vorschau

Die Targum-Statistik unterscheidet die Lexikon-IDs der ETCBC-Quelle, statt gleich geschriebene Lexeme mit dem Gloss des zuerst gefundenen Eintrags zu vermischen. Unbestimmte Formen erhalten keine erfundene lexikalische Identität. Jede Belegzelle speichert zusätzlich die tatsächliche aramäische Wortform und ihre Position im Quellvers. Die Tabelle zeigt diese Originalform; die Vorschau markiert dieselbe Quellwortposition nach Prüfung der Form. Eine allgemeine Interlinear-Verbindung überschreibt diese Markierung nicht.

`python3 -I app/tools/targum/align.py app --reuse-alignment` baut die Statistik aus den vorhandenen Zuordnungen neu auf. Die Zuordnungen selbst bleiben dabei unverändert; die drei ursprünglichen Vorkommenssummen sind 73.059 (Onkelos), 71.257 (Pseudo-Jonathan) und 74.465 (Neofiti). `app/tests/targum-renderings.test.js` prüft die Quellwortformen und Positionen jedes gespeicherten Belegs.

## Flektierte LXX-Belegformen

Die LXX-Gruppenüberschrift bleibt das griechische Lemma. Jede einzelne Fundstelle zeigt dagegen die belegte Originalform aus der CATSS-Wortgruppe. `lxx-ren.js` speichert dafür als fünftes Zellfeld die Originalformen in der Reihenfolge der Versreferenzen. Der Index enthält 252.548 solcher Vorkommen; Gruppen, Zählungen und Stellen bleiben unverändert. Artikel, Präpositionen und Pronomen werden dabei nach denselben Regeln wie bisher ausgewählt; die Formen selbst werden nicht aus dem Lemma erzeugt.

Beispiel Strong 6754: Unter εἰκών stehen unter anderem εἰκόνα (Genesis 1,27), εἰκόνι (Genesis 9,6) und εἰκόνας (2 Könige 11,18). Im Vergleich zweier Fassungen werden ebenfalls die Originalformen verwendet.

Auch die Paradigmentabelle („Übersetzung unter den Formen“) zählt die gespeicherten Originalformen nach hebräischer Bestimmung und den Belegversen der angezeigten Form. LXX und Targumim verwenden die Vorkommensmetadaten, Peschitta und Samaritanus das Originalformfeld der Zelle. Fehlende Originalformen werden nicht durch ein Lemma ersetzt. Bei Gleichstand zeigt die Tabelle belegte Formen samt Anteilen; die lexikalische Gruppierung der Übersicht bleibt erhalten. Die vorhandenen Motive für Peschitta, Samaritanus und Buber/Rosenzweig erscheinen auch in der Quellenauswahl.
