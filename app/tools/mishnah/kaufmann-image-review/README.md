# Berakhot: Bildfundstellen und erste KI-Sichtlesung

Alle acht Archive.org-Bildseiten von fol. 001v bis 005r wurden in vollständigen
Spaltenausschnitten gesichtet, jeweils nur bis zum Ende von Berakhot. Der
Durchgang erfasst alle 2.170 diplomatischen Positionen der Digital-Mishnah-Basis.
Diese ergeben im bestehenden Leser 2.171 lexikalische Karten, weil eine
Abkürzung in zwei Lesertokens zerfällt.

**Dies ist keine abgeschlossene Vokalisierungsrekonstruktion und keine
menschlich bestätigte Handschriftenedition.** Die überwiegende Zahl der
vollständigen Punktierungen bleibt unsicher. Die als klar erfassten Lesungen
sind überwiegend kurze Wortformen. Jeder Befund bleibt zur Nachprüfung am Bild
zugänglich. Der erzeugte Bericht `../kaufmann-image-review-summary.json` enthält
die aktuellen Zahlen und Einschränkungen je Blatt.

## Zwei getrennte Belegarten

- **Quellenort:** Folio, Spalte und Quellzeile aus den ursprünglichen TEI-Marken
  `pb`, `cb` und `lb`. Das ist allein keine visuelle Bestätigung der Lesung.
- **KI-Bildlesung:** tatsächliche Sichtbeobachtung mit Bildzeile, vollständigem
  Zeilenrechteck, Teilablesung und Unsicherheitsnotiz. `clear` bedeutet eine als
  klar erfasste Lesung; `uncertain` kann klare Einzelzeichen enthalten, bestätigt
  jedoch nicht das vollständige Wort mit sämtlichen Vokal- und Dageschzeichen.

Die Quellzeilenzählung kann Überschriften und andere Quellbestandteile mitzählen.
Sie muss daher nicht mit der gesonderten Bildzeilenzählung der Hauptzeilen
übereinstimmen. Randzusätze und unnummerierte Randzeilen sind ausdrücklich
gekennzeichnet. Rechtecke beziehen sich auf Pixel des unveränderten Originals,
nicht auf hochskalierte Ausschnitte und nicht auf exakte Wortgrenzen.

Die acht Dateien `001v.json` bis `005r.json` enthalten die Einzelbefunde. Zusätze,
Streichungen, Kapitelzeichen und nicht einzeln zugeordnete Fragmente stehen
zusätzlich unter `unmapped`; sie werden nicht ungeprüft in den Lauftext eingefügt.

## Quellen und Erhaltung

Bildquelle: <https://archive.org/details/Mishnah_Kaufman_ms>. `images.json` bindet
Dateinamen, direkte Bild-URLs, Originalabmessungen und SHA-256-Prüfsummen. Die
heruntergeladenen Originale liegen außerhalb des Repositories unter
`/workspace/mishnah-kaufmann-archive`; ihre MD5-Prüfsummen wurden mit den
Archive-Metadaten abgeglichen. Verlustlose Inspektionsausschnitte wurden nur zum
Lesen erstellt. Sie erzeugen keine zusätzlichen Bildinformationen.

Die Digital-Mishnah-Basis ist an den ursprünglichen XML-SHA gebunden. Wort-IDs,
Schreibungen, Quellenzeichen und bestehende Be’eri-Übertragungen bleiben
unverändert. Ebenso werden morphologische Vorschläge und Bedeutungsangaben
nicht aus einer Bildlesung automatisch geändert. Die frühere Zahl von 115
Abweichungen beschreibt weiterhin den Vergleich Be’eri–Accordance, nicht das
Ergebnis einer vollständigen Manuskriptprüfung.

Für das Wort הנץ in 1:2 bestätigt eine zweite KI-Sichtlesung den Segol unter ה.
Die schwächere Punktgruppe unter נ bleibt vorsichtig offen; die frühere Aussage
über eine vollständig sichere Wortpunktierung wäre zu stark. Für אתם in 1:1
wird Zere unter ת bevorzugt; damit ist ebenfalls nicht die ganze Punktierung
als abgeschlossen geprüft erklärt.

Zusätzlich wurde die vollständige PDF aus dem offiziellen Bibliotheksrepositorium
<https://real-ms.mtak.hu/274/> heruntergeladen und auf eine mögliche bessere
Bildgrundlage geprüft. Für fol. 001v (PDF-Seite 12) enthält sie ein Bild mit
1.240 × 1.483 Pixeln gegenüber 1.593 × 1.943 Pixeln in der Archive-Datei, dazu
mehr umliegenden Buchbereich. Diese Stichprobe bietet keine höhere Auflösung
für die feinen Punkte. Datei-SHA und Prüfung stehen in
`../kaufmann-official-pdf-check.json`; die PDF bleibt außerhalb des Repositories.

## Erzeugen und prüfen

```sh
python app/tools/mishnah/build_kaufmann_image_review.py
node --test app/tests/kaufmann-image-review.test.js app/tests/kaufmann-image-ui.test.js
```

Der Builder prüft Bildhashes, Quellwortindizes, Foliozuordnung und Zeilenrechtecke
und verwirft inkonsistente Befunde. Die erzeugte Datei
`app/mishnah-kaufmann-image-data.js` ist eine getrennte Belegebene, keine neue
Textedition. In der abgeleiteten Berakhot-Fassung zeigen Wortkarten unter
**Kaufmann · Bildquelle** den Quellenort, die qualifizierte Lesung und einen
Bildbutton. Die alte Be’eri-Ausgabe erhält keine scheinbar identischen
Manuskriptbelege. Ein gezielter Electron-Test wird durch
`SAFRAN_SMOKE_KAUFMANN_IMAGES=1` aktiviert.
