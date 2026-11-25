# Corpus Masoreticum / BIMA transcriptions

The text editions in `masora-data/` and their catalogue in `masora-index.js`
come from **Corpus Masoreticum**, Heidelberg Center for Jewish Studies.

- Project: https://corpusmasoreticum.de/
- Public editions: https://bima2.corpusmasoreticum.de/manuscripts
- Licence: **Creative Commons Attribution–ShareAlike 4.0 International**
- Licence text: https://creativecommons.org/licenses/by-sa/4.0/
- Individual manuscript and folio: linked from each imported page.

BIMA's published-edition interface identifies the transcriptions as CC BY-SA 4.0.
The import includes only pages explicitly marked as published in the Corpus Masoreticum project, confirmed by the public folio response.
A manuscript-level publication flag may be unset; explicitly unpublished
manuscripts are excluded. It uses the same
public manuscript/folio read endpoint as BIMA's guest viewer. No login or editor
permissions are used.

**Changes by Safran / Codex:** conversion of the published JSON into offline text
projections; omission of SVG paths, image data, token geometry and account/editor
metadata; a chapter/page index based solely on references attached to the source
BibleText. No new Hebrew transcription, translation, expansion of abbreviations,
or verse-level attribution has been added. The imported texts remain under
CC BY-SA 4.0; this does not relicense Safran's unrelated code or data.

Manuscript images and their separate rights are **not** included. Follow a page's
BIMA link to consult the facsimile and its owning institution's terms.

Each source response has a SHA-256 recorded in
`tools/masora/import-report.json`. Retrieval date: 24 November 2026.
