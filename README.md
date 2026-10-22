# Sefaria Mac

Mac-App (Electron) ohne Web-Oberfläche: Beim Start öffnet sich direkt die **Offline-Bibliothek**. Dazu das Menü **Werkzeuge**:

## Offline-Bibliothek (Cmd+Shift+O)

Texte herunterladen und ohne Internet lesen – mit Fußnoten.

- **Herunterladen:** Katalog laden (einmalig, ca. 22 MB), dann Kategorien oder einzelne Bücher ankreuzen, Sprachen wählen (Hebräisch, Englisch, Deutsch) und herunterladen. Standard ist pro Sprache die zusammengeführte Fassung; deutsche Übersetzungen werden vollständig geladen. Abgebrochene Downloads lassen sich fortsetzen, vorhandene Dateien werden übersprungen.
- **Lesen:** Hebräisch, Englisch und Deutsch nebeneinander, Vers für Vers ausgerichtet. Kapitel bzw. Talmud-Seiten (2a, 2b …) per Auswahlliste oder Pfeiltasten. Fußnoten stehen unter dem jeweiligen Text (ein-/ausblendbar), Schriftgröße einstellbar. Einzelne Versionen lassen sich unter „Versionen“ an- und abwählen.
- **Suche:** Volltextsuche über alle heruntergeladenen Texte (auch in Fußnoten). Hebräische Vokal- und Betonungszeichen werden ignoriert. Klick auf einen Treffer öffnet die Fundstelle.
- **Speicherort:** Standardmäßig im Programmordner der App. Mit „Speicherort…“ lässt er sich ändern, z. B. auf eine externe Festplatte. „Im Finder zeigen“ öffnet den Ordner.
- Ohne Internetverbindung öffnet die App die Offline-Bibliothek automatisch, sobald schon Texte heruntergeladen sind.

Datenmenge (grobe Zahlen): alle zusammengeführten hebräischen Texte ca. 2,8 GB, englische ca. 0,5 GB, deutsche Übersetzungen (288 Fassungen, vor allem Tanach, Talmud, Mischna) ca. 0,13 GB. Alle JSON-Texte einschließlich aller Einzelversionen zusammen etwa 7 GB.

Datenquelle: der öffentliche Sefaria-Export (github.com/Sefaria/Sefaria-Export, Dateien im Google-Cloud-Speicher). Die Lizenzen der einzelnen Texte stehen in den Versionsangaben bei Sefaria.

## Weitere Werkzeuge

- **Buch herunterladen:** ganzes Buch oder Kapitelbereich als CSV (`Referenz,Text`), TXT oder JSON direkt von Sefaria. „Aktuellen Text herunterladen…“ übernimmt den Titel der gerade geöffneten Seite.
- **Upload-Vorbereitung:**
  1. TXT/Word (`.docx`) in eine CSV mit Referenzen umwandeln.
  2. CSV prüfen (doppelte Referenzen, Lücken, Reihenfolge, leere Texte, HTML-Tags, Steuerzeichen) und bereinigt speichern.
  3. Segmentzahl pro Kapitel mit der Struktur eines Sefaria-Textes vergleichen.

Die App lädt **nichts** zu Sefaria hoch.

## Bedienung

- Zurück/Vorwärts: Menü *Navigation*, Cmd+[ / Cmd+], oder Zwei-Finger-Wischen.

## Starten

1. Node.js 22 LTS installieren.
2. Im Projektordner:

```bash
npm install
npm start
```

## Als normale Mac-App bauen

```bash
npm run dist
```

Die `.dmg` liegt danach in `dist/`. Die App ist nicht signiert: Beim ersten Start Rechtsklick → „Öffnen“.

## Tests (Logik ohne Oberfläche)

```bash
npm test
```

## Neu: Fußnoten, Seitenleiste, eigene Texte

- **Fußnoten**: Im Reiter „Lesen“ gibt es oben „Fußnoten“ – *per Klick öffnen* (Klick auf das kleine Zeichen im Text klappt die Fußnote auf/zu), *immer anzeigen* oder *ausblenden*.
- **Bücherliste** links lässt sich mit „☰ Bücherliste“ oder Cmd+B ein- und ausklappen.
- **Eigene Texte**: Knopf „＋ Eigener Text…“. Formate: TXT/MD und Word (eine Zeile = ein Vers, eine Zeile „Kapitel 2“ beginnt ein Kapitel), CSV (`Titel 1:1,Text`) oder JSON. Gibst du denselben Titel wie ein vorhandenes Buch an (z. B. „Genesis“), erscheint dein Text als zusätzliche Spalte neben Hebräisch/Englisch/Deutsch; sonst unter „Eigene Texte“. Eigene Texte sind auch in der Suche enthalten und lassen sich in der Versionenliste mit ✕ wieder entfernen (die Originaldatei bleibt unberührt). Sie liegen im Unterordner `own/` der Bibliothek.
- **Feste Leiste**: Titel, Abschnittsauswahl und Versionen bleiben beim Scrollen oben stehen.
- **Suche im Text**: Cmd+F öffnet unten rechts eine Suchleiste für den angezeigten Text (Enter = nächster Treffer, Shift+Enter = vorheriger, Esc = schließen).
- **Springen**: Im Feld „Springen“ in der Leiste eine Stelle eingeben (z. B. `3`, `2:5`, `Daf 3a`, `gen. 1:1`, `ber. 3`) und Enter drücken; der Buchname darf abgekürzt sein. Die Suche im Text (Cmd+F) startet erst mit Enter.
- **Verlauf**: Links in der Bücherliste steht „Zuletzt geöffnet“ (die letzten Bücher samt Abschnitt); ein Klick springt dorthin zurück. Mit ✕ lässt sich der Verlauf löschen.
- **Verknüpfungen**: Reiter „Herunterladen“ → Karte 4 (einmalig ca. 680 MB, danach offline). Im Lesen-Reiter zeigt jeder Vers mit Verknüpfungen ein 🔗n; Klick öffnet rechts ein Fenster, gruppiert nach Kategorie und Buch, mit Filter. Ein Klick auf eine Stelle öffnet sie, sofern das Buch lokal vorhanden ist (sonst „nicht lokal“); ▸ zeigt eine Textvorschau. „🔗 Links“ in der Leiste zeigt alle Verknüpfungen des Abschnitts. Grenze: nur für Bücher mit normalem Kapitel/Vers-Aufbau (nicht für komplexe Texte wie Haggadah).
- **Tabs**: Über dem Text gibt es Tabs. „＋“ oder Cmd+T öffnet einen leeren Tab; Cmd+Klick (oder Shift+Klick) auf ein Buch in der Liste, im Verlauf, in einem Suchtreffer oder auf eine Verknüpfung öffnet es in einem neuen Tab. Ein normaler Klick ersetzt den aktuellen Tab. Jeder Tab merkt sich Buch, Versionen, Abschnitt und Scrollposition; ✕ oder Mittelklick schließt ihn.
- **Bücherliste filtern**: Beim Filtern sind die obersten zwei Ebenen aufgeklappt, die einzelnen Texte noch nicht; hinter jeder steht die Trefferzahl, z. B. „Midrash (3)“. Was du selbst aufklappst, bleibt beim Weitertippen offen.
- **Neuer Tab**: Im leeren Tab steht ein Eingabefeld bereit (z. B. `Gen. 1`, `Berakhot 2a:3` oder nur ein Buchname) – Enter öffnet die Stelle.
- Das Verknüpfungsfenster behält Titel und Filter beim Scrollen; die oberste Ebene (Kategorien) ist in Bücherliste und Verknüpfungen farbig hinterlegt und fett, die Ebenen darunter eingerückt und schlichter.
- **Hebräische Schrift**: Der hebräische Text wird in **SBL Hebrew** gesetzt, sofern die Schrift auf dem Mac installiert ist (kostenlos bei sbl.org / „SBL Hebrew“ von der Society of Biblical Literature installieren; danach App neu starten). Sonst weicht die App auf Ezra SIL, Times New Roman o. ä. aus.

## Weitere Funktionen (Oktober 2026)

- **Tastatur**: ← / → = voriger/nächster Abschnitt; Cmd+T neuer Tab; Cmd+W Tab schließen (Cmd+Shift+W Fenster); Cmd+1…9 Tab wählen (9 = letzter); Cmd+Alt+←/→ Tab links/rechts; Cmd+F Suche im Text; Cmd+B Bücherliste.
- **Sitzung**: Offene Tabs (Buch, Versionen, Abschnitt, Scrollposition) werden beim nächsten Start wiederhergestellt.
- **Anzeige (⚙)**: Schriftgröße je Sprache, Vokalzeichen und Betonungszeichen (Teamim) ausblenden.
- **Notizen**: In jeder Zeile erscheint links beim Überfahren ein ☆. Klick = Lesezeichen mit optionaler Notiz. Reiter „Notizen“: alle Einträge, durchsuchbar, Klick springt zur Stelle. Gespeichert wird in `notes.json` im Bibliotheksordner.
- **Suche**: Filter nach Kategorie; „Ganze Wörter (mit Vorsilben)“ findet ארץ auch als הארץ/בארץ, aber nicht als Teil von ארצות.
- **Aktualisieren** (Reiter Herunterladen): prüft Dateigrößen gegen den Sefaria-Export und lädt nur geänderte/neue Fassungen nach.
- **Eigene Texte prüfen**: Direkt nach dem Einbinden eines eigenen Textes vergleicht die App die Zeilenzahlen je Abschnitt; Abweichungen stehen in einem Hinweis oberhalb des Textes (Klick springt hin), betroffene Zeilen sind orange markiert.
- **Export (⤓)**: Aktueller Abschnitt als PDF oder Word (.doc), wahlweise nur Zeilen von–bis, mit nummerierten Fußnoten, eigenen Notizen und Verknüpfungslisten.
- **Eigene Texte im Sefaria-Upload-Format**: CSV-Dateien mit den Kopfzeilen `Index Title`, `Version Title`, `Language` … und Fundstellen wie `Guide for the Perplexed, Part 1 1:1` oder `…, Part 2, Introduction 3` werden jetzt erkannt. Titel, Version und Sprache werden im Dialog vorbelegt, die Struktur (Teile, Einleitungen, Kapitel) entspricht den Sefaria-Exportdateien und lässt sich daher neben der Vorlage anzeigen und vergleichen.
- **Cmd+F**: Eigene Textsuche im angezeigten Abschnitt (Enter oder ▼ = nächster Treffer, Shift+Enter oder ▲ = voriger, Esc schließt). Gesucht wird ohne Rücksicht auf Groß-/Kleinschreibung und hebräische Vokalzeichen; geschlossene Fußnoten mit Treffer klappen automatisch auf. Beim Wechsel des Abschnitts wird neu gesucht.
- **Vor/Zurück (←/→, Cmd+[ / Cmd+], Maus-Zurücktaste)**: geht den Verlauf des aktuellen Tabs durch, auch über Buchwechsel hinweg.
- **Springen**: `14 2` (Leerzeichen genügt), `14:2`, `Kapitel 14 Vers 2` – bei offenem Buch wird nur die Stelle eingegeben, mit Buchnamen davor wechselt die App das Buch.
- **Abschnittsliste**: bei Büchern mit Kapitel › Vers › Kommentar (z. B. Raschi) enthält die Auswahl nur noch die Kapitel; die Verse stehen untereinander im Kapitel. Treffer aus Suche und Sprung markieren die passende Zeile.
- **Kommentar-Bereich (💬 Kommentare, Cmd+K)**: öffnet rechts eine Leiste mit den Kommentaren zum gewählten Vers – z. B. Raschi und Ibn Esra direkt untereinander, ohne die Verknüpfungen einzeln zu öffnen. Vers wählen: Klick auf die Versnummer links (▲/▼ in der Leiste blättern weiter). Oben stehen Auswahl-Knöpfe je Kommentator (Auswahl und Sprache werden gemerkt; grau = Buch nicht in deiner Bibliothek). Klick auf den Namen öffnet den Kommentar in einem neuen Tab. Voraussetzung: Verknüpfungen sind geladen und die Kommentare liegen lokal vor (z. B. „Rashi on Genesis“ im Reiter Herunterladen).
- **Mehrere eigene Texte auf einmal**: „＋ Eigener Text…“ → mehrere Dateien wählen (Cmd/Shift-Klick) oder einfach ins Fenster ziehen. Je Datei Titel, Sprache und Versionsname anpassen, einzelne abwählen, dann „n Texte einbinden“. Dateien im Sefaria-Upload-Format füllen Titel, Version und Sprache selbst aus.
- **Kommentatoren-Liste einklappbar**: Im Kommentar-Bereich zeigt eine Zeile „▸ Kommentatoren: Rashi, Ibn Esra … · 4 lokal, 34 weitere“; Klick klappt die Auswahl auf/zu (gemerkt). Kommentatoren, die nicht in deiner Bibliothek liegen, stehen in einem eigenen eingeklappten Block.
- Ist im Kommentar-Bereich kein Kommentator gewählt, werden alle lokal vorhandenen Kommentare zum Vers gezeigt.
- Kommentar-Bereich zeigt nur Texte in der gewählten Sprache (Englisch/Deutsch/Hebräisch); ohne Auswahl nur die Kommentatoren, die in dieser Sprache vorhanden sind.
- Kommentare aus Werken mit Teilbereichen (z. B. „Rav Hirsch on Torah, Genesis“) werden jetzt erkannt und angezeigt.
- Kommentare: alle geladenen Fassungen einer Sprache werden durchprobiert; fehlt ein Vers, steht ein Hinweis statt stillem Weglassen.
- Kommentare aus Werken mit Standardteil (z. B. Ibn Ezra on Genesis) werden gefunden.
