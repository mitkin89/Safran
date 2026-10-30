// Oberflächensprache (Deutsch / Englisch). Deutsch ist der Originaltext im Code; für Englisch wird er hier nachgeschlagen.
//  - EN: exakter deutscher Text -> englischer Text; „{}“ steht für veränderliche Teile (Zahlen, Namen) und passt auf ganze Textknoten
//  - HTML: Absätze mit eingebetteten Auszeichnungen (data-i18n="…" in library.html) -> englisches HTML
//  - I18N.t('Text mit {}', a, b) für Stellen, die im Code zusammengesetzt werden
// Die Sprache steht in localStorage ('uiLang'); ein Wechsel lädt die Seite neu. Buchtexte (Zellen, Kommentare, Wörterbuchartikel) werden nie übersetzt.
(function () {
  'use strict';
  let lang = 'de';
  try { lang = localStorage.getItem('uiLang') || (/^de\b/i.test(navigator.language || '') ? 'de' : 'en'); } catch { /* egal */ }
  if (lang !== 'de' && lang !== 'en' && lang !== 'he') lang = 'de';
  const fill = (s, args) => { let i = 0; return String(s).replace(/\{#?\}/g, () => (i < args.length ? args[i++] : '')); };
  const api = { lang, loc: lang === 'de' ? 'de-DE' : lang === 'he' ? 'he-IL' : 'en-US', t: (s, ...a) => fill(s, a), tr: s => s, set(l) { try { localStorage.setItem('uiLang', l); } catch { /* egal */ } location.reload(); } };
  window.I18N = api;
  if (lang === 'de') return;

  const EN = {
    // ----- Karte -----
    'Orte dieses Abschnitts': 'Places of this section', 'Karte: Orte dieses Abschnitts': 'Map: places of this section', 'In der Gliederung': 'In the outline',
    'Mögliche Lage': 'Possible location', 'Zuordnung unsicher': 'identification uncertain', 'Sicherheit der Zuordnung nach der Forschung des neuesten Jahrzehnts (OpenBible.info)': 'Confidence of the identification according to the most recent decade of scholarship (OpenBible.info)',
    'heutige Grenzen': 'modern borders', 'Daneben': 'Nearby', 'Vergrößern': 'Zoom in', 'Verkleinern': 'Zoom out', 'Auf die Orte des Kapitels einpassen': 'Fit to the places of this chapter',
    'Entfernung messen': 'Measure distance', 'Jerusalem im Detail': 'Jerusalem in detail', 'Lage vermutet': 'Position conjectured', 'Die Quelle kennt hier nur den Stadtmittelpunkt von Jerusalem. Die Lage ist nach Nehemia 3 und der Forschung gesetzt und teils umstritten.': 'The source only gives the city centre of Jerusalem here. The position is set according to Nehemiah 3 and scholarship, and is partly disputed.', 'Deckkraft der Wilson-Karte': 'Opacity of the Wilson map', 'heutige Stadt': 'modern city', 'Gelände': 'Terrain', 'Namen': 'Names', 'Klicke Orte oder Punkte auf der Karte an. Esc beendet.': 'Click places or points on the map. Esc ends.', 'Luftlinie': 'Straight line', 'Tagesreisen zu Fuß (je 30 km, grob; echte Wege sind länger)': 'days on foot (30 km each, rough; real routes are longer)', 'Punkt': 'Point', 'Letzter Punkt zurück': 'Remove last point', 'Neu': 'Clear',
    'Höhenprofil': 'Elevation profile', 'höchster Punkt': 'highest point', 'tiefster Punkt': 'lowest point', 'Höhe': 'Elevation', 'Notiz zu diesem Ort': 'Note on this place',
    'Routen …': 'Routes …', 'Route ausblenden': 'hide route', 'Linien': 'lines', 'Linie': 'line', 'Als Messung übernehmen (Länge, Höhenprofil)': 'Use as measurement (length, elevation profile)', 'Routen: UBS MARBLE / Leen Ritmeyer (CC BY-SA 4.0). Bibelstelle von Safran zugeordnet, ungefähr.': 'Routes: UBS MARBLE / Leen Ritmeyer (CC BY-SA 4.0). Passage assigned by Safran, approximate.', 'Routen in diesem Kapitel': 'Routes in this chapter',
    'Ziehen, um die Höhe der Karte zu ändern (Doppelklick: Standard)': 'Drag to change the height of the map (double-click: default)',
    'Vorwort': 'Preface',
    'Karte': 'Map', 'alle Orte': 'all places', 'Karte: Orte in diesem Kapitel': 'Map: places in this chapter', 'Orte in diesem Kapitel': 'Places in this chapter', 'Zu diesem Kapitel sind keine Orte verzeichnet. „Alle Orte“ zeigt die ganze Karte.': 'No places are recorded for this chapter. “All places” shows the whole map.', 'Stellen': 'passages', 'Liste': 'list',
    'Gelände: Copernicus DEM (Copernicus-Programm der EU) · Küsten und Flüsse: Natural Earth · Orte: OpenBible.info (CC BY 4.0)': 'Terrain: Copernicus DEM (EU Copernicus programme) · Coasts and rivers: Natural Earth · Places: OpenBible.info (CC BY 4.0)',
    // ----- Kopfzeile, Menü -----
    'Lesen': 'Read', 'Suche': 'Search', 'Wörterbuch': 'Dictionary', 'Notizen': 'Notes',
    '✕ Schließen': '✕ Close', 'Schließen': 'Close', 'Schließen (Esc)': 'Close (Esc)',
    'Bücherliste ein-/ausblenden (Cmd+B)': 'Show/hide book list (Cmd+B)',
    'Gleichlauf: Blättern im ersten Fenster blättert im zweiten mit (für Parallelstellen)': 'Sync: turning pages in the first window also turns them in the second (for parallel passages)',
    'Zweites Lesefenster rechts ein-/ausblenden – so bleibt das erste Buch offen': 'Show/hide the second reading pane on the right – the first book stays open',
    'Dieses Fenster schließen': 'Close this pane', 'Weitere Funktionen': 'More',
    'Bücher': 'Books', 'Gleichlauf': 'Sync', 'Zweites Fenster': 'Second pane', 'Im Buch': 'In book', 'Anzeige': 'Display',
    '⬇ Herunterladen…': '⬇ Download…', 'Bücher, Verknüpfungen und Updates herunterladen': 'Download books, links and updates',
    '📖 Wörterbuch …': '📖 Dictionary …', 'Wörterbuch aufschlagen und DSL-Wörterbücher verwalten': 'Look things up and manage DSL dictionaries',
    '＋ Eigener Text…': '＋ Add own text…', 'Eigenen Text (TXT, Word, CSV, JSON) zum Testen einbinden': 'Add your own text (TXT, Word, CSV, JSON) for testing',
    'Speicherort…': 'Storage location…', 'Ordner wählen, in dem die heruntergeladenen Texte liegen (z. B. externe Festplatte)': 'Choose the folder that holds the downloaded texts (e.g. an external drive)',
    'Aktueller Speicherort: {}': 'Current storage location: {}',
    'Eigene Texte für GitHub exportieren …': 'Export own texts for GitHub …',
    'Schreibt alle eigenen Texte in einen Ordner, den du ins Projekt (bundled/) legst, damit sie mit der App auf GitHub verteilt werden': 'Writes all your own texts to a folder that you put into the project (bundled/), so they are distributed with the app on GitHub',
    'Nach Updates suchen': 'Check for updates', 'Prüft, ob eine neuere Version von Safran auf GitHub veröffentlicht ist': 'Checks whether a newer version of Safran has been released on GitHub',
    'Beim Start nach Updates suchen': 'Check for updates at startup', 'Safran fragt beim Start einmal bei GitHub nach einer neuen Version': 'Safran asks GitHub once at startup whether there is a new version',
    'Im Finder zeigen': 'Show in Finder', 'Im Explorer zeigen': 'Show in Explorer',
    'Sprache': 'Language', 'Oberflächensprache': 'Interface language',
    'Neuerungen & Download': 'What’s new & download', 'Später': 'Later',
    'Safran {} ist verfügbar (installiert: {}).': 'Safran {} is available (installed: {}).',
    'Du hast die neueste Version ({}).': 'You have the latest version ({}).',
    'Update-Suche fehlgeschlagen: {}': 'Update check failed: {}',
    // ----- Bücherliste, Tabs, Lesen -----
    'Zuletzt geöffnet': 'Recently opened', 'Ein-/ausklappen': 'Expand/collapse', 'Liste leeren': 'Clear list', 'Liste „Zuletzt geöffnet“ leeren': 'Clear the “Recently opened” list',
    'Titel filtern …': 'Filter titles …', 'Bücherliste schließen (Cmd+B)': 'Close book list (Cmd+B)',
    'Herunterladen': 'Download', 'kannst du Bücher und Sprachen auswählen.': 'you can choose books and languages.',
    'Zurück im Verlauf (Cmd+[)': 'Back in history (Cmd+[)', 'Vorwärts im Verlauf (Cmd+])': 'Forward in history (Cmd+])',
    'Voriger Abschnitt': 'Previous section', 'Nächster Abschnitt': 'Next section',
    'Springen: 1:5 oder gen. 2:3': 'Jump to: 1:5 or gen. 2:3', 'Stelle eingeben, z. B. 3, 3:7, Daf 2a oder gen. 1:1 – mit Enter springen': 'Enter a reference, e.g. 3, 3:7, Daf 2a or gen. 1:1 – press Enter to jump',
    'Versionen': 'Versions', 'Versionen {#}/{#}': 'Versions {}/{}',
    'Nur in diesem Buch suchen': 'Search only in this book', 'Wörterbuch (Doppelklick auf ein Wort schlägt es nach)': 'Dictionary (double-click a word to look it up)',
    'Kommentare zum gewählten Vers (Cmd+K)': 'Commentaries on the selected verse (Cmd+K)', 'Verknüpfungen zu diesem Abschnitt anzeigen': 'Show links for this section',
    'Anzeige, Fußnoten, Schrift, Export': 'Display, footnotes, font, export', 'Hinweis ausblenden': 'Dismiss',
    'Neuer Tab': 'New tab', 'Neuer Tab (Cmd+T)': 'New tab (Cmd+T)', 'Tab schließen': 'Close tab',
    'Neuer Tab – Stelle oder Buch eingeben (z. B.': 'New tab – enter a reference or book (e.g.',
    ') und Enter drücken, oder links ein Buch wählen.': ') and press Enter, or choose a book on the left.',
    'Nicht gefunden – nur Bücher aus deiner Bibliothek sind möglich.': 'Not found – only books from your library are possible.',
    'Lade …': 'Loading …', 'Lade Katalog …': 'Loading catalog …', 'Starte …': 'Starting …',
    'In den gewählten Versionen ist kein Text vorhanden.': 'There is no text in the selected versions.',
    'Keine Treffer.': 'No matches.', 'Noch keine Texte heruntergeladen.': 'No texts downloaded yet.', 'Nichts gefunden.': 'Nothing found.',
    'Eigene Texte': 'Own texts', 'Eigenen Text entfernen': 'Remove own text', 'Diesen eigenen Text entfernen': 'Remove this own text', 'eigen': 'own',
    'Eigene Texte zu „{}“ aus der Bibliothek entfernen?\n\n{}\n\n(Die Originaldateien bleiben unberührt.)': 'Remove your own texts for “{}” from the library?\n\n{}\n\n(The original files are not touched.)',
    'Diesen eigenen Text aus der Bibliothek entfernen? (Die Originaldatei bleibt unberührt.)': 'Remove this own text from the library? (The original file is not touched.)',
    'Als Upload-CSV für Sefaria speichern (Ref,Text)': 'Save as upload CSV for Sefaria (Ref,Text)', 'Quelldatei neu einlesen ({})': 'Re-read source file ({})',
    'zusammengeführt': 'merged', 'zusammengeführte Fassung': 'merged version', 'Hebr.': 'Heb.', 'Engl.': 'Eng.', 'Deutsch': 'German', 'Englisch': 'English', 'Hebräisch': 'Hebrew', 'Andere': 'Other',
    // ----- Verknüpfungen -----
    'Verknüpfungen': 'Links', 'Kommentare': 'Commentaries', 'Kommentare zu {}': 'Commentaries on {}', 'Keine Verknüpfungen.': 'No links.',
    '{#} Verknüpfungen': '{} links', '{} – {} Verknüpfungen': '{} – {} links', 'Vorschau': 'Preview', 'Keine Vorschau möglich.': 'No preview available.',
    '· nicht lokal': '· not local', '… {#} weitere (Filter benutzen)': '… {} more (use the filter)',
    'Filtern (z. B. Rashi, Midrash) …': 'Filter (e.g. Rashi, Midrash) …',
    '✓ vollständig vorhanden': '✓ complete', '{#} von {#} Dateien verarbeitet': '{} of {} files processed', 'noch nicht heruntergeladen': 'not downloaded yet',
    'Erneut prüfen': 'Check again', 'Fortsetzen': 'Resume', 'Verknüpfungen herunterladen': 'Download links', '{#} Fehler (erneut starten zum Fortsetzen)': '{} errors (start again to resume)',
    'Öffne ein Buch.': 'Open a book.', 'Klicke links bei einer Zeile auf die Versnummer.': 'Click the verse number of a line on the left.',
    'Dafür werden die Verknüpfungen gebraucht: Reiter „Herunterladen“ → Karte „4 · Verknüpfungen“.': 'This needs the links: “Download” tab → card “4 · Links”.',
    'Zu diesem Vers gibt es keine Kommentare in den Verknüpfungen.': 'There are no commentaries for this verse in the links.',
    'Wähle oben einen Kommentator. Grau dargestellte Kommentatoren musst du erst im Reiter „Herunterladen“ laden.': 'Choose a commentator above. Greyed-out commentators must first be downloaded in the “Download” tab.',
    'Kommentatoren': 'Commentators', 'Voriger Vers': 'Previous verse', 'Nächster Vers': 'Next verse', 'Kommentartext kleiner': 'Smaller commentary text', 'Kommentartext größer': 'Larger commentary text',
    'Alle Arten': 'All types', 'Zeilen': 'Rows', 'Versblöcke': 'Verse blocks', 'Freie Notizen': 'Free notes', 'nur mit Notiz': 'with note only', 'Art der Notiz': 'Type of note',
    'Tags, mit Komma getrennt (z. B. Klasse 5, Predigt)': 'Tags, comma-separated (e.g. Class 5, Sermon)', 'Klicken: Notiz bearbeiten': 'Click: edit note', 'Lesezeichen / Notiz': 'Bookmark / note', 'Notiz geändert': 'Note changed',
    'zuletzt geändert': 'last modified', 'Kommentare zu dieser Stelle': 'Commentaries for this passage', '{#} von {#} · {#} Bücher': '{} of {} · {} books', 'Eigene Notizen': 'My notes', 'Keine Treffer.': 'No matches.', 'Filter löschen': 'Clear filters',
    'Text nicht geladen – im Reiter „Herunterladen“ laden.': 'Text not loaded – download it in the “Download” tab.', 'Zum Herunterladen': 'Go to Download',
    'Nur die angezeigten (gefilterten) Notizen exportieren': 'Export only the shown (filtered) notes', 'Ohne meine Notizen exportieren (Arbeitsblatt)': 'Export without my notes (worksheet)', 'Nur Stelle und Hebräisch, ohne Übersetzung': 'Passage and Hebrew only, no translation',
    'Aus der Sicherung: {#} neu, {#} aktualisiert, {#} unverändert.': 'From the backup: {} new, {} updated, {} unchanged.', 'Achtung: Die Datei stammt nicht aus Safran.': 'Warning: this file is not from Safran.', 'Neu zum Beispiel:': 'New, for example:',
    'Zusammenführen? Vorhandene bleiben erhalten, nur ältere Fassungen werden ersetzt.': 'Merge? Existing notes are kept, only older versions are replaced.',
    'Diese Version aus der Anzeige entfernen': 'Remove this version from the view', 'Zu diesem Buch springen': 'Jump to this book', 'Zur Übersicht': 'Back to overview', '📖 Alle als Lesetext öffnen': '📖 Open all as reading text', 'Suche': 'Search', 'Suche läuft …': 'Searching …', '{#} Verse in {#} Büchern': '{#} verses in {#} books', 'alle Formen des Wortes': 'all forms of the word', 'Weitere laden': 'Load more', 'Parascha': 'Parashah', 'Grammatik (Tanach)': 'Grammar (Tanakh)', 'Grammatik': 'Grammar', 'Wortart': 'Part of speech', 'Stamm': 'Stem', 'Zeitform': 'Tense / form', 'Person': 'Person', 'Genus': 'Gender', 'Numerus': 'Number', 'Status': 'State', 'Suffix': 'Suffix', 'Artikel': 'Article', 'Verb': 'Verb', 'Nomen': 'Noun', 'Eigenname': 'Proper noun', 'Gentilizium': 'Gentilic', 'Adjektiv / Zahl': 'Adjective / number', 'Pronomen': 'Pronoun', 'Präposition': 'Preposition', 'Konjunktion': 'Conjunction', 'Adverb': 'Adverb', 'Partikel': 'Particle', 'Perfekt': 'Perfect', 'Perfekt consecutivum': 'Perfect consecutive', 'Imperfekt': 'Imperfect', 'Wajjiqtol': 'Wayyiqtol', 'Kohortativ': 'Cohortative', 'Jussiv': 'Jussive', 'Imperativ': 'Imperative', 'Partizip aktiv': 'Active participle', 'Partizip passiv': 'Passive participle', 'Infinitiv absolutus': 'Infinitive absolute', 'Infinitiv constructus': 'Infinitive construct', 'Singular': 'Singular', 'Plural': 'Plural', 'Dual': 'Dual', 'absolut': 'absolute', 'constructus': 'construct', 'bestimmt': 'determined', 'mit': 'with', 'ohne': 'without', 'Kommentare zu diesem Vers': 'Commentaries on this verse', 'Verknüpfungen zu diesem Vers': 'Links for this verse', 'Dieses Kapitel am ersten Treffer im Lesen öffnen (neuer Tab)': 'Open this chapter at the first hit in the reader (new tab)', 'Nur diese Version anzeigen': 'Show only this version', 'Tanach: nur Westminster': 'Tanakh: Westminster only', 'Alle Formen (Lemma)': 'All forms (lemma)', '📖 Als Lesetext': '📖 As reading text', '☰ Als Liste': '☰ As list', 'Lade Lesetext …': 'Loading reading text …', 'Im Lesen öffnen': 'Open in reader', 'Keine Fundstellen mit Kapitelangabe.': 'No hits with a chapter reference.',
    'Im Tanach wird hebräisch nur der Westminster-Text durchsucht (jeder Vers nur einmal, mit Morphologie)': 'In the Tanakh only the Westminster text is searched in Hebrew (each verse once, with morphology)',
    'Findet alle Formen eines Wortes: כאב findet auch כאבים und תכאבו (über das Lemma der Westminster-Morphologie; gilt nur für den hebräischen Tanach)': 'Finds all forms of a word: כאב also finds כאבים and תכאבו (via the lemma of the Westminster morphology; Hebrew Tanakh only)',
    'Alle Fundstellen wie beim Lesen untereinander in einem neuen Tab zeigen, nach Buch und Kapitel geordnet, mit den gewählten Versionen nebeneinander und einer Übersicht der Bücher': 'Show all hits one below the other as when reading in a new tab, ordered by book and chapter, with the chosen versions side by side and an overview of the books', 'Alle': 'All', 'Keine': 'None', 'Klassische': 'Classic', 'Name filtern …': 'Filter by name …', '▲ Vers': '▲ Verse', '▼ Vers': '▼ Verse',
    'Alle {#} ({})': 'All {} ({})', '{#} von {#} gewählt': '{} of {} selected', 'keiner gewählt': 'none selected', '{#} Stellen zu diesem Vers': '{} passages for this verse',
    'Klick: Kommentar ein-/ausklappen · ↗: öffnet {} in einem neuen Tab · Rechtsklick: weitere Möglichkeiten': 'Click: expand/collapse this commentary · ↗: opens {} in a new tab · Right-click: more options', 'Buch im neuen Tab öffnen': 'Open book in a new tab',
    'Kommentatoren ein-/ausklappen': 'Expand/collapse commentators',
    'Klick: öffnet {} in einem neuen Tab · Rechtsklick: weitere Möglichkeiten': 'Click: opens {} in a new tab · Right-click: more options',
    'Ziehen, um die Breite zu ändern (Doppelklick: Standard)': 'Drag to change the width (double-click: default)', 'Ziehen, um die Breite zu ändern': 'Drag to change the width',
    // ----- Kontextmenüs -----
    'Öffnen': 'Open', 'Öffnen: {}': 'Open: {}', 'Im neuen Tab öffnen': 'Open in new tab', 'Im zweiten Fenster öffnen': 'Open in second pane', 'Im zweiten Fenster (rechts) öffnen': 'Open in second pane (right)',
    'Bitte nicht den Bibliotheksordner selbst (oder einen Ordner darüber/darin) wählen, sondern den Ordner „bundled“ im Projekt.': 'Please do not choose the library folder itself (or a folder above/inside it) but the “bundled” folder in the project.',
    'Themen': 'Topics', 'Themen (Sefaria Topics) zu diesem Abschnitt': 'Topics (Sefaria Topics) for this section', 'Thema suchen (z. B. Abraham, Pessach) …': 'Search topics (e.g. Abraham, Passover) …',
    '5 · Themen (optional)': '5 · Topics (optional)', 'Themen herunterladen': 'Download topics', 'Erneut laden': 'Reload', 'Fortsetzen': 'Resume',
    'Sefaria ordnet Stellen Themen zu (Personen, Orte, Begriffe, Feiertage), mit Beschreibung und „Notable Sources“. Mit diesen Daten zeigt der Reiter „Lesen“ zu jedem Abschnitt die passenden Themen und eine Themenübersicht. Die Daten werden bei dir aus Sefarias Schnittstelle geladen (einige Minuten, ca. 60 MB).': 'Sefaria assigns passages to topics (people, places, concepts, holidays), with a description and “Notable Sources”. With this data the Reading tab shows the matching topics for each section and a topic overview. The data is loaded on your computer from Sefaria’s interface (a few minutes, about 60 MB).',
    '{} Fehler (erneut starten zum Fortsetzen)': '{} errors (start again to resume)', 'Lade Themenliste': 'Loading topic list', 'Lade Themen': 'Loading topics', 'Ordne Verse zu': 'Assigning verses',
    '{} Treffer': '{} matches', 'Themen in {}': 'Topics in {}', 'Gib einen Namen ein, um ein Thema zu suchen.': 'Type a name to search for a topic.', 'Keine Themen zu diesem Abschnitt.': 'No topics for this section.',
    'V. {}': 'v. {}', 'Thema nicht gefunden.': 'Topic not found.', 'Notable Sources': 'Notable Sources', 'Alle Quellen': 'All Sources', 'Quellen': 'Sources', 'Relevanz': 'Relevance', 'Chronologisch': 'Chronological', 'Mehr anzeigen': 'Show more',
    'Ist ein': 'Is a', 'Übergeordnet zu': 'Parent of', 'Untergeordnet zu': 'Child of', 'Verwandt': 'Related', 'Gehört zu': 'Member of', 'Rolle': 'Role', 'Beteiligt an': 'Participates in', 'Beteiligte': 'Participants', 'Ehepartner': 'Spouse', 'Geschwister': 'Siblings', 'Gegensatz': 'Opposed', 'Beziehungen': 'Relationships',
    'Verteilung auf die Bücher': 'Distribution across books', 'Vorkommen': 'Occurrences', 'Verse mit Treffer': 'Verses with a hit',
    'Skala': 'Scale', 'Linear': 'Linear', 'Logarithmisch': 'Logarithmic',
    'Fassungen': 'Versions',
    'Alle Fassungen': 'All versions',
    'Suche nach': 'Search for',
    'Inhalt': 'Contents',
    'Gliederung': 'Outline',
    'Kapitel': 'Chapter',
    'Keine Gliederung verfügbar.': 'No outline available.',
    'Fehler': 'Error', 'Fertig': 'Done', 'Dateien': 'files', 'lade': 'downloading', 'entpacke': 'unpacking',
    'Noch keine Audio-Pakete veröffentlicht.': 'No audio packages published yet.',
    'Verfügbare Bücher anzeigen': 'Show available books', 'Auswahl herunterladen': 'Download selection',
    'Oder die Aufnahme aus dem Internet laden (Hebräisches Alten Testament, gelesen von Abraham Schmueloff; Download von GitHub, pro Buch ein Paket):': 'Or download the recording from the internet (Hebrew Old Testament read by Abraham Schmueloff; download from GitHub, one package per book):',
    'Lösen: über dem Text schweben': 'Unpin: float over the text', 'Anpinnen: neben dem Text festhalten': 'Pin: keep beside the text',
    '613 Mizwot': '613 mitzvot',
    'Zurück zur Gliederung': 'Back to the outline',
    '☰ Gliederung': '☰ Outline',
    'Gliederung dieses Buches (Wochenabschnitte, Kapitel, Absätze)': 'Outline of this book (weekly portions, chapters, paragraphs)',

    'Vor- und zurückspulen': 'Seek forward / back',
    '🔊 Audio-Ordner …': '🔊 Audio folder …',
    'Ordner mit Audiodateien pro Vers (z. B. Genesis_001_001.mp3) wählen; dann erscheint im Lesen ein ▶ bei jedem Vers': 'Choose a folder with one audio file per verse (e.g. Genesis_001_001.mp3); a ▶ then appears next to each verse in Reading',
    'Weitere Bücher anzeigen': 'Show more books',
    '… und {#} weitere': '… and {#} more',
    '6 · Audio (optional)': '6 · Audio (optional)',
    'Audio-Ordner wählen …': 'Choose audio folder …',
    'Vorheriger Vers': 'Previous verse',
    'Pause / Weiter': 'Pause / resume',
    'Nächster Vers': 'Next verse',
    'Beenden': 'Stop',
    'Geschwindigkeit': 'Speed',
    'Kein Audio-Ordner gewählt.': 'No audio folder chosen.',
    '{#} Audiodateien gefunden': '{#} audio files found',
    'Ordner nicht lesbar.': 'Folder not readable.',
    'Vers anhören': 'Listen to verse',
    'Treffer nach Buch': 'Hits by book',
    'Genau dieses Wort': 'Exact word only',
    'Nur genau dieses Wort: ohne Vorsilben und ohne andere Formen. רבה findet dann nicht mehr הרבה (hebräisch und andere Sprachen; schaltet „Ganze Wörter“ und „Alle Formen“ ab)': 'Only exactly this word: no prefixes and no other forms. רבה then no longer finds הרבה (Hebrew and other languages; overrides “Whole words” and “All forms”)',
    'Verkleinern': 'Zoom out',
    'Vergrößern': 'Zoom in',
    'im Tanach': 'in the Tanakh',
    'Quellen filtern (z. B. Rashi, Genesis) …': 'Filter sources (e.g. Rashi, Genesis) …', 'Bücher': 'Books', 'Alle Bücher': 'All books',
    'Keine Quellen für diesen Filter.': 'No sources for this filter.',
    'Kopieren': 'Copy', 'Die Suche ist fehlgeschlagen.': 'The search failed.', 'Die Bibliothek konnte nicht geladen werden: {}': 'The library could not be loaded: {}',
    'Sucht im hebräischen Tanach (Westminster) nach grammatischen Merkmalen, auch ohne Suchwort. Mit Suchwort: nur Wörter, die dazu passen (Form oder Lemma).': 'Searches the Hebrew Tanakh (Westminster) for grammatical features, even without a search word. With a search word: only words that match it (form or lemma).',
    'Im Wörterbuch nachschlagen: „{}“': 'Look up in dictionary: “{}”', 'Referenz kopieren: {}': 'Copy reference: {}', 'Auf sefaria.org öffnen': 'Open on sefaria.org',
    'Im neuen Tab nachschlagen: „{}“': 'Look up in new tab: “{}”', 'Hier nachschlagen: „{}“': 'Look up here: “{}”',
    'Aktuellen Artikel auswählen': 'Select current article', 'Alles auswählen': 'Select all',
    'Eigene Texte ({#}) entfernen …': 'Remove own texts ({}) …', 'Eigenen Text entfernen …': 'Remove own text …',
    // ----- OSHB-Popup -----
    'Zusatz der Septuaginta (kein hebräisches Gegenstück)': 'Plus in the Septuagint (no Hebrew counterpart)', 'Minus der Septuaginta (hebräisches Wort ohne griechisches Gegenstück)': 'Minus in the Septuagint (Hebrew word without Greek counterpart)',
    'Doublette: ein hebräisches Wort ist doppelt übersetzt': 'Doublet: one Hebrew word is translated twice', 'Infinitivus absolutus im Hebräischen': 'Infinitive absolute in the Hebrew', 'Transliteriertes hebräisches Wort': 'Transliterated Hebrew word',
    'Griechisches Präverb für eine hebräische Präposition': 'Greek preverb for a Hebrew preposition', 'Komparativ/Superlativ (hebr. מ)': 'Comparative/superlative (Hebrew מ)', 'Gegenstück steht an anderer Stelle im Vers (Umstellung oder Verteilung)': 'Counterpart appears elsewhere in the verse (transposition or distribution)',
    'Rückübersetzung (vermutliche hebräische Vorlage)': 'Retroversion (presumed Hebrew Vorlage)', 'Besonderheiten': 'Special features',
    'Hebräisches Wort (CATSS)': 'Hebrew word (CATSS)', 'Hebräisches Gegenstück (CATSS)': 'Hebrew counterpart (CATSS)', 'Kein hebräisches Gegenstück (Zusatz der Septuaginta)': 'No Hebrew counterpart (plus in the Septuagint)',
    'Septuaginta interlinear (Hebräisch über Griechisch)': 'Septuagint interlinear (Hebrew above Greek)', 'Bei der Septuaginta (CATSS): hebräisches Wort über der griechischen Wortgruppe': 'Septuagint (CATSS): Hebrew word above its Greek word group',
    'Parallelstellen': 'Parallel passages', 'Wurzel: ': 'Root: ', 'Substantiv': 'Noun', 'Verb': 'Verb', 'Präposition': 'Preposition', 'Konjunktion': 'Conjunction', 'Pronomen': 'Pronoun', 'Adverb': 'Adverb', 'Adjektiv': 'Adjective', 'Interjektion': 'Interjection', 'Eigenname': 'Proper noun', 'unbekannt': 'unknown',
    'Singular': 'Singular', 'Plural': 'Plural', 'maskulin': 'masculine', 'feminin': 'feminine', 'Emphaticus': 'Emphatic', 'Absolutus': 'Absolute', 'Constructus': 'Construct', 'Absolutus oder Constructus': 'Absolute or construct',
    'Im Wörterbuch nachschlagen': 'Look up in dictionary', 'Stamm: ': 'Stem: ', 'Zeit/Form: ': 'Tense/form: ',
    // ----- Suche -----
    'Suchbegriff (Hebräische Vokalzeichen werden ignoriert)': 'Search term (Hebrew vowel points are ignored)',
    'Ganze Wörter (mit Vorsilben)': 'Whole words (with prefixes)',
    'Das Suchwort muss ein ganzes Wort sein; hebräische Vorsilben (ו ה ב כ ל מ ש) davor sind erlaubt: ארץ findet auch הארץ und בארץ, aber nicht ארצות': 'The search word must be a whole word; Hebrew prefixes (ו ה ב כ ל מ ש) in front are allowed: ארץ also finds הארץ and בארץ, but not ארצות',
    'Suchen': 'Search', 'Abbrechen': 'Cancel',
    'Wort 2 (optional), z. B. gott': 'Word 2 (optional), e.g. god', 'Wort 3 (optional), z. B. erd*': 'Word 3 (optional), e.g. earth*',
    'Abstand: beliebig im Vers': 'Distance: anywhere in the verse', 'direkt nebeneinander': 'directly adjacent',
    'höchstens 1 Wort dazwischen': 'at most 1 word between', 'höchstens 2 Wörter dazwischen': 'at most 2 words between', 'höchstens 3 Wörter dazwischen': 'at most 3 words between',
    'höchstens 5 Wörter dazwischen': 'at most 5 words between', 'höchstens 10 Wörter dazwischen': 'at most 10 words between', 'höchstens 20 Wörter dazwischen': 'at most 20 words between',
    'Wie weit dürfen die Wörter höchstens auseinander stehen? Gezählt werden die Wörter dazwischen, innerhalb eines Verses bzw. Absatzes.': 'How far apart may the words be at most? The words in between are counted, within one verse or paragraph.',
    'Reihenfolge einhalten': 'Keep word order', 'Die Wörter müssen in der Reihenfolge der Eingabefelder stehen': 'The words must appear in the order of the input fields',
    'Fuzzy (ähnliche Schreibweise)': 'Fuzzy (similar spelling)', 'Findet auch ähnlich geschriebene Wörter (siehe Hilfe unten)': 'Also finds similarly spelled words (see help below)',
    'Hilfe: Platzhalter, Fuzzy und Wörter in der Nähe': 'Help: wildcards, fuzzy and nearby words',
    'Platzhalter:': 'Wildcards:', 'steht für beliebig viele Buchstaben,': 'stands for any number of letters,', 'für genau einen.': 'for exactly one.',
    'findet Anfang, Anfänge, anfangen;': 'finds Anfang, Anfänge, anfangen;', 'findet Meer und Mehr. Ohne Platzhalter muss das Wort vollständig übereinstimmen (': 'finds Meer and Mehr. Without wildcards the word must match completely (',
    'findet „Gott“, aber nicht „Gottes“ – dafür': 'finds “Gott” but not “Gottes” – use', 'Fuzzy:': 'Fuzzy:',
    'findet auch ähnlich geschriebene Wörter, z. B. bei Tippfehlern, Umschriften oder alten Schreibweisen. Erlaubt ist bei Wörtern mit 4–6 Buchstaben eine Abweichung, ab 7 Buchstaben zwei; kürzere Wörter müssen genau stimmen. Eine Abweichung ist ein falscher, fehlender oder zusätzlicher Buchstabe. Akzente und Umlaute werden ignoriert. Beispiele:': 'also finds similarly spelled words, e.g. for typos, transliterations or old spellings. Words with 4–6 letters may differ by one letter, words with 7 or more by two; shorter words must match exactly. One difference is a wrong, missing or extra letter. Accents and umlauts are ignored. Examples:',
    'findet auch „Rashi“': 'also finds “Rashi”', 'findet auch „Abraham“': 'also finds “Abraham”', 'findet auch „Šemuél“ und „Shemuel“': 'also finds “Šemuél” and “Shemuel”', 'findet auch „אלוהים“': 'also finds “אלוהים”',
    'findet „Gott“, aber nicht „gold“ (zu kurz für Abweichungen)': 'finds “Gott” but not “gold” (too short for differences)',
    'Wörter mit Platzhaltern werden nicht zusätzlich unscharf gesucht.': 'Words with wildcards are not additionally searched fuzzily.',
    'Wörter in der Nähe:': 'Nearby words:',
    'Sobald mehrere Wörter, ein Platzhalter oder Fuzzy im Spiel sind, gilt: ganze Wörter statt Wortteile. „Ganze Wörter (mit Vorsilben)“ erlaubt dabei hebräische Vorsilben.': 'As soon as several words, a wildcard or fuzzy matching are involved, whole words are matched instead of word parts. “Whole words (with prefixes)” still allows Hebrew prefixes.',
    '⤓ Treffer als CSV': '⤓ Matches as CSV', 'Alle angezeigten Treffer als CSV-Datei speichern': 'Save all displayed matches as a CSV file',
    'Durchsucht alle heruntergeladenen Texte der gewählten Sprachen (auch Fußnoten).': 'Searches all downloaded texts in the selected languages (footnotes too).',
    'Kategorien: alle': 'Categories: all', 'Kategorien durchsuchen …': 'Filter categories …', 'Alle Kategorien auswählen': 'Select all categories',
    'Alle Häkchen entfernen: es wird in allen Kategorien gesucht': 'Clear all checks: all categories are searched',
    'Ohne Häkchen wird überall gesucht. Mit Häkchen nur in den gewählten Kategorien; ein Häkchen bei einer Hauptkategorie gilt für alles darunter.': 'Without checks, everything is searched. With checks, only the chosen categories; a check on a main category covers everything below it.',
    'Bitte mindestens eine Sprache wählen.': 'Please choose at least one language.', 'Suche läuft …': 'Searching …', 'Suche …': 'Searching …', 'Suche – {}': 'Search – {}',
    'Durchsuche … {#} von {#} Dateien · {#} Treffer': 'Searching … {} of {} files · {} matches',
    '← alle Bücher': '← all books', 'Nur in diesem Buch, alle Treffer': 'Only in this book, all matches', '… und {#} weitere': '… and {} more',
    'keine Treffer': 'no matches', 'Auswahl: {}': 'Selection: {}', '{#} Kategorie': '{} category', '{#} Kategorien': '{} categories', '{#} Buch': '{} book', '{#} Bücher': '{} books',
    // ----- Notizen -----
    'Lesezeichen und Notizen durchsuchen …': 'Search bookmarks and notes …', 'Entfernen': 'Remove',
    'Noch keine Lesezeichen. Im Lesen-Reiter erscheint beim Überfahren einer Zeile links ein ☆.': 'No bookmarks yet. In the Read tab a ☆ appears on the left when you hover over a line.',
    'Lesezeichen / Notiz': 'Bookmark / note', 'Notiz': 'Note', 'Eigene Notiz (leer lassen = nur Lesezeichen)': 'Your note (leave empty = bookmark only)',
    'Speichern': 'Save', 'Lesezeichen entfernen': 'Remove bookmark',
    // ----- Herunterladen -----
    '1 · Katalog': '1 · Catalog', 'Der Katalog (ca. 22 MB) listet alle verfügbaren Texte. Er wird einmal geladen und kann danach auch offline benutzt werden.': 'The catalog (about 22 MB) lists all available texts. It is loaded once and can then be used offline.',
    'Katalog laden / aktualisieren': 'Load / refresh catalog', 'Noch kein Katalog geladen.': 'No catalog loaded yet.', 'Lade Katalog (ca. 22 MB) …': 'Loading catalog (about 22 MB) …',
    'Katalog vom {} · {#} Einträge': 'Catalog of {} · {} entries',
    '2 · Auswahl': '2 · Selection', 'Deutsch (alle Übersetzungen)': 'German (all translations)', 'auch alle Einzelversionen': 'also all individual versions',
    'Standard: pro Sprache die zusammengeführte Fassung. Mit dieser Option werden alle einzelnen Versionen geladen (deutlich mehr Daten).': 'Default: the merged version per language. With this option all individual versions are downloaded (much more data).',
    'Titel suchen (z. B. Genesis, Berakhot, Rashi …) – leer lassen für die Kategorie-Ansicht': 'Search titles (e.g. Genesis, Berakhot, Rashi …) – leave empty for the category view',
    'Alle Treffer auswählen': 'Select all matches', 'Alle {#} Treffer auswählen': 'Select all {} matches', 'Auswahl leeren': 'Clear selection',
    '… {#} weitere Treffer, bitte genauer suchen oder „Alle Treffer auswählen“.': '… {} more matches, please narrow the search or use “Select all matches”.',
    '3 · Herunterladen': '3 · Download', 'Nichts ausgewählt.': 'Nothing selected.',
    '{#} Titel · {#} Dateien · etwa {} (grobe Schätzung)': '{} titles · {} files · about {} (rough estimate)',
    '{#} Titel · {#} Dateien · {}': '{} titles · {} files · {}',
    'Bereits vorhandene Dateien werden übersprungen. Ein abgebrochener Download kann später einfach fortgesetzt werden.': 'Files that already exist are skipped. An interrupted download can simply be resumed later.',
    'Prüfe Dateien … {#} von {#}': 'Checking files … {} of {}', '{#} Titel': '{} titles',
    '{#} Dateien konnten nicht geladen werden (erneut „Herunterladen“ versucht es noch einmal):': '{} files could not be downloaded (clicking “Download” again will retry):',
    '{#} Dateien geladen': '{} files downloaded', '{#} Fehler': '{} errors',
    'Aktualisieren': 'Update', 'Auf Aktualisierungen prüfen': 'Check for updates',
    'Prüft, ob Sefaria Texte, die du schon heruntergeladen hast, geändert hat oder neue Fassungen dazugekommen sind, und lädt nur diese nach. Eigene Texte bleiben unberührt.': 'Checks whether Sefaria has changed texts you have already downloaded or added new versions, and downloads only those. Your own texts are not touched.',
    'Alles aktuell ({#} Dateien geprüft).': 'Everything is up to date ({} files checked).', '{#} geändert, {#} neu ({#} Dateien geprüft).': '{} changed, {} new ({} files checked).',
    '4 · Verknüpfungen (optional)': '4 · Links (optional)',
    'Sefaria verknüpft Texte untereinander (Kommentare, Zitate, Parallelstellen). Mit diesen Daten kannst du im Reiter „Lesen“ zu jedem Vers alle Verknüpfungen öffnen – auch offline. Einmaliger Download von ca. 680 MB, danach braucht der Index etwa 0,5–1 GB. Abgebrochene Downloads werden fortgesetzt.': 'Sefaria links texts to each other (commentaries, quotations, parallel passages). With this data you can open all links for any verse in the “Read” tab – even offline. One-time download of about 680 MB; afterwards the index needs about 0.5–1 GB. Interrupted downloads are resumed.',
    // ----- Willkommen / Exportieren / Eigene Texte -----
    'Willkommen bei Safran': 'Welcome to Safran', 'Sefaria-Bibliothek': 'Sefaria library',
    'mit Tanach, Talmud, Mischna, Midrasch und Kommentaren ist noch nicht heruntergeladen.': 'with Tanakh, Talmud, Mishnah, Midrash and commentaries has not been downloaded yet.',
    'Du wählst selbst, welche Bücher und Sprachen du brauchst. Der Katalog hat etwa 22 MB, die Texte kommen danach einzeln dazu. Das geht auch später im Reiter „Herunterladen“ (Menü ⋯).': 'You choose which books and languages you need. The catalog is about 22 MB; the texts come afterwards, one by one. You can also do this later in the “Download” tab (menu ⋯).',
    'Nicht mehr fragen': 'Don’t ask again', 'Bibliothek jetzt auswählen …': 'Choose library now …',
    'Abschnitt exportieren': 'Export section', 'Format': 'Format', 'Word (.doc)': 'Word (.doc)', 'Zeilen von': 'Lines from', 'bis': 'to', 'alle': 'all',
    'Fußnoten (nummeriert unter der Tabelle)': 'Footnotes (numbered below the table)', 'Meine Notizen': 'My notes', 'Verknüpfungen (Liste je Zeile, falls vorhanden)': 'Links (list per line, if available)',
    'Exportieren …': 'Export …', '⤓ Exportieren …': '⤓ Export …', 'Abschnitt als PDF oder Word exportieren': 'Export section as PDF or Word',
    'Hebräisch – Schriftgröße': 'Hebrew – font size', 'Englisch – Schriftgröße': 'English – font size', 'Deutsch – Schriftgröße': 'German – font size',
    'Hebräische Vokalzeichen ausblenden': 'Hide Hebrew vowel points', 'Betonungszeichen (Teamim) ausblenden': 'Hide cantillation marks (te’amim)',
    'Fußnoten': 'Footnotes', 'Klick': 'Click', 'alle anzeigen': 'show all', 'aus': 'off', 'Grundschrift': 'Base font', 'Schrift kleiner': 'Smaller font', 'Schrift größer': 'Larger font', 'Zurücksetzen': 'Reset',
    'Eigene Texte einbinden': 'Add own texts', 'oder Sefaria-Upload-Format) und JSON. Passt der Titel zu einem vorhandenen Buch, erscheint dein Text als weitere Spalte daneben.': 'or Sefaria upload format) and JSON. If the title matches an existing book, your text appears as an additional column next to it.',
    'Titel 1:1,Text': 'Title 1:1,Text', 'Dateien wählen …': 'Choose files …', 'Einbinden': 'Add',
    'Bitte Kommentator und Buch angeben.': 'Please enter commentator and book.',
    'Wird als „{}“ gespeichert und erscheint in der Kommentarleiste von {}.': 'Will be saved as “{}” and appears in the commentary bar of {}.',
    '⚠ „{}“ ist nicht in deiner Bibliothek – der Kommentar erscheint erst, wenn dieses Buch geladen ist (Schreibweise wie bei Sefaria).': '⚠ “{}” is not in your library – the commentary will only appear once this book is loaded (spelled as on Sefaria).',
    '{#} Abschnitt(e) · {#} Segmente': '{} section(s) · {} segments', '{#} Abschnitt(e) · {#} Segmente · ⚠ {#} Hinweis(e)': '{} section(s) · {} segments · ⚠ {} note(s)',
    'Art': 'Type', 'Text': 'Text', 'Kommentar': 'Commentary', 'Kommentator': 'Commentator', 'Zu Buch': 'On book', 'Titel': 'Title', 'Name der Version': 'Version name',
    'z. B. Hertz': 'e.g. Hertz', 'z. B. Deuteronomy': 'e.g. Deuteronomy',
    '⚠ Bitte bei jedem Eintrag Titel (bei Kommentaren Kommentator und Buch) angeben.': '⚠ Please enter a title for every entry (commentator and book for commentaries).',
    'Diese eigenen Texte gibt es schon: {}': 'These own texts already exist: {}', '{#} Texte einbinden': 'Add {} texts', '{#} Datei(en)': '{} file(s)',
    'Export fehlgeschlagen: {}': 'Export failed: {}', 'Es gibt noch keine eigenen Texte zum Exportieren.': 'There are no own texts to export yet.',
    '{} eigene Version(en) exportiert nach:\n{}\n\nDiesen Ordnerinhalt als „bundled“ ins Projekt legen und zu GitHub hochladen.': '{} own version(s) exported to:\n{}\n\nPut this folder’s contents into the project as “bundled” and upload them to GitHub.',
    // ----- Vergleich eigener Text -----
    'Wortvergleich dieses Abschnitts mit „{}“ (': 'Word comparison of this section with “{}” (', 'nur dort': 'only there', 'nur in deinem Text': 'only in your text',
    // Zusammengesetzte Meldungen (im Code mit I18N.t gebaut)
    '{#} Treffer in {#} {} ({#} von {#} Dateien durchsucht)': '{} matches in {} {} ({} of {} files searched)', 'Buch': 'book', 'Büchern': 'books',
    '– abgebrochen': '– cancelled', '– bei 1000 angezeigten Treffern gestoppt, bitte genauer suchen': '– stopped at 1000 displayed matches, please narrow the search',
    '– je Buch werden die ersten 25 gezeigt; ein Klick auf den Buchnamen oben zeigt alle': '– the first 25 per book are shown; click a book name above to show all',
    'keiner gewählt – alle {#} auf {} werden gezeigt': 'none selected – all {} in {} are shown', 'keiner auf {} vorhanden': 'none available in {}',
    '{#} auf {}': '{} in {}', '{#} nur in anderer Sprache': '{} only in another language', '{#} nicht geladen': '{} not downloaded',
    'Kein Englischer Text zu diesem Vers:': 'No English text for this verse:', 'Kein Deutscher Text zu diesem Vers:': 'No German text for this verse:', 'Kein Hebräischer Text zu diesem Vers:': 'No Hebrew text for this verse:',
    '(keine Fassung in dieser Sprache geladen)': '(no version in this language downloaded)', '(Vers fehlt in der Fassung)': '(verse missing in this version)',
    'Keine lokalen Kommentare in der Sprache {} zu diesem Vers.': 'No local commentaries in {} for this verse.',
    'keine Fassung auf {} geladen': 'no {} version downloaded', 'Vers fehlt in der Englischen Fassung': 'verse missing in the English version', 'Vers fehlt in der Deutschen Fassung': 'verse missing in the German version', 'Vers fehlt in der Hebräischen Fassung': 'verse missing in the Hebrew version',
    'Notiz:': 'Note:', 'Verknüpfungen:': 'Links:', 'Quelle: Sefaria (sefaria.org), Export vom {}': 'Source: Sefaria (sefaria.org), exported on {}',
    'Abgebrochen: {#} von {#} Dateien · {}.': 'Cancelled: {} of {} files · {}.', 'Fertig: {#} von {#} Dateien · {}.': 'Done: {} of {} files · {}.',
    'Abgebrochen: {#} Dateien geladen.': 'Cancelled: {} files downloaded.', 'Fertig: {#} Dateien geladen.': 'Done: {} files downloaded.',
    'Abgebrochen: {#} Dateien geladen, {#} Fehler.': 'Cancelled: {} files downloaded, {} errors.', 'Fertig: {#} Dateien geladen, {#} Fehler.': 'Done: {} files downloaded, {} errors.',
    '{} · {} – {#} Spalte(n)': '{} · {} – {#} column(s)',
    '⚠ Eigener Text „{}“ vs. {} {}: {#} von {#} Abschnitten weichen ab': '⚠ Own text “{}” vs. {} {}: {} of {} sections differ', '{#} Abschnitte fehlen ganz': '{} sections are missing entirely',
    '✓ Eigener Text „{}“: alle {#} vorhandenen Abschnitte stimmen mit der Zeilenzahl der Vorlage überein': '✓ Own text “{}”: all {} existing sections match the line count of the original',
    'eigen {#} / Vorlage {#}': 'own {} / original {}', 'fehlt:': 'missing:', 'zusätzlich:': 'extra:',
    '{} – lokal vorhanden, aber nicht auf {}': '{} – available locally, but not in {}', '{} – nicht in deiner Bibliothek': '{} – not in your library', '{#} nicht in deiner Bibliothek': '{} not in your library',
    '{} ({#} Artikel)': '{} ({} entries)',
    // ----- Wörterbuch -----
    'Wort eingeben (mit oder ohne Vokalzeichen) …': 'Enter a word (with or without vowel points) …', 'Nachschlagen': 'Look up',
    'Ersten Buchstaben entfernen und neu nachschlagen (z. B. בִדְגַת → דְגַת)': 'Remove the first letter and look up again (e.g. בִדְגַת → דְגַת)', '⌫ 1. Buchstabe': '⌫ 1st letter',
    'Gib ein hebräisches oder deutsches Wort ein, oder markiere ein Wort im Text und wähle mit Rechtsklick „Im Wörterbuch nachschlagen“.': 'Enter a Hebrew or German word, or select a word in the text and choose “Look up in dictionary” from the right-click menu.',
    'Gib ein hebräisches oder deutsches Wort ein.': 'Enter a Hebrew or German word.',
    'Wörterbücher verwalten': 'Manage dictionaries', 'DSL-Datei hinzufügen …': 'Add DSL file …', 'Formate: .dsl, .dsl.dz (ABBYY Lingvo)': 'Formats: .dsl, .dsl.dz (ABBYY Lingvo)',
    'Zurück': 'Back', 'Vor': 'Forward', 'Neuer Wörterbuch-Tab': 'New dictionary tab', 'Noch keine Wörterbücher.': 'No dictionaries yet.',
    'Kein Eintrag für „{}“ gefunden.': 'No entry found for “{}”.', 'Es ist noch kein Wörterbuch eingebunden. Öffne unten „Wörterbücher verwalten“ und füge eine DSL-Datei hinzu.': 'No dictionary has been added yet. Open “Manage dictionaries” below and add a DSL file.',
    'Nur in: ': 'Only in: ', 'alle Wörterbücher': 'all dictionaries', '{#} Treffer': '{} matches', '{#} Einträge': '{} entries', '· {#} Einträge': '· {} entries',
    'Nach oben (wird zuerst angezeigt)': 'Move up (shown first)', 'Nach unten': 'Move down', 'Wörterbuch entfernen': 'Remove dictionary',
    'Dieses Wörterbuch aus Safran entfernen? Deine DSL-Datei bleibt unberührt.': 'Remove this dictionary from Safran? Your DSL file is not touched.',
    'Dieser Text ist nicht in deiner Bibliothek (Reiter „Herunterladen“).': 'This text is not in your library (“Download” tab).',
    'Eingebunden: {}.': 'Added: {}.', '{} ({#} Einträge)': '{} ({} entries)', 'ohne Vorsilbe „{}“': 'without prefix “{}”',
    // ----- Fehlermeldungen aus dem Hauptprozess -----
    'JSON ist ungültig: {}': 'Invalid JSON: {}', 'Im JSON wurde kein Text gefunden.': 'No text found in the JSON.', 'Es wurde kein Text erkannt.': 'No text recognised.', 'Es wurde kein Text erkannt. {}': 'No text recognised. {}',
    'Zeile {#}: Fundstelle „{}“ nicht lesbar (erwartet „Titel Kapitel:Vers“)': 'Line {}: reference “{}” not readable (expected “Title chapter:verse”)', 'Zeile {#}: Fundstelle „{}“ nicht lesbar': 'Line {}: reference “{}” not readable',
    'Bitte einen Titel angeben.': 'Please enter a title.', '„{}“ zu „{}“ gibt es schon': '“{}” for “{}” already exists', 'Datei ist nicht in der Bibliothek': 'File is not in the library',
    'In dieser Datei wurden keine Wörterbucheinträge gefunden (erwartet: DSL-Format).': 'No dictionary entries were found in this file (expected: DSL format).', 'Ungültige Kennung.': 'Invalid identifier.',
    'GitHub antwortet mit {#}': 'GitHub responded with {}', 'Struktur nicht gefunden': 'Structure not found', 'Struktur von „{}\" nicht ermittelbar: {}': 'Could not determine the structure of “{}”: {}',
    'Katalog konnte nicht geladen werden: {}': 'Could not load the catalog: {}', 'Such-Prozess beendet ({#})': 'Search process ended ({})', 'Das ist kein eigener Text.': 'This is not an own text.',
    'Die Quelldatei wurde nicht gefunden: {}': 'The source file was not found: {}', 'Kein Text': 'No text',
    // ----- Notizen, Markierungen, Lesen-Reiter -----
    'Lesen – ein weiterer Klick blendet die Bücherliste ein oder aus (Cmd+B)': 'Read – click again to show/hide the book list (Cmd+B)',
    'Gelb': 'Yellow', 'Grün': 'Green', 'Blau': 'Blue', 'Rosa': 'Pink', 'Orange': 'Orange', 'Violett': 'Purple', 'Ohne Farbe': 'No color',
    'Notiz bearbeiten': 'Edit note', 'Markierung entfernen': 'Remove highlight', 'Notiz entfernen': 'Remove note', 'Ohne Notiz': 'No note',
    'Eigene Notiz': 'My note', 'Notiz zur Markierung (optional)': 'Note for this highlight (optional)', 'Notiz (leer lassen = nur Markierung)': 'Note (leave empty = highlight only)',
    'Titel (optional)': 'Title (optional)', '＋ Neue Notiz': '＋ New note', 'Eine Notiz ohne Textstelle anlegen': 'Create a note that is not tied to a passage',
    'Reihenfolge der Notizen': 'Order of the notes', 'Reihenfolge: manuell': 'Order: manual', 'Neueste zuerst': 'Newest first', 'Nach Farbe': 'By color', 'Nach Buch': 'By book',
    'Nach Farbe filtern': 'Filter by color', 'Nach oben schieben': 'Move up', 'Nach unten schieben': 'Move down', '{#} von {#}': '{} of {}',
    'Darstellung': 'Appearance', 'Erscheinungsbild: automatisch (System), hell oder dunkel': 'Appearance: automatic (system), light or dark', 'Automatisch': 'Automatic', 'Hell': 'Light', 'Dunkel': 'Dark',
        'Klicken, um zu einem Buch oder einer Stelle zu springen': 'Click to jump to a book or passage', 'Buch oder Stelle, z. B. gen. 2:3': 'Book or passage, e.g. gen. 2:3',
    'Alle Unterpunkte öffnen/schließen': 'Open/close all subcategories',
    'Ausgewählte Verse: {}': 'Selected verses: {}', 'Alle Verse zeigen': 'Show all verses',
    'Ausgewählte Stellen': 'Selected passages', 'Nicht gefunden: {}': 'Not found: {}', 'Zum Lesen öffnen': 'Open in reader',
    'Als Favorit speichern / entfernen': 'Save / remove as favorite', 'ganzes Kapitel': 'whole chapter',
    'Letzte Suchen': 'Recent searches', 'Favoriten': 'Favorites', 'Wort zu den Favoriten hinzufügen / entfernen': 'Add / remove word from favorites', 'Noch keine Favoriten': 'No favorites yet', 'Notiz gelöscht': 'Note deleted', 'Als Word-Datei speichern': 'Save as Word file', 'Als PDF speichern': 'Save as PDF', 'Exportiert am {}': 'Exported on {}', 'Suchbegriff zu den Favoriten hinzufügen / entfernen': 'Add / remove search term from favorites', 'Notizen sichern, exportieren oder eine Sicherung einlesen': 'Back up, export or import notes', 'Sicherung speichern (JSON)': 'Save backup (JSON)', 'Als Markdown speichern': 'Save as Markdown', 'Sicherung einlesen …': 'Import backup …', 'Diese Datei ist keine Notizsicherung.': 'This file is not a notes backup.', '{#} Notizen aus der Sicherung zusammenführen? Vorhandene bleiben erhalten, nur ältere Fassungen werden ersetzt.': 'Merge {} notes from the backup? Existing notes are kept; only older versions are replaced.', 'Eingelesen: {#} neu, {#} aktualisiert, {#} unverändert.': 'Imported: {} new, {} updated, {} unchanged.', 'Klicken: verfügbare Texte dieser Sprache auswählen': 'Click: choose from the available texts in this language', 'Alle hebräischen Texte anzeigen': 'Show all Hebrew texts', 'Alle deutschen Texte anzeigen': 'Show all German texts', 'Alle englischen Texte anzeigen': 'Show all English texts', 'Alle anderen Texte anzeigen': 'Show all other texts', 'Alle hebräischen und deutschen Texte anzeigen': 'Show all Hebrew and German texts', 'Alle hebräischen und englischen Texte anzeigen': 'Show all Hebrew and English texts', 'Alle hebräischen und anderen Texte anzeigen': 'Show all Hebrew and other texts', 'Rückgängig': 'Undo', 'Die Notizen konnten nicht gespeichert werden:': 'The notes could not be saved:', 'Noch keine Suchen': 'No searches yet', 'Entfernen': 'Remove',
    'Alle Unterpunkte öffnen': 'Open all subcategories', 'Alle Unterpunkte schließen': 'Close all subcategories',
    'Größe': 'Size', 'Größe der gesamten Oberfläche (Schrift und Bedienelemente)': 'Size of the whole interface (text and controls)',
    // ----- Im Text suchen -----
    'Im Text suchen …': 'Find in text …', 'Vorheriger Treffer': 'Previous match', 'Nächster Treffer': 'Next match',
    // ----- Hauptprozess-Meldungen -----
    'Zeitüberschreitung (30 s)': 'Timeout (30 s)', 'Netzwerkfehler: {}': 'Network error: {}', 'Zeitüberschreitung beim Laden': 'Timeout while loading',
    'Dateityp wird nicht unterstützt (erlaubt: TXT, MD, DOCX, CSV, TSV, JSON)': 'File type not supported (allowed: TXT, MD, DOCX, CSV, TSV, JSON)',
    'Zu diesem Text ist die Quelldatei nicht gemerkt – bitte erneut über „Eigener Text…“ einbinden.': 'The source file of this text was not remembered – please add it again via “Add own text…”.',
    'Zuerst prüfen.': 'Check first.', 'Prüfe Dateien …': 'Checking files …', 'Nur eigene Texte können entfernt werden.': 'Only own texts can be removed.',
    'Offline-Bibliothek': 'Offline library', 'Zweites Lesefenster': 'Second reading pane',
  };

  const HTML = {
    h1: 'Choose a book on the left. Nothing downloaded yet? In the <b>Download</b> tab you can choose books and languages.',
    h2: '<b>Wildcards:</b> <code>*</code> stands for any number of letters, <code>?</code> for exactly one. <code>anf*</code> finds Anfang, Anfänge, anfangen; <code>m?er</code> finds Meer and Mehr. Without wildcards the word must match completely (<code>gott</code> finds “Gott” but not “Gottes” – use <code>gott*</code> for that).',
    h3: '<b>Fuzzy:</b> also finds similarly spelled words, e.g. for typos, transliterations or old spellings. Words with 4–6 letters may differ by one letter, words with 7 or more by two; shorter words must match exactly. One difference is a wrong, missing or extra letter. Accents and umlauts are ignored. Examples:',
    h4: '<code>raschi</code> also finds “Rashi”', h5: '<code>avraham</code> also finds “Abraham”', h6: '<code>semuel</code> also finds “Šemuél” and “Shemuel”', h7: '<code>אלהים</code> also finds “אלוהים”',
    h8: '<code>gott</code> finds “Gott” but not “gold” (too short for differences)',
    h9: '<b>Nearby words:</b> Enter words in up to three fields. Matches are verses or paragraphs that contain all the words, no further apart than you chose under “Distance”. With “Keep word order” they must follow each other as in the fields. Example: <code>anf*</code> · <code>gott</code> · <code>erd*</code> with “at most 10 words” and word order finds “Am Anfang schuf Gott Himmel und Erde”. Words are only counted within one verse, not across verses.',
    h10: 'Safran already contains some texts, dictionaries and the Hebrew Tanakh with morphology. The <b>Sefaria library</b> with Tanakh, Talmud, Mishnah, Midrash and commentaries has not been downloaded yet.',
    h11: 'You can choose several files at once or drag them here: TXT/Word (one line = one verse; “Kapitel 2” on its own line starts a chapter), CSV (<code>Title 1:1,Text</code> or Sefaria upload format) and JSON. If the title matches an existing book, your text appears as an additional column next to it.',
  };

  // ----- Nachschlagen -----
  if (lang === 'he' && window.I18N_HE) { // Hebräisch: wo vorhanden, ersetzt die hebräische Tabelle die englische
    const H = window.I18N_HE;
    for (const k of Object.keys(EN)) if (H.exact[k]) EN[k] = H.exact[k];
    for (const k of Object.keys(HTML)) if (H.html[k]) HTML[k] = H.html[k];
  }
  const exact = new Map(Object.entries(EN).map(([k, v]) => [k.replace(/\s+/g, ' ').trim(), v]));
  const tpl = [];
  for (const [k, v] of exact) {
    if (!/\{#?\}/.test(k)) continue;
    const parts = k.split(/(\{#?\})/);
    const re = new RegExp('^' + parts.map(p => (p === '{}' ? '([\\s\\S]+?)' : p === '{#}' ? '(\\d[\\d.,]*\\+?)' : p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('') + '$');
    tpl.push({ re, v, n: k.length });
  }
  tpl.sort((a, b) => b.n - a.n);
  // In eingesetzten Teilen (Vorlagen) werden nur Sprachbezeichnungen und Zählangaben übersetzt, nie Eingaben des Nutzers
  const LABEL = new Set(['Englisch', 'Deutsch', 'Hebräisch', 'Andere', 'Hebr.', 'Engl.', 'zusammengeführte Fassung']);
  const tr = s => {
    if (!s) return s;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
    const core = m[2].replace(/\s+/g, ' ');
    if (!core || !/[A-Za-zÄÖÜäöüß]/.test(core)) return s;
    let out = exact.get(core);
    if (out === undefined) {
      for (const t of tpl) {
        const r = t.re.exec(core);
        if (r) { let i = 1; out = t.v.replace(/\{\}/g, () => { const c = r[i++] || ''; return LABEL.has(c) || /^(\d|Zeile )/.test(c) ? c.split(', ').map(part => (LABEL.has(part) ? exact.get(part) : tr(part))).join(', ') : c; }); break; }
      }
    }
    return out === undefined ? s : m[1] + out + m[3];
  };
  api.tr = tr;
  api.t = (s, ...a) => fill(tr(s) || s, a.map(x => (typeof x === 'string' ? tr(x) : x)));
  // t() mit den Werten einsetzen, danach ist der Text schon englisch; der Beobachter lässt ihn unberührt

  // ----- Oberfläche übersetzen (statisch und dynamisch) -----
  const ATTRS = ['title', 'placeholder', 'alt', 'aria-label'];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA']);
  const SKIPCLS = /\b(cell|ct|dbody|snip|txt|nt|ex|dentry|sg|dtt|ut)\b/; // Buchtexte, Wörterbuchartikel, Notizen des Nutzers
  const fixAttrs = el => { for (const a of ATTRS) { const v = el.getAttribute && el.getAttribute(a); if (v) { const n = tr(v); if (n !== v) el.setAttribute(a, n); } } };
  function walk(root) {
    if (root.nodeType === 3) { const n = tr(root.nodeValue); if (n !== root.nodeValue) root.nodeValue = n; return; }
    if (root.nodeType !== 1) return;
    const go = el => {
      if (SKIP.has(el.tagName) || SKIPCLS.test(el.className && el.className.baseVal === undefined ? el.className : '')) return;
      if (el.dataset && el.dataset.i18n && HTML[el.dataset.i18n] && !el.dataset.i18nDone) { el.innerHTML = HTML[el.dataset.i18n]; el.dataset.i18nDone = '1'; return; }
      fixAttrs(el);
      for (let c = el.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) { const n = tr(c.nodeValue); if (n !== c.nodeValue) c.nodeValue = n; } else if (c.nodeType === 1) go(c);
      }
    };
    go(root);
  }
  const obs = new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'childList') m.addedNodes.forEach(walk);
      else if (m.type === 'characterData') { const p = m.target.parentElement; if (!p || (!SKIPCLS.test(p.className || '') && !p.closest('.cell,.ct,.dbody,.snip,.dentry,.sg,.dtt'))) walk(m.target); }
      else if (m.type === 'attributes') fixAttrs(m.target);
    }
  });
  const start = () => {
    document.documentElement.lang = lang;
    document.title = tr(document.title);
    walk(document.body);
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  // Meldungsfenster
  const A = window.alert.bind(window), C = window.confirm.bind(window), P = window.prompt.bind(window);
  window.alert = m => A(tr(String(m)));
  window.confirm = m => C(tr(String(m)));
  window.prompt = (m, d) => P(tr(String(m)), d);
})();
