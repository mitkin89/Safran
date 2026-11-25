# Peschitta-Lesarten gegenüber dem MT (Apparat) – Probelauf Genesis

Jedes Arbeitsblatt `sheets/Genesis-N.txt` enthält Verse, deren Peschitta-Wortzuordnung eine inhaltliche Begründung hat. Je Vers stehen dort:

- `H:` die MT-Wörter, nummeriert ab 1.
- `S:` die Peschitta-Wörter, nummeriert ab 1. Nach `=>` steht, welchen H-Nummern das Wort zugeordnet ist; `+` heißt, dass es kein Gegenstück im MT hat (Zusatz).
- `Notiz:` die englische Begründung aus der Zuordnung.

## Aufgabe

Halte für jeden Vers die **textkritisch oder exegetisch bedeutsamen Abweichungen** der Peschitta vom MT als strukturierte Einträge fest. Prüfe die Notiz am Text: Sie kann unvollständig oder falsch sein.

**Nicht aufnehmen** sollst du rein grammatische oder idiomatische Unterschiede ohne Bedeutungsunterschied. Dazu gehören:

- Kopula ܗܘ, ܕ-Konstruktionen statt Status constructus, fehlendes oder zusätzliches „und“;
- Pronomen, die die Syntax verlangt, Akkusativ-את, ܠ-Objekt;
- Singular oder Plural, wenn nur idiomatisch bedingt.

Ausnahme: Solche Kleinigkeiten nimmst du doch auf, wenn eine andere hebräische Vorlage naheliegt, weil der Unterschied z. B. mit LXX oder Samaritanus übereinstimmt.

## Ausgabe

Schreibe `out/Genesis-N.json`. Jeder Vers des Blatts braucht einen Schlüssel; Verse ohne bedeutsame Abweichung bekommen `[]`.

```json
{"2:2": [{"he":[5,6], "sy":[5,6], "type":"lesart", "vorlage":"ביום הששי", "note":"„am sechsten Tag“ statt „am siebten Tag“", "sure":true, "parallel":""}],
 "4:8": [{"he":[], "sy":[6,7], "type":"zusatz", "vorlage":"נלכה השדה", "note":"Kain sagt: „Lass uns aufs Feld gehen“", "sure":true, "parallel":""}],
 "1:1": []}
```

Die Felder:

- `he`: betroffene MT-Wortnummern. `[]` heißt, es gibt keine (bei einem reinen Zusatz).
- `sy`: betroffene Peschitta-Wortnummern. `[]` heißt, es gibt keine (bei einer reinen Auslassung).
- `type`: genau eine Art der Abweichung, siehe unten.
- `vorlage`: erschlossene hebräische Vorlage in unpunktierten Konsonanten. Nur bei `lesart`, `deutung`, `zusatz`, `zahl` und `name`, wenn sie sinnvoll erschließbar ist; sonst `""`.
- `note`: kurze deutsche Erklärung für den Apparat (ein Satz), Zitate in „…“.
- `sure`: `true`, wenn die Deutung klar ist; `false` bei einer Vermutung.
- `parallel`: Parallelstelle, an die angeglichen wurde, z. B. `"Dtn 1:39"`; sonst `""`.

### Arten der Abweichung (`type`)

- `lesart`: andere Konsonanten in der Vorlage oder Verlesung, z. B. ארם→אדם, אחר→אחד, ד/ר.
- `deutung`: gleiche Konsonanten, aber anders vokalisiert, abgeleitet oder getrennt, z. B. המטה „Bett“ → „Stab“; שילה als שלו.
- `zusatz`: Plus ohne erkennbare Parallele, also eine erklärende oder ergänzende Erweiterung.
- `auslassung`: Minus. Wenn erkennbar, nenne die Ursache in `note`, z. B. Homoioteleuton.
- `harmonisierung`: Plus, Minus oder Änderung nach einer Parallelstelle (`parallel` angeben).
- `technik`: bewusste Übersetzungsentscheidung ohne andere Vorlage, z. B. Umschreibung, Anthropomorphismus vermieden, אלהים → „Engel“, Euphemismus, Aktualisierung von Orts- oder Volksnamen (Kaftor → Kappadokien).
- `doublette`: Doppelübersetzung.
- `umstellung`: deutlich andere Wortfolge mit Bedeutungsfolge, oder ein Satzteil wandert über die Versgrenze.
- `zahl`: abweichende Zahl oder abweichendes Datum.
- `name`: abweichende Namensform, die keine bloße Lautwiedergabe ist, z. B. Rekem für Kadesch, Reuel für Deuel.
- `syrfehler`: wahrscheinlich innersyrischer Abschreibfehler.

## Ablauf

- Arbeite den ganzen Bogen durch, Vers für Vers.
- Schreibe nur in `/home/claude/peshitta-readings/out/`. Keine Hilfsdateien anderswo, kein `rm`, nichts in `/home/claude/safran` ändern.
- Prüfe mit `python3 /home/claude/peshitta-readings/check.py Genesis-N`, bis die Prüfung `OK` meldet.
