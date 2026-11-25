# Mechiltha (Winter/Wünsche) – Satz für Satz nach Sefaria segmentieren

Basis: `/tmp/claude-0/-home-claude/d1474eaa-31a4-58a4-8257-4c8068935036/scratchpad/mech/seg/`

Eingabe: `in/jobNN.json` – eine Liste von Blöcken. Jeder Block hat
- `de`: deutscher Text (Wünsche) eines Abschnitts, HTML-Fragment (`<g>…</g>` = gesperrt, Fußnoten als `<sup class="footnote-marker">*</sup><i class="footnote">…</i>`),
- `segs`: die Sefaria-Segmente desselben Abschnitts der *Mekhilta DeRabbi Yishmael* in Reihenfolge, je mit `id`, hebräischem Text `he` (Beeri-Ausgabe) und englischer Übersetzung `en` (Silverstein).

Aufgabe: Teile `de` jedes Blocks so auf die Segmente des Blocks auf, dass jedes deutsche Stück inhaltlich dem Segment entspricht (Satz für Satz nach dem Hebräischen/Englischen).

Regeln:
1. **Text nicht verändern.** Nur schneiden. Jedes Zeichen von `de` kommt genau einmal vor, in derselben Reihenfolge. Die Stücke eines Blocks hintereinandergesetzt (mit je einem Leerzeichen) ergeben wieder `de` (Leerzeichen am Schnitt dürfen wegfallen).
2. Schneiden nur an Satzgrenzen (nach . ? ! : ; oder nach einem schließenden Anführungszeichen/einer Klammer, die einen Satz beendet), nie innerhalb einer Fußnote (`<i class="footnote">…</i>` bleibt beim Wort, an dem sie steht) und nie innerhalb eines `<g>…</g>`.
3. Ein Segment, für das Wünsche nichts hat, bekommt `""`. Hat Wünsche einen Satz, der in Sefaria fehlt (andere Textfassung), hänge ihn an das passende Nachbarsegment.
4. Wünsches Stellenangabe am Anfang eines Lemmas („Kap. 12, 3.“) gehört zum Segment, dessen Lemma dort beginnt.
5. Die Grenzen richten sich nach dem Inhalt: Wo im Hebräischen ein neues Segment beginnt (neuer Lehrsatz, neues Lemma, „דבר אחר“ = „Eine andere Erklärung“, neuer Rabbi), beginnt auch das deutsche Stück. Vergleiche Namen, Bibelzitate und Stichwörter.

Ausgabe: `out/jobNN.json` (dieselbe Nummer), ein JSON-Objekt `{ "<Segment-id>": "<deutsches Stück>", … }` mit **allen** Segment-ids des Auftrags in Reihenfolge. Schreibe die Datei mit einem kleinen Python-Skript (json.dump, ensure_ascii=False). Prüfe danach per Skript Regel 1 (Hintereinandersetzen = `de`, nach Zusammenfassen der Leerzeichen) und dass alle ids vorhanden sind; korrigiere, bis die Prüfung besteht.

Regeln: nie `rm`; nur `out/jobNN.json` und eigene Hilfsdateien in `tmp/` schreiben. Schlussmeldung kurz: Prüfung bestanden?, Zahl leerer Segmente, Stellen mit unsicherer Zuordnung (Segment-id).
