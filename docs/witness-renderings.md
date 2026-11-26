# Samaritanus und Peschitta in der Wortkarte

Die Wiedergaben verwenden weiterhin nur die vorhandenen Interlinear-Zuordnungen zu einem einzelnen Westminster-Wort. Gezählt wird jedes Vorkommen, auch mehrmals im selben Vers. Die Zuordnungen sind keine unabhängige Garantie, dass jede seltene Wiedergabe semantisch richtig zugeordnet ist.

Die Hauptliste gruppiert jetzt nach **belegten Lexemen der jeweiligen Fassung**. Beim Samaritanus stammen sie aus den eigenen CACCHT-Wortanalysen; bei der Peschitta aus passenden ETCBC-Analysen und bereits vorhandenen, an Ausgabe, Wort-ID, Schreibweise und native Verszählung gebundenen lexikalischen Ergänzungen. Homonymmarker bleiben Bestandteil des Gruppenschlüssels. Die Gruppierung entfernt keine Vorsilben anhand der Schreibweise und übernimmt kein Lemma aus dem hebräischen Vergleichstext.

Wortformen ohne eine solche sichere lexikalische Zuordnung sowie mehrteilige Wortgruppen bleiben in getrennten, zunächst eingeklappten Abschnitten. Die Übersicht zählt Lemmata, offene Wortformen und Wortgruppen getrennt. Aufgeklappte Gruppen zeigen alle Originalformen mit Häufigkeiten und die ursprünglichen Formen an den Fundstellen; auch im Vergleich zweier Fassungen bleiben die Originalformen erhalten.

Beispiel Wasser (Strong 4325): Die 204 Samaritanus-Belege mit 19 Formen bilden ein Lexem. Bei der Peschitta bleiben alle 535 Belege erhalten; 427 gehören zum lexikalisch belegten Wasser-Lexem. Andere Lexeme, offene Formen und Wortgruppen werden nicht aufgrund ähnlicher Schreibweise damit vereinigt.

`app/tools/interlinear/witness-renderings.cjs` erzeugt `app/witness-ren.js`. Die bisherigen Rohform-Indizes bleiben unverändert erhalten; `groups` ergänzt die lexikalische Gruppierung. Jede gruppierte Zelle behält zusätzlich ihre Originalform. Die Korpusprüfung in `app/tests/witness-renderings.test.js` vergleicht für beide Fassungen jede Kombination aus Form, hebräischer Morphologie, Versreferenz und Häufigkeit einschließlich Wiederholungen mit dem Rohform-Index.
