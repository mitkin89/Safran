# IV: Schnitte für einzelne kanonische Rahlfs-Verse

`canonical-iv-de.json` enthält die 15 Grenzkorrekturen mit mehreren griechischen
Zielversen (33 Zielverse) und zusätzlich die Kapitelgrenze Deutsch 7:24 →
Griechisch 8:1. Quellslots sind **1-basiert**, Zeichenoffsets entsprechen
JavaScript-Stringindizes (UTF-16), das Ende ist exklusiv. Die optionale vierte
Zahl bezeichnet das Quellkapitel, sonst gilt `chapter`.

Die Schnitte wurden anhand des vollständigen deutsch-griechischen Wortlauts
bestimmt. Jeder verwendete Quellslot ist mit allen ursprünglichen Zeichen und
Fußnoten genau einmal abgedeckt; die Schnitte selbst liegen außerhalb der
Fußnotenkörper und ihrer Markierungen.

| Kapitel | Kanonische Verse | Schnitt |
|---|---|---|
| 1 | 5 / 6 | Vor „Denn nicht“; „etwas Lächerliches“ gehört noch zu griechisch 5 |
| 2 | 12 / 13 / 14 | Kinder / Freunde / Feindesliebe und feindlicher Besitz |
| 5 | 6 / 7 | Rettung durch Kosten / Alter und Graukopf |
| 5 | 10 / 11 | Missachtung des Königs / Erwachen aus der Philosophie |
| 8 | 5 / 6 | Angebot der Freundschaft / Bestrafen und Wohltaten |
| 9 | 23 / 24 | Bruderbund / heiliger Kriegsdienst und Sühne |
| 10 | 3 / 4 | Native Slots getrennt; griechisch 4 ist in den gelieferten Daten leer |
| 10 | 7 / 8 | Skalpieren / sofortiges Herbeiführen zum Rad |
| 11 | 6 / 7 / 8 | Native Slots getrennt; griechisch 7–8 sind in den gelieferten Daten leer |
| 12 | 3 / 4 | Tod der Brüder / Warnung an den Jüngsten |
| 16 | 10 / 11 / 12 | Witwenschaft / fehlender Sohn für das Begräbnis / aber keine Klage |
| 17 | 21 / 22 | Sühneersatz / Blut und Sühnungstod retten Israel |
| 18 | 5 / 6 | Antiochos zieht gegen Persien / Einleitung der Mutterrede |
| 18 | 8 / 9 | Keuschheit / Ehezeit und Tod des Vaters |
| 18 | 18 / 19 | Einleitung des Moselieds / Zitat „Ich werde töten …“ |

Beim Schnitt des Quellslots 1:6 wird dessen äußeres `<b>`-Element geteilt.
Der Renderer sollte den offenen Vorfahren für das zweite Fragment nachbilden
bzw. die Fragmente mit ausgeglichenen Hüllen darstellen; die gespeicherten
Offsets verändern keine Quellzeichen. Die Fußnote zur Rede in 18:6 wird
vollständig beim kanonischen Vers 6 belassen.

Leere griechische Datenfelder werden hier nicht ergänzt und sind keine
Aussage über sämtliche griechischen Handschriften oder den gedruckten Rahlfs.
