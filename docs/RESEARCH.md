# Rechercheprojekte und Quellenblätter

Im Reiter **Recherche** ein Projekt mit Titel, Beschreibung und Schlagwörtern anlegen. Darin liegen Quellenblätter, Sammlungen und Notizen. Die Einträge lassen sich nach Text, Quelle, Thema und Schlagwort filtern. Projekte können archiviert und später wieder geöffnet werden.

## Quellenblätter erstellen

1. Im Lesefenster einen Text öffnen. **＋ Quellenblatt** zeigt eine ausdrückliche Editions- und Abschnittsauswahl. Die aktuell gewählten Zeilen werden vorgeschlagen. Leere Zeilenauswahl übernimmt den ganzen Abschnitt; `1–3, 7` übernimmt die entsprechenden vorhandenen Zeilen. Fehlende Zeilen werden als Fehler gemeldet.
2. Das Zielblatt wählen oder ein neues Blatt erstellen. Ein geöffnetes Blatt im aktuellen Projekt erhält den Baustein direkt. **Speichern** schreibt den Entwurf dauerhaft.
3. Im Kommentarbereich übernimmt **＋ Quellenblatt** den zugehörigen Kommentar aus genau der dort angezeigten Edition. Verschachtelte oder kapitelübergreifende Bereiche, die nicht eindeutig aufgelöst werden können, müssen im Lesefenster ausdrücklich ausgewählt werden.
4. Eigene Texte, Überschriften und verknüpfte Notizen hinzufügen. Mit ↑ und ↓ die Bausteine ordnen. Einträge aus einer Sammlung können wieder in ein Blatt eingefügt werden.

Quellenauszüge sind gespeicherte Kopien; Bibliothekstexte werden dabei nicht bearbeitet. Änderungen am Auszug werden im Export als **Bearbeiteter Auszug** ausgewiesen. Die ursprüngliche Kopie und der SHA256-Hash des Editionstextes bleiben im Projektpaket erhalten. Die normale Leserübernahme lässt Fußnoten und deren Zeichen weg; die Übernahme von Suchtreffern enthält die vorhandenen Fußnotentexte, damit Treffer darin erhalten bleiben. Formatierung wird in Klartext überführt.

**Wissenschaftliche Quellenangabe** enthält Werk, vollständigen Editionstitel, Fundstelle, Quellen-URL und explizit vorhandene Angaben zu Übersetzer, Herausgeber, Verlag und Jahr. Fehlende Angaben bleiben leer und können ergänzt werden; Namen werden nicht aus Autorenporträts erraten. Exporte zeigen die Quellenangabe am Auszug und gesammelt im Quellenverzeichnis. Dies ist eine allgemeine bibliografische Darstellung, keine Auswahl zwischen CSL-Zitierstilen.

## Sammlungen und Rechercheergebnisse

**Treffer sammeln** im Suchreiter übernimmt bis zu 200 verfügbare Treffer als Sammlung, mit Suchanfrage, Übernahmezeit, Edition, nativer Fundstelle und Quellenkopie. Die Sammlung enthält einen ausdrücklich gekennzeichneten Ausschnitt: zusätzliche Treffer, Parallelfassungen und später nachgeladene Ergebnisse werden nicht stillschweigend einbezogen. Quellen aus Sammlungen bleiben unabhängig von späteren Bibliotheksänderungen lesbar.

Sammlungen können auch eigene Texte und Notizen enthalten. Über **Aus Sammlung übernehmen** wird ein gewählter Baustein als eigene Kopie in ein Quellenblatt eingefügt.

## Notizen und mehrere Quellen

Die Projektansicht **Notizen** zeigt Projektnotizen und noch keinem Projekt zugeordnete Bibliotheksnotizen. Titel, Text, Themen, Schlagwörter und Projektzuordnung bearbeiten. **Textstelle aus Projekt verknüpfen** übernimmt Edition und Zitat aus einem vorhandenen Quellenbaustein. **Weitere Fundstelle** ergänzt eine frei eingegebene Referenz; es wird dabei kein Quellenwortlaut erfunden. Mehrere Referenzen können dieselbe Notiz belegen.

Vorhandene Bibliotheksnotizen behalten ihren bisherigen Leseanker in `notes.json`. Änderungen in der Rechercheansicht werden dort gespeichert; bestehende Markierungen bleiben nutzbar. Neue Projektnotizen liegen in `research.json`. Verknüpfte Notizen werden beim Export mit ihrem aktuellen Stand aufgelöst. Falls eine Notiz entfernt wurde, bleibt die beim Einfügen in das Quellenblatt übernommene Kopie als Rückfall erhalten. Zum Löschen alter Bibliotheksnotizen weiterhin den Reiter **Notizen** verwenden.

**In dieser Edition öffnen** verwendet den gespeicherten Editionspfad. Ist die Edition nicht mehr vorhanden, wird das gemeldet; es wird keine andere Edition als Ersatz ausgegeben. Die Quellenkopie im Projekt bleibt erhalten. Ältere Notizen ohne Editionspfad behalten ihre bisherige allgemeine Buch-/Abschnittsverknüpfung.

## Export, Wiederverwendung und Teilen

Vor einem Export den Entwurf speichern.

| Ausgabe | Inhalt |
| --- | --- |
| PDF | A4-Quellenblatt aus der Electron-Druckausgabe, mit Zitaten und Quellenverzeichnis |
| DOCX | Echtes Office-Open-XML-Dokument, mit Absätzen, Unicode, RTL-Absätzen und Quellenangaben |
| HTML | Eigenständige HTML-Datei ohne Skripte, externe Inhalte oder aktive Quellenlinks; im Browser les- und druckbar |
| Projekt teilen … (`.json`) | Projekt, Quellenblätter, Sammlungen, dazugehörige und ausdrücklich verknüpfte Notizen; einschließlich gespeicherter Quellenkopien |
| Forschungsdaten CSV | Bausteine aus Quellenblättern und Sammlungen sowie Notizen, UTF-8 mit BOM, RFC4180-Quoting; eine Zeile je Baustein/Notiz |
| Annotationen JSON-LD | Notizen als W3C-Web-Annotation-`AnnotationPage`, Text-/Tag-Körper und mehrere Quellenziele, echte Zitatselektoren nur bei vorhandenem Quellenauszug |

Die JSON-Datei weitergeben und über **Projektpaket importieren …** öffnen. Beim Import erhalten Projekte, Einträge und verknüpfte Notizen neue Kennungen; bestehende Einträge werden nicht überschrieben. Die Quellenkopien funktionieren auch ohne die ursprüngliche Bibliothek. Zum Anspringen des Originaltextes muss die passende Edition lokal vorhanden sein. Teilen erfolgt über Dateien, ohne öffentliche Hosting-Adresse, Zusammenarbeit in Echtzeit oder Cloud-Synchronisierung.

CSV ist eine tabellarische Ausgabe; das verlustfreie Austauschformat einschließlich aller Referenzen, Themen und Versionsinformationen ist das Projektpaket. JSON-LD dient dem Annotationsaustausch. `safran:locator`, `safran:edition`, `safran:project` und `safran:topics` ergänzen das Web-Annotation-Vokabular. Wenn eine Quellen-URL fehlt, dient eine `urn:safran:source:`-Kennung als Ziel. Die URL bezeichnet ggf. die ganze Ausgabe, die konkrete Stelle steht zusätzlich in der Fundstellenangabe.

## Speicherung und Schutz vor Überschreiben

`research.json` liegt im aktiven Bibliotheksordner. Schreibvorgänge sind serialisiert und verwenden atomaren Dateiersatz; fünf Sicherungen bleiben erhalten. Eine beschädigte Hauptdatei wird aus einer lesbaren Sicherung geladen und beim nächsten Schreiben separat aufbewahrt. Gibt es keine lesbare Sicherung, wird nicht mit einer leeren Datei weitergeschrieben.

Ungespeicherte Entwürfe werden getrennt je Lesefenster im lokalen Anwendungsspeicher zwischengespeichert und beim Öffnen der Rechercheansicht wiederhergestellt. Dauerhaftes Speichern bleibt ausdrücklich erforderlich. Bei zwischenzeitlichen Änderungen desselben Eintrags verweigert die Versionsprüfung das Überschreiben und erhält den lokalen Entwurf. **Neu laden / Entwurf verwerfen** holt den aktuellen Stand nach ausdrücklicher Bestätigung.

Grenzen: maximal 32 MiB pro Recherchedatei/Projektimport, 10.000 Einträge je Datentyp, 2.000 Bausteine pro Blatt/Sammlung und 100 Referenzen pro Notiz.

## Validierung dieses Entwicklungsstands

- `node --test tests/research*.test.js`: Quellen-/Kommentarauswahl, Editionsangaben, Suchtreffer mit Fußnoten, bestehende Notizanker, mehrere Referenzen, Speicherkonflikte, Sicherungswiederherstellung, Projektaustausch und Exportsicherheit/OOXML-Struktur.
- `SAFRAN_SMOKE_RESEARCH=1 electron tests/electron/smoke.cjs`: echte Produktionsoberfläche und Preload, isolierte Testbibliothek; Projekt, Zunz-Quellenübernahme, eigener Text, Notiz mit zwei Fundstellen, Suchtreffersammlung und Wiederverwendung, echte PDF-Erzeugung, DOCX/HTML/CSV/JSON-LD, Projektimport, Entwurfswiederherstellung und Konfliktmeldung.
- Allgemeine Regressionen: `npm test`. Der gezielte Electron-Lauf ergänzt diese Tests; er ist kein vollständiger Durchlauf sämtlicher vorhandener Electron-Abläufe.
