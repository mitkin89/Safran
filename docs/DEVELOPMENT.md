# Development

## Run from source

1. Install Node.js 22 LTS.
2. In the project folder:

```bash
npm install
npm start
```

## Build

```bash
npm run dist        # macOS: .dmg in dist/ (ad-hoc signed)
npm run dist:win    # Windows: installer and portable exe
```

GitHub Actions (`.github/workflows/build.yml`) builds macOS and Windows.

## Tests (logic only, no UI)

```bash
npm test
```

## Interface language

The interface is available in German and English. The English strings live in `i18n.js`: German original on the left, translation on the right; `{}` and `{#}` (number) are placeholders. New interface strings in the code stay German and get an entry there. `test10.js` checks the table.

## Bundled texts

Texts in `bundled/` are imported automatically on start. Export your own texts via ⋯ → "Eigene Texte für GitHub exportieren …" into that folder.
