# Goldschmidt: Leviticus, Numbers, Deuteronomy – vollständig

Stand: 16. November 2026. Goldschmidt-Zuordnung **vollständig**.
Eigener Checkout, Branch `codex/goldschmidt-lev-num-deut`, Ausgangspunkt
`main` bei `aa7c6fcd778ccca490fa1eee844f86d0a01984da`.

## Umfang

| Buch | Versweise am gebündelten OSHB-Wortlaut geprüft und zugeordnet | Anzahl | Noch nicht bearbeitet | Anzahl offen |
| --- | --- | ---: | --- | ---: |
| Leviticus | 1:1–27:34 (vollständig) | 859 | keine | 0 |
| Numbers | 1:1–36:13 (vollständig) | 1.288 | keine | 0 |
| Deuteronomy | 1:1–34:12 (vollständig) | 956 | keine | 0 |
| Summe | | 3.103 | | 0 |

In Numbers 7 wurden nach Einzelprüfung identische Wiederholungen nur bei übereinstimmendem deutschen Wortlaut und identischer hebräischer Wortfolge einschließlich Vokalen, Wortgrenzen und span-Attributen übernommen; lediglich Akzente und Meteg wurden beim Identitätsvergleich ignoriert. Jede Übernahme wurde gegen beide konkreten Quellen geprüft.

Es wurden keine ungeprüften Vorfassungen übernommen. Die Zuordnung wurde
für jeden aufgenommenen Vers anhand seiner tatsächlich nummerierten
`<span class="w">`-Wörter im gebündelten Westminster-JSON erstellt. Deutsche
Reihenfolge, Schreibungen, Klammern und Interpunktion bleiben erhalten.
Mehrere Nummern pro Segment stehen insbesondere bei deutschen Komposita,
hebräischen Genitivverbindungen, Akkusativzeichen und Ketiv/Qere. Wiederholte
Nummern verbinden getrennte Teile einer deutschen Wiedergabe (etwa Verb und
Verbpartikel). Deutsch ohne ausdrückliches Gegenstück steht bei `-`.

Genesis.txt wurde nicht verändert; Exodus.txt wurde nicht angelegt oder
verändert. Der vorhandene geprüfte Musterbestand Genesis 1 bleibt enthalten.
Die hebräischen Quell-JSONs sind unverändert. Nach ausdrücklicher Freigabe
wurden zwölf kleine Änderungen in den drei deutschen Goldschmidt-JSONs
umgesetzt; Zuordnungen und die drei SHA1-Hashes im Manifest sind angepasst.
Keine externen Textquellen verwendet; eScriptorium nicht aufgerufen.

Eine zusätzliche Prüfliste steht in `PRUEFLISTE-LND.md`. Nur die zwölf kleinen Änderungen der freigegebenen Liste sind umgesetzt;
alle übrigen Befunde bleiben zur Prüfung offen.

## Besondere Stellen und Textabweichungen

Diese Hinweise kennzeichnen bereits im Ausgangstext vorhandene Unterschiede;
sie sind keine stillschweigenden Textkorrekturen. Für eine Entscheidung über
Transkriptionsfehler gegenüber Übersetzungsentscheidungen wäre zusätzlich die
Druckausgabe heranzuziehen.

- Leviticus 1:6: „(seine)“ hat ein Gegenstück im Suffix von לִנְתָחֶיהָ
  (Wort 6). Die Schreibungen „Stükke“ (1:6) und „Stücke“ (1:8,12) bleiben.
- Leviticus 1:7: Wort 4 הַכֹּהֵן ist Singular, während Goldschmidt hier
  „[die] Priester“ hat; dieses ganze Segment bleibt Wort 4 zugeordnet.
- Leviticus 1:17: Das zweite „dem Altare“ steht an der Stelle von Wort 14
  הָאֵשׁ, „dem Feuer“. Der vorhandene deutsche Wortlaut wurde bewahrt und
  positionsbezogen diesem Wort zugeordnet; dies ist ausdrücklich keine
  Behauptung, אֵשׁ bedeute „Altar“.
- Leviticus 2:2: „Brandopfer“ steht für אִשֵּׁה (20), sonst häufig
  „Feueropfer“; keine Vereinheitlichung des Übersetzerwortlauts.
- Leviticus 2:4–5: Eingefügte deutsche Kopulasätze „so soll es … sein“ ohne
  eigenes ausgedrücktes hebräisches Verb sind mit `-` gekennzeichnet.
- Leviticus 3:14: קָרְבָּנוֹ (3, „sein Opfer“) hat keine eigene deutsche
  Wiedergabe. Diese hebräische Nummer wird nicht künstlich einem fremden
  deutschen Wort zugewiesen. Die Zuordnung verlangt keine vollständige
  Rückübersetzung des Hebräischen.
- Numbers 1:3: אֹתָם (10, „sie“) hat kein eigenes deutsches Objekt;
  „sollt ihr … mustern“ wird ausschließlich תִּפְקְדוּ (9) zugeordnet.
- Numbers 1:10: Das zusätzliche „und“ vor Gamliel steht bei `-`; die
  hebräische Liste hat dort kein ו.
- Numbers 1:16: Ketiv קריאי (2) und Qere קְרוּאֵי (3) liegen **gemeinsam**
  auf „die Berufenen“. Alle folgenden Nummern berücksichtigen beide Formen.
- Numbers 1:21,23,25,27,29,31,33,35,37,39,41,43: „[waren]“ steht bei `-`;
  kein entsprechendes ausgedrücktes Verb in diesen Versen. Anders 1:46:
  „waren“ hat וַיִּהְיוּ (1) als Gegenstück; nur „[zusammen]“ steht bei `-`.
- Numbers 1:53: Der deutsche Wortlaut „der Obhut … wahren“ bleibt trotz
  seiner auffälligen Syntax unverändert.
- Deuteronomy 1:1: Das doppelte hebräische „zwischen … und zwischen“
  (15,17) ist gemeinsam dem einmaligen deutschen „zwischen“ zugeordnet.
- Deuteronomy 1:13: „mir“ steht an der Stelle von לָכֶם (2, „euch/für euch“).
  Die abweichende Person ist bewahrt und ausdrücklich vermerkt.
- Deuteronomy 1:44: „(tun)“ hat das ausdrückliche תַּעֲשֶׂינָה (10) als
  Gegenstück und steht deshalb nicht bei `-`.

## Tests und Grenzen

Erfolgreich ausgeführt:

```
python3 tools/interlinear/build.py
python3 -I tools/interlinear/renderings.py
node test.js
node test30.js
```

`build.py` prüft deutschen Verswortlaut und Nummerngrenzen aller vorhandenen
Zuordnungszeilen. `renderings.py` baut die Wortkarten aus diesen Zuordnungen.
`test.js` prüft die allgemeinen Bibliotheksfunktionen.

`test30.js` verlangt jeden Vers aller drei Bücher und ihre exakten Gesamtzahlen;
eine fehlende Zeile ist ein Fehler. Vorhandene Zunz-Zuordnungen und die übrigen
Übersetzer werden weiter vollständig geprüft. Goldschmidt Genesis bleibt beim
bestehenden Prüfbereich Kapitel 1; die dort offenen 1.502 Verse werden explizit
als nicht geprüft ausgegeben und gehören zum anderen Chat.
Zusätzlich werden alle 39 separat gezählten Ketiv-/Qere-Stellen in den drei
Büchern auf gemeinsame Segmente geprüft, einschließlich der dreiteiligen
Form in Deuteronomy 33:2. Die Klammerwörter in Leviticus 1:6 und
Deuteronomy 1:44 bleiben gegen ihre konkreten Nummern abgesichert.

Die Skripte prüfen keine semantische Richtigkeit. Die versweise Prüfung am
Hebräischen war ein eigener Arbeitsschritt. Alle 3.103 Verse wurden geprüft.
Keine visuelle Prüfung in der laufenden Safran-App vorgenommen.

## Zusammenführen mit dem anderen Chat

Die drei neuen TXT-Dateien können unabhängig übernommen werden.
`test30.js` und `CHANGELOG.md` müssen mit den Änderungen des anderen Chats
zusammengeführt werden. Insbesondere müssen Goldschmidts Buchliste, die
Prüfgrenzen und Zählungen dem tatsächlichen vereinigten Bestand entsprechen.

`interlin.js` und `interlin-ren.js` in dieser Lieferung enthalten nur den
Bestand dieses Checkouts. Nach Zusammenführen **aller** TXT-Zuordnungen beide
Dateien neu erzeugen und die vier Prüfungen erneut ausführen; die hier
gebauten Dateien nicht über einen inzwischen erweiterten Gesamtbestand
kopieren. Der Nutzer hat den Push auf dem eigenen Branch nach Abschluss aller
drei Goldschmidt-Bücher ausdrücklich beauftragt; danach folgen Breuer Ezekiel
und die Megillot. Kein Merge nach main gehört zu diesem Schritt.
