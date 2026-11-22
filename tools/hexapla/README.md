# Field, Origenis Hexaplorum quae supersunt I (1875) – Transkription

Die Vorlage ist der Scan von archive.org (origenhexapla01unknuoft); er ist gemeinfrei. Band I (Genesis bis Ester, origenhexapla01unknuoft) steht auf den Blättern 0119 bis 0924, Band II (Hiob bis Maleachi, origenhexapla02unknuoft) auf 0014 bis 1050; die Transkriptionen liegen je Buch in `field/<buch>/ocr` und `field/<buch>/ocr-en`.

Für jedes Blatt gibt es in `tiles/` diese Bilder:

- `NNNN-0-ganz.png`: die ganze Seite, damit du das Layout siehst.
- `NNNN-L1/L2/L3.png`: die linke Seitenhälfte in Originalauflösung, von oben nach unten.
- `NNNN-R1/R2/R3.png`: die rechte Seitenhälfte, ebenso.

Die Ausschnitte überlappen sich, also nichts doppelt abschreiben.

## Aufgabe

Transkribiere **alles** Gedruckte auf der Seite genau, Zeichen für Zeichen, so wie es gedruckt ist. Ausgenommen sind nur Bibliotheksstempel und Randflecken. Dazu gehören:

- der Haupttext: Lemma, lateinische Übersetzung, LXX und die Lesarten von Aquila, Symmachus, Theodotion und den anderen Übersetzern;
- **alle Fußnoten**.

Lies jede Seite in den Ausschnitten, nicht im verkleinerten Gesamtbild.

## Ausgabeformat

Lege eine Datei pro Blatt an: `ocr/NNNN.txt`, UTF-8.

```
=== Blatt 0120 · S. 8 · GENESIS. [Cap. I. 3–
--- Text
@ 1:2 (Forts.)
ἐπιφερόμενον ἐπὶ πρόσωπον ὑδάτων. Θ. καὶ σκότος … ἐπιφερόμενον ἐπὶ προσώπου τοῦ ὕδατος.^7 ‘Ο Σύρος· … ὑποθαλπομένοις.^8
@ 1:3
H: יְהִי־א֑וֹר וַיְהִי־אוֹר׃
L: Fiat lux: et facta est lux.
Ο΄. Θ. γενηθήτω φῶς· καὶ ἐγένετο φῶς. Ἀ. γενέσθω φῶς· καὶ ἐγένετο φῶς. Σ. ἔστω φῶς· καὶ ἐγένετο φῶς.^9
@ 1:4
H: אֶת־הָאוֹר
Ο΄. τὸ φῶς. Ἀ. σὺν τὸ φῶς.^10
--- Fußnoten
[7] Philop. ibid.
[8] S. Basil. M. ibid. p. 18 C: Πῶς οὖν ἐπεφέρετο …
```

Die Regeln dazu:

**Kopfzeile**
- Beginne mit `=== Blatt NNNN · S. <gedruckte Seitenzahl> · <Kolumnentitel wie gedruckt>`.

**Haupttext**
- Er steht unter `--- Text`. Jede Verseinheit beginnt mit einer Zeile `@ Kapitel:Vers`, Kapitel in arabischen Ziffern.
- Hat Field eine zweite Zählung in Klammern, übernimm sie, z. B. `@ 6:17 (16)`.
- Läuft ein Vers von der vorigen Seite weiter, schreibe `(Forts.)`.
- Mehrere Lemmata zum selben Vers bekommen je eine eigene `H:`-Zeile, jeweils mit den Lesarten darunter. Die `@`-Zeile wird dabei nicht wiederholt.
- `H:` ist das hebräische Lemma **mit Punktierung und Akzenten, so weit gedruckt**. `L:` ist Fields lateinische Übersetzung.
- Danach kommen die Lesarten als fortlaufender Text: Ο΄. Ἀ. Σ. Θ. Οἱ γ΄. Ὁ Σύρος, Ὁ Ἑβραῖος, Ἄλλος usw., Siglen wie gedruckt.
- Fußnotenzeichen schreibst du als `^n`.

**Fußnoten**
- Sie stehen unter `--- Fußnoten`, jede als `[n] Text`, in der gedruckten Reihenfolge.

**Zeichen**
- Asterisk: `※`, Obelus: `÷`, Metobelus: `↙`.
- Kursivdruck mit `_…_` markieren; Kapitälchen als Großbuchstaben (z. B. MEREFETH).
- Syrisches in Fußnoten in syrischer Schrift.
- Silbentrennung am Zeilenende auflösen, z. B. ὑποθαλ-πομένοις → ὑποθαλπομένοις. Zeilenumbrüche innerhalb eines Absatzes sonst weglassen.

**Unsicherheiten**
- Unsicher Gelesenes kennzeichnest du mit `[?]` direkt dahinter. Ganz Unleserliches mit `[…]`.

**Kontrolle**
- Prüfe am Ende jeder Seite, dass alle Fußnotenzeichen im Text eine Fußnote haben und umgekehrt.

## Ablauf

- Arbeite Blatt für Blatt; lies dafür die sieben Bilder jedes Blatts.
- Schreibe nur in `/home/claude/archive/hexapla/ocr/`. Keine Hilfsdateien anderswo, kein `rm`.

## Aufbau für den Apparat

```
python3 tools/hexapla/split.py <ocr-ordner> <ocr-en-ordner>   # Blätter nach Kolumnentitel auf field/<buch>/ verteilen
python3 tools/hexapla/build.py "I Kings" tools/hexapla/field/i-kings/ocr tools/hexapla/field/i-kings/ocr-en
```

`build.py` ordnet jedes Lemma (`H:`) über die Konsonanten einem Wortbereich des MT zu (bei Plene/Defektiv-Schreibung,
Ketiv oder fehlenden Leerzeichen mit einem unscharfen Vergleich in den nächsten Versen). Fields zweite Zählung
„(Hebr. 15)“, „(xiv. 1)“, „(5:2)“ gilt als MT-Vers, „(Gr. …)“ wird übergangen. Zeichenlisten am Kapitelende
(`@ 9 (Zeichenliste)`) und Nachträge ohne Lemma werden ans Ende des jeweiligen Verses gesetzt. Nicht zugeordnete
Lemmata stehen in `<Buch>-unresolved.json`. Band II: Field zählt die Psalmen nach der LXX (Umrechnung `lxx_psalm`);
eine Klammerzählung gilt dort als hebräisch, außer sie liegt mehr als drei Kapitel entfernt (griechische Ordnung in Jeremia).

## Griechische Morphologie der Lesarten

`morph.py` erzeugt `hexapla-morph.js` (Form → Lemma, Bestimmung, Kurzbedeutung) in vier Stufen:

1. LXX-Morphologie in Safran (`lxx-morph.js`, Kushniryk, CC BY 4.0), auch nach Akzent-Ausgleich;
2. Perseus Morpheus (CC BY-SA 3.0 US) für die übrigen Formen. Die 64-Bit-taugliche Fassung von
   perseids-tools verwenden – der PerseusDL-Build erkennt auf 64 Bit fast keine Verben („Something wrong with
   stemkeys“). Attische Lemmata (γιγνώσκω) werden auf die LXX-Schreibung gebracht, wenn es sie dort gibt;
3. Regeln für die Reste: bewegliches ν (ἐπέστρεψε), Fields Zusammenschreibungen (καίγε, ἀναμέσον, ἱνατί),
   Koine- und Itazismus-Schreibungen (λήψομαι/λήμψομαι, ει/ι), Eigennamen (Großbuchstabe → `E`),
   transkribierte hebräische Wörter (Schlusskonsonant, den ein griechisches Wort nicht hat → `Y`);
   Fields eigene Wörter (Ἑβρ., Σαμαρειτικόν, ἑξαπλῷ …) zählen nicht;
4. `manual-morph.json`: die letzten ~860 Formen, von Claude bestimmt (2026), Transkriptionen mit dem
   hebräischen Wort. `null` = kein Übersetzerwort (Hälften getrennter Wörter am Zeilenende, Fields lateinische
   Anmerkungen zu Codex-Schreibungen); diese stehen in `open-forms.json`.

Stand: 35.915 Formen, 260.197 Belege, alle bestimmt außer 181 Bruchstücken (0,1 %).

```
git clone https://github.com/perseids-tools/morpheus && cd morpheus/src
make clean && CFLAGS='-std=gnu89 -fcommon -w' make && make install     # braucht flex
cd .. && MORPHEUS=$PWD python3 /pfad/zu/safran/tools/hexapla/morph.py   # Stemlib ist eingecheckt
```
