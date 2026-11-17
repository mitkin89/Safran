# Development

Private Buber/Rosenzweig interlinear alignments can be imported locally; see
[PRIVATE-INTERLINEAR.md](PRIVATE-INTERLINEAR.md). No private texts or alignments
are included in the repository or public interlinear build.

## Run from source

1. Install Node.js 22 LTS.
2. In the project folder:

```bash
npm ci
npm start
```

## Build

```bash
npm run dist        # macOS: .dmg in dist/ (ad-hoc signed)
npm run dist:win    # Windows: installer and portable exe
```

GitHub Actions (`.github/workflows/build.yml`) builds macOS, Windows and Linux.

## Tests

```bash
npm test
npm run test:smoke  # actual Electron renderer, temporary profile, no network
```

New isolated regressions live in `tests/*.test.js` and are discovered by Node’s test runner. The older numbered corpus tests remain in the existing test chain. The Electron smoke test loads the production HTML, renderer scripts and preload against public fixture texts; it covers Tanakh/Bavli cards, modal visibility, forms/navigation, a retained modified translation and the second reading pane. On Linux run it under `xvfb-run --auto-servernum`. Normal pushes and pull requests run `.github/workflows/check.yml`; release builds use the same committed lockfile without falling back to an unpinned install.

## Interface language

The interface is available in German and English. The English strings live in `i18n.js`: German original on the left, translation on the right; `{}` and `{#}` (number) are placeholders. New interface strings in the code stay German and get an entry there. `test10.js` checks the table.

## Bundled texts

Texts in `bundled/` are imported automatically on start. Export your own texts via ⋯ → "Eigene Texte für GitHub exportieren …" into that folder.


## Library recovery and downloads

`library.json` is validated before use and save. Its last valid previous state is kept in `library.json.bak`. A damaged primary index is restored only from a valid backup; the damaged bytes are retained as a unique `.broken-*` file and the app reports the recovery. If neither copy is valid, loading and saving stop rather than creating an empty index. Downloaded JSON is checked for the expected work/edition and a valid text tree before replacing any existing text.

## Public alignment source fingerprints

`python3 tools/interlinear/build.py` emits both `interlin.js` and `interlin-sources.js`. Each public German alignment records SHA-256 fingerprints of the canonical JSON text trees of Hebrew and translation, independent of whitespace in the outer JSON file. `Library.read()` supplies the actual fingerprint to the renderer. A locally modified or retained older version is kept visible; an incompatible alignment is suppressed with an explanation. Private alignments retain their separate word-for-word validation. No translation wording is changed by these checks.
