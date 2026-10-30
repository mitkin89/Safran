<p align="center"><img src="logo.png" alt="Safran" width="110"></p>
<h1 align="center">Safran סַפְרָן</h1>
<p align="center"><b>Offline-Bibliothek für Tanach, Talmud, Midrasch und Kommentare, mit deutschen Übersetzungen, die es sonst kaum gibt.</b><br>Für macOS und Windows.</p>

<p align="center">
  <a href="https://github.com/mitkin89/Safran/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/mitkin89/Safran?label=release"></a>
  <a href="https://github.com/mitkin89/Safran/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/mitkin89/Safran/total"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue"></a>
  <img alt="Platforms" src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey">
  <a href="https://github.com/mitkin89/Safran/actions"><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/mitkin89/Safran/build.yml"></a>
</p>

<p align="center"><a href="README.md">English</a> · <b>Deutsch</b></p>

<p align="center"><a href="https://github.com/mitkin89/Safran/releases/latest"><img alt="Safran herunterladen" src="https://img.shields.io/badge/%E2%AC%87%20Safran%20herunterladen-neueste%20Version-2ea44f?style=for-the-badge"></a></p>

<p align="center"><img src="screenshots/reading-and-commentary-annotated.jpg" alt="Safran Lesansicht: Hebräisch, Englisch und Deutsch mit Kommentarfenster" width="900"><br><i>Zefanja 1: Hebräisch, Englisch und Deutsch nebeneinander, links Bücherliste und Verlauf, rechts der Kommentar.</i></p>

> **Erster Start:** Die App ist nicht mit einem kostenpflichtigen Zertifikat signiert. Unter macOS Rechtsklick → *Öffnen*, unter Windows *Weitere Informationen → Trotzdem ausführen* ([Einzelheiten unten](#erster-start-unter-macos-und-windows)).
> Die Texte werden aus dem öffentlichen Sefaria-Export geladen, nur was du auswählst (Hebräisch insgesamt ≈ 2,8 GB). Safran ist ein unabhängiges Projekt und **nicht mit Sefaria verbunden**.

## Was Safran kann

<table>
<tr>
<td width="50%" valign="top"><b>📖 Vers für Vers in drei Sprachen</b><br>Hebräisch, Englisch und Deutsch nebeneinander, Vers für Vers ausgerichtet, Fußnoten direkt im Text.</td>
<td width="50%" valign="top"><b>🇩🇪 Deutsche Texte, die es sonst nicht gibt</b><br>Über 290 Versionen, vieles nicht bei Sefaria: Zunz, Philippson, Mendelssohn, Herxheimer, Hertz, Raschi (Bamberger), Midrasch Rabba, More Nevuchim …</td>
</tr>
<tr>
<td width="50%" valign="top"><b>💬 Kommentarfenster</b><br>Raschi, Ibn Esra u. a. unter dem gewählten Vers. Lässt sich zusammen mit dem Wörterbuch neben dem Text anpinnen.</td>
<td width="50%" valign="top"><b>🔎 Volltextsuche</b><br>Ignoriert Vokale und Kantillation; Wörter in der Nähe, Platzhalter und unscharfe Suche für Schreibvarianten.</td>
</tr>
<tr>
<td width="50%" valign="top"><b>🗺 Bibelkarte</b><br>Orte jedes Kapitels auf einer Karte von Israel, Entfernungen, Höhenprofil und eine detaillierte Karte von Jerusalem (1865).</td>
<td width="50%" valign="top"><b>🎧 Hebräische Lesung</b><br>Lesung des Tanach mit Versmarken; der gelesene Vers wird markiert.</td>
</tr>
<tr>
<td width="50%" valign="top"><b>📚 Wörterbücher und Morphologie</b><br>BDB, Gesenius und eigene DSL-Wörterbücher; Klick auf ein Wort zeigt Lemma und Morphologie.</td>
<td width="50%" valign="top"><b>📜 Handschriften und Fassungen</b><br>Aleppo-Kodex, Qumran-Rollen, Septuaginta mit hebräischem Gegenstück, Targumim, Parallelstellen.</td>
</tr>
</table>

<details>
<summary><b>Alle Funktionen</b></summary>

- **Download:** Katalog einmal laden (~22 MB), Kategorien oder einzelne Bücher ankreuzen, Sprachen wählen (Hebräisch, Englisch, Deutsch) und herunterladen. Standardmäßig wird je Sprache die zusammengeführte Fassung verwendet; deutsche Übersetzungen werden vollständig geladen. Unterbrochene Downloads lassen sich fortsetzen, vorhandene Dateien werden übersprungen.
- **Lesen:** Hebräisch, Englisch und Deutsch nebeneinander, Vers für Vers ausgerichtet. Kapitel bzw. Talmudseiten (2a, 2b …) per Auswahlliste oder Pfeiltasten. Fußnoten öffnen sich direkt im Text (Klick auf die kleine Marke). Einzelne Versionen lassen sich ein- und ausschalten.
- **Tabs, Verlauf und Sitzungen:** mehrere Tabs mit Zurück/Vor je Tab, Liste „zuletzt geöffnet"; offene Tabs werden beim nächsten Start wiederhergestellt.
- **Springen-Feld:** Stelle eintippen (`3`, `2:5`, `14 2`, `Daf 3a`, `gen. 1:1`, `Kapitel 14 Vers 2`); abgekürzte Buchnamen funktionieren.
- **Suche:** Volltextsuche in allen geladenen Texten (inkl. Fußnoten und eigenen Texten), hebräische Vokale und Kantillation werden ignoriert, optional „ganze Wörter mit Präfixen", Kategoriefilter. Erweiterte Suche: bis zu drei Wörter in der Nähe zueinander (Abstand einstellbar, Reihenfolge optional), Platzhalter (`anf*`, `m?er`) und unscharfe Suche für Schreibvarianten (Raschi/Rashi). Seitensuche mit Cmd+F, auch im Kommentarfenster.
- **Verknüpfungen (🔗):** Sefarias Verknüpfungsdaten einmal laden (~680 MB), dann je Vers nach Kategorie und Buch gruppiert mit Textvorschau ansehen.
- **Bibelkarte (🗺):** Orte des aktuellen Kapitels auf einer Karte von Israel (Grenzen, Relief, Flüsse, Routen), Entfernungsmessung, Höhenprofil, Notizen an Orten; dazu eine detaillierte **Jerusalem**-Karte (Wilson 1864/65 mit heutigen Straßen). Der Knopf zeigt die Anzahl der Orte.
- **Themen (🏷):** Themenansicht, die Themen den Stellen zuordnet. Der Knopf zeigt die Anzahl der Themen.
- **Gliederungen:** Gliederungen für 39 Bücher des Tanach auf Hebräisch, Deutsch und Englisch. Für die Tora gibt es in der Gliederung zusätzlich den Schalter **613 Mizwot**, der statt der Gliederung nur die Gebote zeigt. Von der Karte führt ein Klick zurück zur Gliederung.
- **Audio:** hebräische Lesung des Tanach von Abraham Schmueloff, kapitelweise, mit Versmarken (in der App enthalten). Die Audiodateien (etwa 3 GB) werden im *Download*-Fenster pro Buch geladen (GitHub-Release `audio`); die Wiedergabe folgt den Versen.
- **Fenster anpinnen:** Verknüpfungen, Themen, Gliederung, Karte, Kommentare und Wörterbuch lassen sich mit der Nadel neben dem ✕ anheften und stehen dann neben dem Text. Der Pin wird je Fenster gemerkt; ein zweites angepinntes Fenster ersetzt das erste (Kommentare und Wörterbuch dürfen zusammen angepinnt sein). Nicht angepinnte Fenster schweben und schließen beim Klick außerhalb. Ein Klick auf die Versnummer öffnet die Kommentare.
- **Beschriftete Werkzeugleiste:** Die Knöpfe für Verknüpfungen, Themen und Karte tragen eine Beschriftung und zeigen die Anzahl.
- **Kommentarfenster (Cmd+K):** zeigt Kommentare zum gewählten Vers (z. B. Raschi und Ibn Esra untereinander) in der gewählten Sprache. Ist kein Kommentator gewählt, erscheinen alle lokal vorhandenen.
- **Eigene Texte und Kommentare:** TXT, Word (.docx), CSV, JSON oder Sefaria-Upload-CSV importieren, auch mehrere auf einmal (Drag & Drop), als *Text* oder als *Kommentar* (`Kommentator on Buch`, erscheint im Kommentarfenster). Dein Text erscheint als zusätzliche Spalte neben dem Original, wird Zeile für Zeile verglichen und lässt sich wieder entfernen. Eingebettete Base64-Bilder werden angezeigt.
- **Zusätzliche Texte, die es bei Sefaria (noch) nicht gibt:** Safran enthält eine eigene Sammlung deutscher Übersetzungen und Kommentare, die Sefaria bisher nicht anbietet. Sie erscheinen als zusätzliche Versionen und Kommentatoren neben den Sefaria-Texten.
- **Mitgelieferte Texte:** Texte im Ordner `bundled/` werden beim Start automatisch importiert (neue oder geänderte auch nach Updates); eigene Texte exportierst du mit ⋯ → „Eigene Texte für GitHub exportieren …" in diesen Ordner.
- **Zwei Lesefenster** nebeneinander mit eigenen Tabs, Verlauf und Kommentarfenster; **Kommentarfenster in der Breite verstellbar** mit einstellbarer Schriftgröße.
- **Notizen und Lesezeichen**, **Anzeigeoptionen** (Schriftgrößen, Vokale/Kantillation ausblenden), **Export** als PDF oder Word, **Update-Prüfung** gegen den Sefaria-Export.
- **Menü Werkzeuge:** Buch oder Kapitelbereich als CSV/TXT/JSON herunterladen; CSV-Dateien für den Sefaria-Upload vorbereiten und prüfen (Duplikate, Lücken, Reihenfolge, HTML, Steuerzeichen, Segmentzahlen im Vergleich mit einem vorhandenen Sefaria-Text).
- Hebräischer Text wird in **SBL Hebrew** gesetzt, falls installiert (kostenlos von der Society of Biblical Literature), sonst in einer Ersatzschrift.

### Tastenkürzel

| Kürzel | Aktion |
| --- | --- |
| ← / → | vorheriger / nächster Abschnitt |
| Cmd+T / Cmd+W | neuer Tab / Tab schließen (Cmd+Shift+W schließt das Fenster) |
| Cmd+1…9 | Tab wählen (9 = letzter), Cmd+Alt+←/→ Tab links/rechts |
| Cmd+[ / Cmd+] | zurück / vor |
| Cmd+F | Suche im angezeigten Text |
| Cmd+K | Kommentarfenster |
| Cmd+B | Bücherliste ein-/ausblenden |
| Cmd+Shift+O | Offline-Bibliothek öffnen |


</details>

## Texte, die es bei Sefaria nicht gibt

Neben den Sefaria-Texten enthält Safran eine eigene Sammlung deutscher Übersetzungen und Kommentare (Zunz, Philippson, Mendelssohn, Herxheimer, Hertz, Raschi und Kitzur Schulchan Aruch (Bamberger), Mendelssohn (Netivot ha-Schalom, Biur), Midrasch Rabba, More Nevuchim u. a.) im Ordner `bundled/`. Sie werden beim ersten Start importiert und erscheinen unter *Eigene Texte* als zusätzliche Versionen und Kommentatoren neben den Sefaria-Texten.

## Installation

1. Das Installationsprogramm für dein System aus der [neuesten Version](https://github.com/mitkin89/Safran/releases/latest) laden.
2. Safran starten und unter **Download** Bücher und Sprachen wählen. Der Speicherort lässt sich ändern (z. B. auf eine externe Festplatte).
3. Optional: im selben Fenster die hebräische Lesung pro Buch laden.

### Erster Start unter macOS und Windows

Die App hat kein kostenpflichtiges Entwicklerzertifikat (die Zertifikate von Apple und Microsoft kosten Geld), darum ist beim ersten Start ein zusätzlicher Schritt nötig. Die App ist nicht defekt. Unter macOS ist sie lokal (ad hoc) signiert; meist erscheint die Meldung *„Entwickler kann nicht überprüft werden"* mit der Schaltfläche **Trotzdem öffnen**.

**macOS** – bei *„Safran ist beschädigt und kann nicht geöffnet werden"* oder *„Entwickler kann nicht überprüft werden"*:

1. **Safran** in den Ordner **Programme** ziehen.
2. Am einfachsten: die `.dmg` erneut öffnen und mit Rechtsklick **Safran freischalten.command** → *Öffnen* → *Öffnen*. Oder im Terminal: `xattr -cr /Applications/Safran.app`
3. Bei *„Entwickler kann nicht überprüft werden"*: *Systemeinstellungen → Datenschutz & Sicherheit → Trotzdem öffnen* (nach unten scrollen) oder Rechtsklick auf die App → *Öffnen* → *Öffnen*.

**Windows** – SmartScreen zeigt evtl. *„Der Computer wurde durch Windows geschützt"*: **Weitere Informationen** → **Trotzdem ausführen**.



### Datenmenge (grobe Werte)

Alle zusammengeführten hebräischen Texte ≈ 2,8 GB, Englisch ≈ 0,5 GB, deutsche Übersetzungen (288 Versionen, vor allem Tanach, Talmud, Mischna) ≈ 0,13 GB. Alle JSON-Texte mit jeder Einzelversion ≈ 7 GB. Der Speicherort lässt sich ändern („Speicherort …"), z. B. auf eine externe Festplatte.


## Oberfläche

![Geteilte Ansicht](screenshots/split-view-commentary-annotated.jpg)

*Zwei Lesefenster nebeneinander (Genesis mit Kommentarfenster links, Sanhedrin rechts) mit der kompakten Werkzeugleiste.*

## Über das Projekt

Der Name ist das hebräische Wort **סַפְרָן** (*safran*): Schreiber, im modernen Hebräisch Bibliothekar, von derselben Wurzel wie *sefer* (Buch). Die App entsteht bei [talmud.de](https://talmud.de). Sie lädt nie etwas zu Sefaria hoch; die Texte von Sefaria sind nicht Teil der App.

## Weiteres

- [Entwicklung, Build und Tests](docs/DEVELOPMENT.md) (englisch)
- [Quellen und Lizenzen](SOURCES.de.md): Sefaria, OSHB, ETCBC, CATSS, Karten, Audio, Gliederungen
- [Änderungen](CHANGELOG.md) (englisch)

## Lizenz

Der Quellcode dieser App steht unter der [MIT-Lizenz](LICENSE). Die Texte haben eigene Lizenzen, siehe [SOURCES.de.md](SOURCES.de.md).

## Neu in 1.8

Bibelkarte und Jerusalem-Karte · Themen · Gliederungen für 39 Bücher mit Schalter 613 Mizwot · hebräische Lesung mit Versmarken · anpinnbare Fenster · beschriftete Knöpfe. Alles im [Changelog](CHANGELOG.md).
