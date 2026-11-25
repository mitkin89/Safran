// node tools/lsj/build.js <Lexikon.dsl> [Projektordner]
// Nur dieses Wörterbuch ergänzen; bestehende Pakete bleiben bytegenau erhalten.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const root = path.resolve(process.argv[3] || path.join(__dirname, '../..'));
const DSL = require(path.join(root, 'dsl'));
const sha = (b, algorithm = 'sha256') => crypto.createHash(algorithm).update(b).digest('hex');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function abbreviations(annotation) {
  // Ausschließlich die allgemeine Liste: werkbezogene Kürzel wie A. = Argonautica
  // aus der Autorenliste dürfen A. = Aeschylus nicht überschreiben.
  const start = annotation.lastIndexOf('\nV. General List of Abbreviations');
  if (start < 0) throw new Error('Allgemeine Abkürzungsliste fehlt.');
  const end = annotation.indexOf('\nPreface 1925', start);
  if (end < 0) throw new Error('Ende der Abkürzungsliste fehlt.');
  const map = new Map();
  for (const line of annotation.slice(start, end).split(/\r?\n/)) {
    const m = /^([^=]+?)\s*=\s*(.+)$/.exec(line.trim());
    if (!m) continue;
    // Mehrdeutige Sammelangaben bleiben unverändert, statt eine Bedeutung zu raten.
    const key = m[1].trim(), value = m[2].trim();
    if (!key.includes(',') && key.length <= 40) map.set(key, value);
  }
  return map;
}

function explain(html, abbr) {
  // Nur vollständig ausgezeichnete Kürzel; keine Ersetzungen in Attributen,
  // griechischen Beispielen oder gewöhnlichen englischen Wörtern.
  return html.replace(/<span class="dc dc-(?:gray|darkgray|mediumseagreen|darkviolet)">([^<]+)<\/span>/g, (whole, text) => {
    const tip = abbr.get(text.trim());
    return tip ? whole.replace(text, `<abbr class="gab" data-t="${esc(tip)}">${text}</abbr>`) : whole;
  });
}

function build(source, project = root) {
  const input = fs.readFileSync(source);
  const parsed = DSL.parseDsl(input, path.basename(source));
  const annotationPath = source.replace(/\.dsl$/i, '.ann');
  const annotation = fs.existsSync(annotationPath) ? fs.readFileSync(annotationPath) : null;
  const abbr = annotation ? abbreviations(DSL.decode(annotation)) : new Map();
  // Die DSL wiederholt elf Artikel unter weiteren Stichwörtern. Identische
  // Artikel zusammenfassen, dabei jedes Stichwort als Suchzugang behalten.
  const articles = [], bodies = new Map();
  for (const entry of parsed.entries) {
    const digest = sha(entry.html);
    const previous = bodies.get(digest);
    if (previous && previous.html === entry.html) previous.heads.push(...entry.heads);
    else { const article = { heads: [...entry.heads], html: entry.html }; articles.push(article); bodies.set(digest, article); }
  }
  const data = {
    name: parsed.name, indexLang: parsed.indexLang, contentsLang: parsed.contentsLang,
    heads: articles.map(e => e.heads), html: articles.map(e => explain(e.html, abbr))
  };
  const id = sha(parsed.name + '\0' + data.heads.length, 'sha1').slice(0, 12);
  const raw = Buffer.from(JSON.stringify(data));
  const packed = zlib.gzipSync(raw, { level: 9 });
  const out = path.join(project, 'bundled/dict');
  const manifestPath = path.join(out, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const item = { id, name: data.name, count: data.heads.length, hash: sha(raw, 'sha1') };
  const previous = manifest.items.findIndex(x => x.id === id);
  if (previous < 0) manifest.items.push(item); else manifest.items[previous] = item;
  fs.writeFileSync(path.join(out, id + '.json.gz'), packed);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
  const provenance = {
    file: path.basename(source), sha256: sha(input), bytes: input.length,
    name: data.name, indexLang: data.indexLang, contentsLang: data.contentsLang,
    entries: data.heads.length, sourceEntries: parsed.entries.length,
    headwords: data.heads.reduce((n, hs) => n + hs.length, 0),
    dictionaryId: id, jsonSha1: item.hash, gzipBytes: packed.length,
    ...(annotation ? { annotation: path.basename(annotationPath), annotationSha256: sha(annotation), abbreviationDefinitions: abbr.size } : {})
  };
  fs.mkdirSync(path.join(project, 'tools/lsj'), { recursive: true });
  fs.writeFileSync(path.join(project, 'tools/lsj/source.json'), JSON.stringify(provenance, null, 2) + '\n');
  console.log(JSON.stringify(provenance, null, 2));
  return provenance;
}

if (require.main === module) {
  if (!process.argv[2]) { console.error('Aufruf: node tools/lsj/build.js <Lexikon.dsl> [Projektordner]'); process.exit(1); }
  build(path.resolve(process.argv[2]));
}
module.exports = { abbreviations, explain, build };
