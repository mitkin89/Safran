# Moed: ausstehende Ma’agarim-Folgeprüfungen

**Laufender partieller Snapshot. Keine neue Ma’agarim-Prüfung durchgeführt.**
Entwurf: `7c432dc12eab2a7e46cc5a3de0656e9a719a21fb`; Vergleichs-SHA256: `76760a46925220f7aa4d7674595597624088e518f95fbc2a5c1bcd4be3cda92a`.

4674 eindeutige Quellpositionen, 5109 zugehörige Bildbeobachtungen. Überschneidende Bilder sind je Quell-ID zusammengefasst; die Queue ist keine Zahl bewiesener Fehler.

| Priorität | Positionen | Zweck |
| --- | ---: | --- |
| 1 | 57 | Stamm-/Person-Konflikte gegen sämtliche vollständigen Kandidaten |
| 2 | 2257 | Potenzielle Lemma-Konflikte sowie Lesungs-/Zuordnungsfragen |
| 3 | 2360 | Unbestimmte oder partielle nominale Kandidaten |

Alle sourceIDs, Referenzen, Quell-Offsets/-Hashes, Kandidaten, Roh-Lex-/Tag-Zeilen, Bild-SHAs und Prüfgründe stehen in `moed-maagarim-followup-pending.json`. Zuerst echte Lesungs-/Segmentierungsprobleme klären, dann die konkrete Ma’agarim-Stelle suchen. Nicht gelieferte Flexionsmerkmale bleiben offen.

Die Liste ist aus dem vorhandenen partiellen Accordance-Vergleich erzeugt. Sie zertifiziert keine Lesung und keine Morphologie. Oberflächen-/Zitierlemma-Konventionen können scheinbare Konflikte erklären. Noch nicht beobachtete oder unklassifizierte Formen wurden nicht als Nomen erraten. Kein biblisches Wörterbuch benutzt.

Regenerieren nach Abschluss des Vergleichs: `node app/tools/mishnah-morph/build-moed-maagarim-followup.cjs`. Bei anderem Entwurfscommit muss die ausdrücklich deklarierte Snapshotbasis angepasst werden.

| Traktat | Folgepositionen |
| --- | ---: |
| Mishnah Beitzah | 243 |
| Mishnah Chagigah | 149 |
| Mishnah Eruvin | 700 |
| Mishnah Megillah | 218 |
| Mishnah Pesachim | 610 |
| Mishnah Rosh Hashanah | 238 |
| Mishnah Shabbat | 648 |
| Mishnah Shekalim | 548 |
| Mishnah Sukkah | 422 |
| Mishnah Ta'anit | 267 |
| Mishnah Yoma | 479 |
| Mishnah Moed Katan | 152 |
