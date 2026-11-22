# Prüfung der Zeugenangaben in den Lesarten-Notizen

Die Notizen der LXX- und Peschitta-Lesarten nennen oft weitere Zeugen („so auch LXX“, „wie SMR“, „vgl. 4QSamᵃ“, „Targum“ …). Diese Angaben stammen aus dem Gedächtnis der Bearbeiter. Du prüfst sie gegen die Daten, die Safran tatsächlich hat, und korrigierst die Notiz.

Jedes Blatt `sheets/W-N.txt` enthält Einträge `### <id>` mit:
- `MT:` die MT-Wörter mit Nummern; `Eintrag:` die betroffenen MT-Wörter (`he`), Typ, erschlossene Vorlage;
- `Notiz:` die zu prüfende Notiz; `Genannte Zeugen:` was erkannt wurde (kann Fehltreffer enthalten);
- darunter die **Belege aus Safran**:
  - `LXX Griechisch:` die CATSS-Wortgruppen des Verses, `→` MT-Wortnummern (`+` = Plus); mit `»` markiert die Gruppen zu den betroffenen MT-Wörtern. `LXX Lesarten:` die bereits bewerteten LXX-Abweichungen dieses Verses.
  - `SMR:` der samaritanische Text (Tal), `*` = weicht vom MT ab.
  - `DSS <Rolle> <Fragment>:` erhaltener Qumran-Text ([ ] = Rekonstruktion, # = unsicher).
  - `Kennicott:` Lemma ] Lesarten mit Zahl der Handschriften.
  - `Peschitta:` syrische Wörter mit Zuordnung und die bewerteten Peschitta-Lesarten.

## Regeln

1. **Zeugen mit Belegen in Safran** (LXX/Septuaginta, SMR/Samaritanus, Qumran/DSS-Siglen wie 4QSamᵃ, 1QIsaᵃ, Kennicott/„hebräische Handschriften“, Peschitta):
   - **bestätigt**, wenn der Beleg dieselbe Abweichung zeigt (gleiche Vorlage bzw. gleicher Sinn an derselben Stelle; bei „viele Handschriften“ mindestens mehrere Kennicott-Zeugen). Die Angabe bleibt, kurz und einheitlich: „(so auch LXX)“, „(so auch SMR)“, „(so auch 4QSamᵃ)“, „(so auch viele hebr. Hss.)“. Bei „ähnlich“/„vgl.“ genügt eine verwandte Abweichung.
   - **widerlegt**, wenn der Beleg das MT stützt oder etwas anderes hat: Angabe aus der Notiz **streichen**.
   - **nicht belegt**, wenn der Beleg fehlt (keine Daten für den Vers, Rolle nicht erhalten, Stelle in einer Lücke): Angabe ebenfalls **streichen**.
2. **Zeugen ohne Daten in Safran** (Targum/Onkelos, Vulgata, Papyrus Nash, NT-Zitate wie Apg/Röm/Hebr/Mt, Sir, 1 Esdr, Josephus, Theodotion/Aquila/Symmachus): Angabe behalten, aber mit „ungeprüft“ kennzeichnen, z. B. „(vgl. Targum, ungeprüft)“. Status **ungeprüft**.
3. Fehltreffer („Quelle“, „Qal“, „Qere“, „Ketiv“, ein Ortsname, „LXX-Zählung“ in einer LXX-Notiz …) sind keine Zeugenangaben: Notiz unverändert, Status für diesen Treffer weglassen.
4. Ändere nur die Zeugenangaben. Der übrige Wortlaut der Notiz bleibt; achte darauf, dass nach dem Streichen ein sauberer Satz übrig bleibt (keine leeren Klammern, kein hängendes „so auch“).

## Ausgabe

`out/W-N.json`: für **jede** id des Blatts
```json
{"Syr|Genesis|2:2|0": {"note": "„am sechsten Tag“ statt „am siebten Tag“ (so auch LXX, SMR)", "status": {"LXX": "bestätigt", "SMR": "bestätigt"}}}
```
`status`-Werte: `bestätigt`, `widerlegt`, `nicht belegt`, `ungeprüft`. Prüfen mit `python3 /home/claude/witness/check.py W-N` bis OK. Keine Hilfsdateien anderswo, kein `rm`, nichts in `/home/claude/safran` ändern.
