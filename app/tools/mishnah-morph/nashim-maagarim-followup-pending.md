# Naschim: ausstehende Ma’agarim-Folgeprüfungen

**Laufender partieller Snapshot. Keine neue Ma’agarim-Prüfung durchgeführt.**
Entwurf: `2cc7eaae7b94de668634b588b116422c7e8d32f0`; Vergleichs-SHA256: `6d94c5947253426212afbd3192bbaaa8c3d2b3a07c2e5de6a016ef41457e290e`.

4098 eindeutige Quellpositionen, 4104 zugehörige Bildbeobachtungen. Überschneidende Bilder sind je Quell-ID zusammengefasst; die Queue ist keine Zahl bewiesener Fehler.

| Priorität | Positionen | Zweck |
| --- | ---: | --- |
| 1 | 95 | Stamm-/Person-Konflikte gegen sämtliche vollständigen Kandidaten |
| 2 | 2356 | Potenzielle Lemma-Konflikte sowie Lesungs-/Zuordnungsfragen |
| 3 | 1647 | Unbestimmte oder partielle nominale Kandidaten |

Alle sourceIDs, Referenzen, Quell-Offsets/-Hashes, Kandidaten, Roh-Lex-/Tag-Zeilen, Bild-SHAs und Prüfgründe stehen in `nashim-maagarim-followup-pending.json`. Zuerst echte Lesungs-/Segmentierungsprobleme klären, dann die konkrete Ma’agarim-Stelle suchen. Nicht gelieferte Flexionsmerkmale bleiben offen.

Die Liste ist aus dem vorhandenen partiellen Accordance-Vergleich erzeugt. Sie zertifiziert keine Lesung und keine Morphologie. Oberflächen-/Zitierlemma-Konventionen können scheinbare Konflikte erklären. Noch nicht beobachtete oder unklassifizierte Formen wurden nicht als Nomen erraten. Kein biblisches Wörterbuch benutzt.

Regenerieren nach Abschluss des Vergleichs: `node app/tools/mishnah-morph/build-moed-maagarim-followup.cjs --seder=nashim`. Bei anderem Entwurfscommit muss die ausdrücklich deklarierte Snapshotbasis angepasst werden.

| Traktat | Folgepositionen |
| --- | ---: |
| Mishnah Gittin | 553 |
| Mishnah Ketubot | 850 |
| Mishnah Kiddushin | 335 |
| Mishnah Nazir | 422 |
| Mishnah Nedarim | 551 |
| Mishnah Sotah | 617 |
| Mishnah Yevamot | 770 |
