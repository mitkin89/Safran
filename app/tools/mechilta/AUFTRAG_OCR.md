# Mechiltha (Winter/Wünsche, Leipzig 1909) – Transkription

Basis: `/tmp/claude-0/-home-claude/d1474eaa-31a4-58a4-8257-4c8068935036/scratchpad/mech/`

Deine Seiten stehen im Auftrag (Liste wie `n100 n101 …`). Jede Seite liegt in `strips/` als drei überlappende Streifen `nNNN_1.jpg`, `nNNN_2.jpg`, `nNNN_3.jpg` (oben → unten; die Streifen überlappen um einige Zeilen – jede Zeile nur EINMAL ausgeben) und als `nNNN_ganz.jpg` (ganze Seite, zur Orientierung).

Lies jedes Bild mit dem Read-Tool und prüfe, dass es angezeigt wird („media removed“ = nicht gesehen → erneut lesen). Höchstens zwei Bilder pro Schritt. Nichts raten oder aus dem Gedächtnis (etwa aus dem hebräischen Mechilta-Text) ergänzen: nur, was auf dem Bild steht.

Ausgabe je Seite: `ocr/nNNN.txt` (UTF-8). Regeln:
1. Erste Zeile: `KOPF: ` + Kolumnentitel ohne Seitenzahl (z. B. `KOPF: Parascha Bo. 18. Abschn. Kap. 13, 13.`). Hat die Seite keinen Kolumnentitel: `KOPF: -`.
2. Danach der Haupttext, **jede gedruckte Zeile als eigene Zeile**, genau wie gedruckt (Trennstriche am Zeilenende stehen lassen).
3. Zwischenüberschriften (z. B. „Erster Abschnitt.“, „Parascha …“) als eigene Zeile mit `## ` davor.
4. Gesperrter Text (S p e r r s a t z) als `<g>…</g>` und normal geschrieben: `<g>Und wenn du es nicht lösest</g>`. Läuft die Sperrung über das Zeilenende, in jeder Zeile einzeln auszeichnen.
5. Fußnotenzeichen im Text als `^1`, `^2` … direkt am Wort bzw. Satzzeichen, wie gedruckt.
6. Kleine (tiefgestellte) Verszahlen wie „Kap. 13, ₁₃“ oder „(Ex. 34, ₂₀)“ als normale Ziffern: `Kap. 13, 13`, `(Ex. 34, 20)`.
7. Hebräisch in logischer Reihenfolge als hebräische Unicode-Buchstaben, genau wie gedruckt (Punkte/Vokale nur, wenn gedruckt; Endbuchstaben beachten; ו und י, ר und ד, ה und ח, ב und כ genau vergleichen).
8. Anführungszeichen wie gedruckt („ “ bzw. ,, ‘‘), ß, ä, ö, ü wie gedruckt.
9. Nach dem Haupttext eine Zeile `---FUSSNOTEN---`, dann die Fußnoten, jede gedruckte Zeile als eigene Zeile; jede Fußnote beginnt mit `[n] `. Setzt sich oben eine Fußnote der Vorseite fort (Zeilen ohne Nummer), stehen diese Zeilen zuerst, mit `[+] ` vor der ersten. Hochgestelltes wie „12ª“ als `12a`. Keine Fußnoten: Zeile `---FUSSNOTEN---` trotzdem setzen.
10. Weglassen: Seitenzahl, Bibliotheksstempel („Digitization Support from MICROSOFT“, „Original from YALE UNIVERSITY“, senkrechter Rand-Text).
11. Leere oder reine Bildseiten (Einband, leeres Blatt): Datei mit nur `LEER`.

Regeln: nie `rm`; nur in `ocr/` schreiben, nur deine Seiten. Schlussmeldung kurz: welche Seiten fertig, und Stellen, bei denen du unsicher warst (Seite, Zeile, Wort).
