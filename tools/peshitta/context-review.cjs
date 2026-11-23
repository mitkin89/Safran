'use strict';

// Offline evidence audit across an entire Peshitta book.
// Usage: node tools/peshitta/context-review.cjs candidates.json reviewed.json [--accepted] [--include-repeated-alignment]
//        node tools/peshitta/context-review.cjs --assign-missing audit-directory [--include-embedded-gaps]
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {mkdirSync, readFileSync, writeFileSync} = require('node:fs');
const path = require('node:path');
const {runInNewContext} = require('node:vm');
const alignment = require('../../peshitta-alignment');
const {decode} = require('../../morph');
const {create, norm} = require('../../syriac-cards');
const {items} = require('../../bundled/manifest.json');

const root = path.join(__dirname, '../..');
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const hash = text => createHash('sha256').update(JSON.stringify(text)).digest('hex');
const keyFor = parts => JSON.stringify(parts.map(({form, lexeme, pos}) => [norm(form), lexeme, pos]));
const noWord = form => !/[\p{L}\p{N}]/u.test(form);
const refOf = word => word.chapter + ':' + word.verse;
const coverage = require('./coverage.json').books;
const annotated = coverage.filter(book => book.annotated).map(book => book.title);

const sedraContext = {window: {}};
runInNewContext(readFileSync(path.join(root, 'sedra-data.js'), 'utf8'), sedraContext);
const sedraData = sedraContext.window.SEDRA_DATA;
const sedraLookup = create(sedraData);
const sources = {etcbc: 'ETCBC Syriac Corpus 0.92', sedra: sedraData.source, license: 'CC BY-NC 4.0'};

function sedraEntry(id) {
  const entry = sedraData.lexemes[id];
  return {
    headword: entry.vocal || entry.form,
    category: entry.category,
    gloss: entry.meanings.find(([, language]) => language === 'English')?.[0] ?? null,
  };
}

function load(book) {
  const catalog = items.filter(item => item.title === book);
  const hebrew = catalog.find(item => item.versionTitle.startsWith('Westminster'));
  const syriac = catalog.find(item => item.versionTitle.startsWith('ETCBC Peshitta'));
  const he = read(path.join(root, 'bundled', hebrew.rel));
  const sy = read(path.join(root, 'bundled', syriac.rel));
  he.textHash = hash(he.text);
  sy.textHash = hash(sy.text);
  assert.equal(sy.textHash, sy.syriacMorphology.textHash, book);

  const browser = {window: {}};
  runInNewContext(readFileSync(path.join(root, alignment.file(book)), 'utf8'), browser);
  const links = alignment.book(browser.window.PESHITTA_ALIGNMENT_DATA || {version: 2, books: browser.window.PESHITTA_ALIGNMENT_BOOKS}, book);
  assert(alignment.prepare(links, he, sy), book);
  const tags = new Map();
  for (const [ref, row] of Object.entries(links.verses)) {
    const [chapter, verse] = ref.split(':').map(Number);
    const html = he.text[chapter - 1]?.[verse - 1];
    if (typeof html !== 'string' || !row.review) continue;
    const words = [...html.matchAll(/<span class="w" data-l="([^"]*)" data-m="([^"]*)"[^>]*>(.*?)<\/span>/g)];
    if (!alignment.verse(links, ref, words.map(match => match[3]))) continue;
    const uses = new Map();
    for (const indices of row.links) for (const i of indices) uses.set(i, (uses.get(i) || 0) + 1);
    for (const [i, indices] of row.links.entries()) {
      if (indices.length !== 1 || uses.get(indices[0]) !== 1) continue;
      const id = String(row.ids[i]);
      const native = sy.syriacMorphology.words[id];
      if (!native || native[0] !== row.sy[i] || native[2] + ':' + native[3] !== (row.refs?.[i] || ref)) continue;
      const [, lemma, morph] = words[indices[0] - 1];
      const parsed = decode(morph, lemma);
      const strong = parsed?.segs[parsed.main]?.lemma;
      if (strong && /^\d/u.test(strong)) tags.set(id, {strong: parsed.lang + ':' + strong, ref, form: words[indices[0] - 1][3]});
    }
  }

  const byVerse = new Map();
  const {words, analyses, fields} = sy.syriacMorphology;
  const parts = analyses.map(row => ({
    form: row[fields.indexOf('form')],
    lexeme: row[fields.indexOf('lex')],
    pos: row[fields.indexOf('sp')],
  }));
  const out = Object.entries(words).map(([id, [form, entries, chapter, verse]]) => {
    const word = {id, form, chapter, verse, consonants: norm(form), tag: tags.get(id)};
    if (entries.length) word.signature = keyFor(entries.map(index => parts[index]));
    if (!noWord(form)) {
      const ref = refOf(word);
      if (!byVerse.has(ref)) byVerse.set(ref, []);
      byVerse.get(ref).push(word);
    }
    return word;
  });
  for (const verse of byVerse.values()) {
    const completeVerse = verse.length >= 5 ? verse.map(word => word.consonants) : null;
    for (const [i, word] of verse.entries()) {
      const left = Math.max(0, i - 3);
      const window = verse.slice(left, i + 4);
      if (completeVerse) word.verseKey = JSON.stringify([i, ...completeVerse]);
      if (window.length >= 5) word.contextKey = JSON.stringify([i - left, ...window.map(item => item.consonants)]);
      if (i > 0 && i + 1 < verse.length) {
        word.neighborKey = JSON.stringify([verse[i - 1].consonants, word.consonants, verse[i + 1].consonants]);
      }
      if (word.tag) word.anchorKey = JSON.stringify([word.consonants, word.tag.strong]);
    }
  }
  return {book, textHash: sy.textHash, heTextHash: he.textHash, words: out};
}

const contextIndex = new Map();
const verseIndex = new Map();
const anchorIndex = new Map();
const neighborIndex = new Map();
const formIndex = new Map();
function add(index, key, word, book) {
  if (!key) return;
  const hits = index.get(key) || [];
  hits.push({book, ref: refOf(word), id: word.id, signature: word.signature});
  index.set(key, hits);
}
const sourceBooks = annotated.map(load);
for (const {book, words} of sourceBooks) for (const word of words) {
  if (!word.signature || noWord(word.form)) continue;
  add(contextIndex, word.contextKey, word, book);
  add(verseIndex, word.verseKey, word, book);
  add(anchorIndex, word.anchorKey, word, book);
  add(neighborIndex, word.neighborKey, word, book);
  add(formIndex, word.consonants, word, book);
}

function find(index, key, excludedBook, minBooks, minTotal) {
  const hits = (index.get(key) || []).filter(hit => hit.book !== excludedBook);
  if (hits.length < minTotal) return null;
  const sources = new Map();
  for (const hit of hits) if (!sources.has(hit.book)) sources.set(hit.book, hit);
  if (sources.size < minBooks) return null;
  if (hits.some(hit => hit.signature !== hits[0].signature)) return null;
  return {
    parts: JSON.parse(hits[0].signature),
    count: hits.length,
    books: sources.size,
    evidence: [...sources.values()].slice(0, 3).map(({signature, ...hit}) => hit),
  };
}
const parallel = (word, book) => find(contextIndex, word.contextKey, book, 1, 1);
const anchor = (word, book) => find(anchorIndex, word.anchorKey, book, 2, 3);
const neighbors = (word, book) => find(neighborIndex, word.neighborKey, book, 1, 1);
const unanimousForm = (word, book) => find(formIndex, word.consonants, book, 2, 3);
const same = (proposal, word) => JSON.stringify(proposal.parts) === word.signature;
const sameParts = (left, right) => JSON.stringify(left.parts) === JSON.stringify(right.parts);
function corroborated(word, book, p, a) {
  const exact = find(verseIndex, word.verseKey, book, 1, 1);
  if (exact && [p, a].every(other => !other || sameParts(exact, other))) return {...exact, method: 'whole-verse'};
  if (p && a && sameParts(p, a)) return {...p, method: 'parallel-and-anchor'};
  return null;
}
function checkProposal(local, p, a, spelling, etcbc, sedra) {
  const contexts = [local, p, a].filter(Boolean);
  const corpusSignatures = new Set([
    ...contexts.map(match => JSON.stringify(match.parts)),
    ...etcbc.map(candidate => keyFor(candidate.parts)),
  ]);
  if (contexts.some(match => !sameParts(match, contexts[0]))) return 'conflicting-context';
  if (local && a && spelling && sameParts(local, spelling)) {
    return local.books >= 2 ? 'repeated-neighbor-anchor-and-spelling' : 'neighbor-anchor-and-spelling';
  }
  if (local && a) return 'neighbor-and-anchor';
  if (a && spelling && a.books >= 4 && a.count >= 12 && sameParts(a, spelling)) return 'repeated-anchor-and-spelling';
  if (corpusSignatures.size > 1) return 'competing-analyses';
  if (p || local) return 'syriac-context-only';
  if (a) return 'hebrew-alignment-only';
  if (etcbc.length) return 'corpus-spelling-only';
  return sedra.length > 1 ? 'competing-dictionary-entries' : 'dictionary-spelling-only';
}
const benchmark = sourceBooks.map(({book, words}) => {
  const result = {
    book, annotated: 0, parallel: 0, parallelCorrect: 0, anchor: 0, anchorCorrect: 0,
    corroborated: 0, corroboratedCorrect: 0, neighborAndAnchor: 0, neighborAndAnchorCorrect: 0,
    neighborAnchorAndSpelling: 0, neighborAnchorAndSpellingCorrect: 0,
    repeatedNeighbors: 0, repeatedNeighborsCorrect: 0, repeatedAnchor: 0, repeatedAnchorCorrect: 0,
  };
  for (const word of words) {
    if (!word.signature || noWord(word.form)) continue;
    result.annotated++;
    const p = parallel(word, book);
    const a = anchor(word, book);
    const strong = corroborated(word, book, p, a);
    if (strong) {
      result.corroborated++;
      result.corroboratedCorrect += Number(same(strong, word));
      if (!same(strong, word)) {
        const discrepancies = result.corroboratedDiscrepancies ||= [];
        discrepancies.push({id: word.id, ref: refOf(word), form: word.form, corpus: JSON.parse(word.signature), proposed: strong});
      }
    } else if (a) {
      const local = neighbors(word, book);
      const spelling = unanimousForm(word, book);
      const finding = checkProposal(local, p, a, spelling, [], []);
      if (local && (finding === 'neighbor-and-anchor' || finding.endsWith('neighbor-anchor-and-spelling'))) {
        result.neighborAndAnchor++;
        result.neighborAndAnchorCorrect += Number(same(local, word));
        if (finding.endsWith('neighbor-anchor-and-spelling')) {
          result.neighborAnchorAndSpelling++;
          result.neighborAnchorAndSpellingCorrect += Number(same(local, word));
        }
        if (finding === 'repeated-neighbor-anchor-and-spelling') {
          result.repeatedNeighbors++;
          result.repeatedNeighborsCorrect += Number(same(local, word));
        }
        if (!same(local, word)) {
          const discrepancies = result.neighborAndAnchorDiscrepancies ||= [];
          discrepancies.push({id: word.id, ref: refOf(word), form: word.form, corpus: JSON.parse(word.signature), proposed: local});
        }
      }
      if (finding === 'repeated-anchor-and-spelling') {
        result.repeatedAnchor++;
        result.repeatedAnchorCorrect += Number(same(a, word));
      }
    }
    if (p) {
      result.parallel++;
      result.parallelCorrect += Number(same(p, word));
    }
    if (a) {
      result.anchor++;
      result.anchorCorrect += Number(same(a, word));
    }
  }
  return result;
});

function candidates(word, book) {
  const analyses = new Map();
  for (const hit of formIndex.get(word.consonants) || []) {
    if (hit.book === book) continue;
    if (!analyses.has(hit.signature)) analyses.set(hit.signature, new Set());
    analyses.get(hit.signature).add(hit.book);
  }
  return {
    etcbc: [...analyses].map(([signature, titles]) => ({
      parts: JSON.parse(signature).map(([form, lexeme, pos]) => ({form, lexeme, pos})),
      seenIn: [...titles],
    })),
    sedra: sedraLookup.lookup(word.form),
  };
}

function audit(book, pilot, review, useRepeatedAlignment = false) {
  const target = load(book);
  if (pilot) {
    assert.equal(target.textHash, pilot.textHash);
    assert.equal(target.words.length, pilot.words.length);
  }
  if (review) assert.equal(target.textHash, review.textHash);
  const sampleRows = review?.sample || [];
  const approved = new Map(sampleRows.map(word => [word.id, word]));
  assert.equal(approved.size, sampleRows.length, 'duplicate reviewed word ID');
  const reviewedSedraEntries = {...pilot?.sedraEntries};
  const chapters = {};
  const proposalChecks = {};
  const words = target.words.map((word, i) => {
    const {id, form, chapter, verse, tag} = word;
    const fromPilot = pilot?.words[i];
    if (fromPilot) assert.deepEqual([id, form, chapter, verse], [fromPilot.id, fromPilot.form, fromPilot.chapter, fromPilot.verse]);
    const sample = approved.get(id);
    if (sample) {
      assert.deepEqual([form, chapter, verse], [sample.form, sample.chapter, sample.verse]);
      approved.delete(id);
    }
    const p = parallel(word, target.book);
    const a = anchor(word, target.book);
    const strong = corroborated(word, target.book, p, a);
    const {etcbc, sedra} = fromPilot || candidates(word, book);
    for (const id of sedra) reviewedSedraEntries[id] ??= sedraEntry(id);
    if (sample?.status === 'confirmed') {
      if (sample.sedra) {
        const candidates = sample.sedraQuery ? sedraLookup.lookup(sample.sedraQuery) : sedra;
        assert(candidates.includes(sample.sedra), id);
        reviewedSedraEntries[sample.sedra] ??= sedraEntry(sample.sedra);
      } else {
        assert(sample.proposed.length, id);
        assert.equal(norm(sample.proposed.map(part => part.form).join('')), norm(form), id);
      }
    }
    let status;
    if (noWord(form)) status = 'non-word';
    else if (word.signature) status = 'embedded-analysis';
    else if (sample?.status === 'confirmed') status = 'context-reviewed';
    else if (sample?.status === 'open') status = 'review-open';
    else if (strong) status = 'corroborated-source';
    else if (p) status = 'parallel-proposal';
    else if (a) status = 'aligned-proposal';
    else if (etcbc.length) status = 'spelling-proposal';
    else if (sedra.length) status = 'sedra-proposal';
    else status = 'no-candidate';
    let proposalCheck;
    if (status.endsWith('-proposal')) {
      const local = neighbors(word, target.book);
      const spelling = a && unanimousForm(word, target.book);
      const finding = checkProposal(local, p, a, spelling, etcbc, sedra);
      proposalCheck = {
        finding, ...(local ? {neighbors: local} : {}),
        ...(finding.endsWith('and-spelling') ? {spelling} : {}),
        accepted: finding === 'repeated-neighbor-anchor-and-spelling' ||
          (useRepeatedAlignment && finding === 'repeated-anchor-and-spelling'),
      };
      proposalChecks[finding] = (proposalChecks[finding] || 0) + 1;
    }
    const counts = chapters[chapter] ||= {};
    counts[status] = (counts[status] || 0) + 1;
    return {
      id, form, chapter, verse, status, ...(tag ? {hebrew: tag} : {}),
      ...(p ? {parallel: p} : {}), ...(a ? {anchor: a} : {}),
      ...(strong ? {corroborated: strong} : {}),
      ...(proposalCheck ? {proposalCheck} : {}),
      ...(sample ? {review: sample} : {}), etcbc, sedra,
    };
  });
  assert.equal(approved.size, 0, 'review contains IDs outside the selected edition');

  return {
    version: 1, book, textHash: target.textHash, heTextHash: target.heTextHash,
    source: pilot?.source || sources, chapters, proposalChecks, words, sedraEntries: reviewedSedraEntries,
  };
}

function accepted(report) {
  const {version, book, textHash, source, words} = report;
  const entries = words.flatMap(({id, form, chapter, verse, status, review: sample, corroborated: source, proposalCheck, anchor}) => {
    const position = {id, form, chapter, verse};
    if (status === 'context-reviewed') {
      if (sample.sedra) {
        const entry = sedraData.lexemes[sample.sedra];
        assert(entry, id);
        return [{...position, sedra: {id: sample.sedra, lemma: norm(entry.vocal || entry.form)}, note: sample.note}];
      }
      return [{...position, parts: sample.proposed.map(({form, lexeme, pos}) => [form, lexeme, pos]), note: sample.note}];
    }
    if (status === 'corroborated-source') {
      return [{...position, parts: source.parts, parallel: {method: source.method, ...source.evidence[0]}}];
    }
    if (proposalCheck?.accepted) {
      if (proposalCheck.finding === 'repeated-anchor-and-spelling') {
        const {parts, evidence} = anchor;
        return [{...position, parts, alignedSources: evidence.slice(0, 2)}];
      }
      const {parts, evidence} = proposalCheck.neighbors;
      return [{...position, parts, contextualSources: evidence.slice(0, 2)}];
    }
    return [];
  });
  return {version, book, textHash, source: 'Safran (KI-Kontextprüfung)', base: source.etcbc, license: source.license, entries};
}

function writeReviewData(reports, batch) {
  const lines = reports.map(({entries, ...header}) => {
    const rows = entries.map(row => '    ' + JSON.stringify(row)).join(',\n');
    return JSON.stringify(header, null, 2).slice(0, -2) + ',\n  "entries": [\n' + rows + '\n  ]\n}';
  });
  if (!batch) return lines[0] + '\n';
  return '{\n  "books": [\n' + lines.map(line => line.replace(/^/gm, '    ')).join(',\n') + '\n  ]\n}\n';
}

if (process.argv[2] === '--assign-missing') {
  const outputDir = process.argv[3];
  assert(outputDir, 'a directory for the audit files is required');
  mkdirSync(outputDir, {recursive: true});
  const existing = new Set([
    require('../../peshitta-ruth-lemma-review.json').book,
    require('../../peshitta-isaiah-lemma-review.json').book,
  ]);
  const summaries = [];
  const reviews = [];
  const includeEmbeddedGaps = process.argv.includes('--include-embedded-gaps');
  const gapReviews = includeEmbeddedGaps ? require('./embedded-gap-context.json').books : [];
  const books = coverage.filter(row => !existing.has(row.title) &&
    (!row.annotated || (includeEmbeddedGaps && row.annotated < row.words)));
  for (const {title, words, annotated} of books) {
    const report = audit(title, null, gapReviews.find(review => review.book === title), true);
    assert.equal(report.words.length, words, title);
    const review = accepted(report);
    const filename = title.replaceAll(' ', '_') + '.json';
    writeFileSync(path.join(outputDir, filename), JSON.stringify(report) + '\n');
    const methods = {
      parallelText: review.entries.filter(row => row.parallel).length,
      contextMatching: review.entries.filter(row => row.contextualSources).length,
      repeatedAlignment: review.entries.filter(row => row.alignedSources).length,
      individualReview: report.words.filter(row => row.status === 'context-reviewed').length,
    };
    const noCandidate = Object.values(report.chapters).reduce((sum, chapter) => sum + (chapter['no-candidate'] || 0), 0);
    summaries.push({
      book: title, words, embedded: annotated, accepted: review.entries.length,
      open: words - annotated - review.entries.length,
      noCandidate, ...methods, audit: filename,
    });
    if (review.entries.length) reviews.push(review);
  }
  writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify({sources, benchmark, books: summaries}, null, 2) + '\n');
  process.stdout.write(writeReviewData(reviews, true));
} else {
  const pilot = read(process.argv[2]);
  const report = audit(pilot.book, pilot, read(process.argv[3]), process.argv.includes('--include-repeated-alignment'));
  process.stdout.write(process.argv.includes('--accepted')
    ? writeReviewData([accepted(report)], false)
    : JSON.stringify({...report, benchmark}) + '\n');
}
