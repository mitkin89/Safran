# Makkabäer I: deutsche Schnittgrenzen für die Rahlfs-Verszählung

`canonical-i-de.json` enthält 86 Überschreibungen für die zuvor mehrere griechische
Verse umfassenden Abschnittsgruppen, nun aufgeteilt in 213 einzelne kanonische
Verse. Die 127 inneren Grenzen wurden anhand des Inhalts der deutschen
Kautzsch-Fassung mit der unabhängig nummerierten Menge-Fassung (1939) und den
Rahlfs-Grenzen verglichen. Es werden weder Textlängen interpoliert noch neue
Übersetzungen eingefügt. Quellen und der Sonderfall Menge 12:53–54/Rahlfs 12:53
stehen in `maccabees-i-notes.json`.

Jeder `parts`-Eintrag ist `[nativeStelle, start, end]` mit nullbasierten
JavaScript-/UTF-16-Offsets in der unveränderten rohen HTML-Zeichenkette;
`end` ist exklusiv. `parts[0]` gehört dem ersten in `greek` angegebenen Vers,
die folgenden Listen den jeweils nächsten Versen. Mehrere native Stücke werden
in ihrer vorhandenen Reihenfolge zusammengesetzt. Die Fußnoten und ihre Marker
bleiben an ihren Bezugswörtern. Alle inneren Schnitte liegen außerhalb von
HTML-Auszeichnungen; vor dem kursiven Wort »Sie« in 5:62 liegt der Schnitt vor
`<i>`, damit das Wort seine Auszeichnung behält.

Eine Grenze berührt eine zuvor einzeln projizierte Nachbarzeile: Der deutsche
Eintrag 2:34 endet mit »Und sie sprachen zu ihnen:«. Dies gehört zum kanonischen
Vers 2:33 und wird deshalb zusammen mit dem nativen Eintrag 2:35 diesem Vers
zugeteilt. Die entsprechende Überschreibung reicht über Rahlfs 2:29–33 und die
nativen Stellen 2:30–35. Sie ersetzt auch die bisherige automatische Zeile 2:33.

Die Grenzen bilden Übersetzungsabschnitte ab. Satzteile können dabei über die
Versgrenze hinweg weiterlaufen; ihre Wortstellung und Zeichensetzung werden
nicht verändert. Der vorhandene leere deutsche Eintrag 13:19 bleibt unergänzt
und wird durch die Einzelversprojektion als fehlender Text zu Rahlfs 13:20
gekennzeichnet.

Geprüft: alle 86 mehrversigen Gruppen aus allen 16 Kapiteln; jede betroffene
native HTML-Zeichenkette lässt sich durch Verkettung ihrer Teilstücke bytegleich
wiederherstellen. Alle Start-/Endwerte wurden zusätzlich in Node gegen die
JavaScript-Stringlängen geprüft. Keine offene Schnittgrenze innerhalb dieser
86 Gruppen.
