'use strict';
// Independent surface comparison. The user-supplied text is never a donor.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const P = require('../../kaufmann-pointing');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hash = object => sha(JSON.stringify(object));
const bidi = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const letter = /[א-ת]/u;
const mark = /[\u05b0-\u05bd\u05bf\u05c1\u05c2\u05c7]/u;
const consonants = value => Array.from(String(value).normalize('NFD')).filter(ch => letter.test(ch)).join('');
const hashValid = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);

// Mapping is to original UTF-16 offsets, never to a normalized replacement text.
function parseLine(raw, start, end, ref, referenceSpan, displaySpan) {
  const annotations = [], excluded = [], delimiters = new Set(), stack = [];
  if (referenceSpan) excluded.push({...referenceSpan, kind: 'reference-label'});
  if (displaySpan) excluded.push({...displaySpan, kind: 'display-number'});
  const closing = {'{': '}', '⟦': '⟧', '(': ')', '<': '>', '[': ']', '⌝': '⌜'};
  const closers = new Set(Object.values(closing));
  for (let i = start; i < end; i++) {
    if (referenceSpan && i >= referenceSpan.start && i < referenceSpan.end) { i = referenceSpan.end - 1; continue; }
    if (displaySpan && i >= displaySpan.start && i < displaySpan.end) { i = displaySpan.end - 1; continue; }
    if (raw[i] === '(') {
      const numeric = /^\(\s*\d+\s*\)/u.exec(raw.slice(i, end));
      if (numeric) { excluded.push({start: i, end: i + numeric[0].length, kind: 'numeric-division'}); i += numeric[0].length - 1; continue; }
    }
    const ch = raw[i];
    if (closing[ch]) { stack.push({start: i, opener: ch, closer: closing[ch]}); delimiters.add(i); }
    else if (closers.has(ch)) {
      delimiters.add(i);
      if (stack.length && stack.at(-1).closer === ch) {
        const open = stack.pop(); annotations.push({start: open.start, end: i + 1, kind: open.opener + ch, raw: raw.slice(open.start, i + 1), balanced: true});
      } else annotations.push({start: i, end: i + 1, kind: 'unmatched-closer', raw: ch, balanced: false});
    }
  }
  for (const open of stack) annotations.push({start: open.start, end, kind: 'unclosed-' + open.opener, raw: raw.slice(open.start, end), balanced: false});
  const chars = [], offsets = [];
  for (let i = start; i < end;) {
    const ch = String.fromCodePoint(raw.codePointAt(i)), next = i + ch.length;
    if (bidi.test(ch)) { excluded.push({start: i, end: next, kind: 'bidi'}); i = next; continue; }
    const skip = excluded.find(span => span.kind !== 'bidi' && i >= span.start && i < span.end);
    if (skip) { chars.push(' '); offsets.push(i); i = skip.end; continue; }
    if (!delimiters.has(i)) { chars.push(ch); for (let k = i; k < next; k++) offsets.push(k); }
    i = next;
  }
  const projection = chars.join(''), tokens = [], floatingMarkRanges = [];
  // Apostrophes stay inside tokens, so point marks on an abbreviation sign
  // cannot silently migrate to the preceding Hebrew letter.
  const word = /[^\s\u05be\u05c0\u05c3]+/gu;
  for (const match of projection.matchAll(word)) {
    if (!consonants(match[0])) {
      if (Array.from(match[0]).some(ch => mark.test(ch))) floatingMarkRanges.push({start: offsets[match.index], end: offsets[match.index + match[0].length - 1] + 1});
      continue;
    }
    const searchText = match[0].replace(/^[.,;:!?]+|[.,;:!?]+$/gu, '');
    const trimStart = match[0].indexOf(searchText);
    const tokenStart = offsets[match.index + trimStart], tokenEnd = offsets[match.index + trimStart + searchText.length - 1] + 1;
    const touched = annotations.filter(span => span.start <= tokenEnd && span.end >= tokenStart);
    tokens.push({index: tokens.length, ref, start: tokenStart, end: tokenEnd, raw: raw.slice(tokenStart, tokenEnd), searchText, consonants: consonants(searchText), annotationTouched: touched.length > 0, annotationRanges: touched.map(({start, end, kind, balanced}) => ({start, end, kind, balanced}))});
  }
  for (const span of floatingMarkRanges) {
    const before = tokens.filter(token => token.end <= span.start).at(-1), after = tokens.find(token => token.start >= span.end);
    if (before) before.pointingSuspect = 'Unattached reference pointing in the adjacent raw gap';
    if (after) after.pointingSuspect = 'Unattached reference pointing in the adjacent raw gap';
  }
  return {ref, start, end, raw: raw.slice(start, end), referenceSpan, floatingMarkRanges, annotations: annotations.sort((a, b) => a.start - b.start), excluded, projection, tokens};
}

function parseReference(raw, options = {}) {
  if (typeof raw !== 'string') throw new TypeError('Reference text must be a string.');
  const units = [], refs = new Set();
  let start = 0;
  while (start < raw.length) {
    const lineBreak = /[\r\n]/u.exec(raw.slice(start)), newline = lineBreak ? start + lineBreak.index : -1, end = newline < 0 ? raw.length : newline;
    if (raw.slice(start, end).trim()) {
      const label = (options.labelPattern || /Ber\.\s*(\d+)\s*:\s*(\d+)/u).exec(raw.slice(start, end));
      let ref, referenceSpan = null;
      if (label) { ref = +label[1] + ':' + +label[2]; referenceSpan = {start: start + label.index, end: start + label.index + label[0].length}; }
      else if (!units.length && (options.openingPattern || /^מאמתי\s+קורין(?:\s|$)/u).test(raw.slice(start, end).normalize('NFD').replace(/[^א-ת\s]/gu, '').trim())) ref = '1:1';
      else throw new Error('Unlabelled reference line at UTF-16 offset ' + start + '; only the identified opening 1:1 can be inferred.');
      if (refs.has(ref)) throw new Error('Duplicate reference unit ' + ref);
      refs.add(ref);
      const headerEnd = referenceSpan?.end ?? start;
      const display = options.displayNumbers && /^[\s\u200e\u200f]*\([אב⌝⌜\s]*\d+[אב⌝⌜\s]*\)/u.exec(raw.slice(headerEnd, end));
      const displaySpan = display ? {start: headerEnd, end: headerEnd + display[0].length} : null;
      const unit = parseLine(raw, start, end, ref, referenceSpan, displaySpan);
      unit.refInferred = !label; units.push(unit);
    }
    if (newline < 0) break;
    start = newline + (raw[newline] === '\r' && raw[newline + 1] === '\n' ? 2 : 1);
  }
  return {offsetConvention: 'UTF-16 offsets into unchanged raw input', units};
}

// An edge is accepted only if neither endpoint can be omitted in any optimal
// consonant-only LCS, and each endpoint has exactly one possible partner.
function uniqueConsonantAnchors(targetTokens, referenceTokens) {
  const a = targetTokens.map(t => typeof t === 'string' ? consonants(t) : t.consonants || consonants(t.originalWord || t.raw || ''));
  const b = referenceTokens.map(t => typeof t === 'string' ? consonants(t) : t.consonants || consonants(t.raw || ''));
  const n = a.length, m = b.length;
  const pre = Array.from({length: n + 1}, () => new Uint32Array(m + 1));
  const suf = Array.from({length: n + 1}, () => new Uint32Array(m + 1));
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) pre[i + 1][j + 1] = a[i] && a[i] === b[j] ? pre[i][j] + 1 : Math.max(pre[i][j + 1], pre[i + 1][j]);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) suf[i][j] = a[i] && a[i] === b[j] ? suf[i + 1][j + 1] + 1 : Math.max(suf[i + 1][j], suf[i][j + 1]);
  const optimum = pre[n][m], left = Array.from({length: n}, () => []), right = Array.from({length: m}, () => []);
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) if (a[i] && a[i] === b[j] && pre[i][j] + 1 + suf[i + 1][j + 1] === optimum) { left[i].push(j); right[j].push(i); }
  const omitLeft = left.map((_, i) => Array.from({length: m + 1}, (_, j) => pre[i][j] + suf[i + 1][j]).some(value => value === optimum));
  const omitRight = right.map((_, j) => Array.from({length: n + 1}, (_, i) => pre[i][j] + suf[i][j + 1]).some(value => value === optimum));
  const anchors = [];
  left.forEach((partners, i) => { const j = partners[0]; if (partners.length === 1 && right[j].length === 1 && !omitLeft[i] && !omitRight[j]) anchors.push({targetIndex: i, referenceIndex: j}); });
  return {length: optimum, anchors};
}

function pointingSignature(word) {
  const checked = P.transferWord(P.stripPointing(word), word);
  if (checked.status === 'blocked') return {status: 'blocked', reason: checked.reason};
  const clusters = [];
  let current = null;
  for (const ch of word.normalize('NFD')) {
    if (letter.test(ch)) { current = {base: ch, marks: []}; clusters.push(current); }
    else if (mark.test(ch)) {
      if (!current) return {status: 'blocked', reason: 'Pointing without a letter'};
      current.marks.push(ch);
    } else if (!/\p{M}/u.test(ch)) current = null;
  }
  for (const cluster of clusters) cluster.marks = [...new Set(cluster.marks)].sort();
  return {status: 'valid', clusters};
}

function comparePointing(target, rawReference, options = {}) {
  if (!target?.units || typeof target.units !== 'object' || !Array.isArray(target?.transfers) || !hashValid(target.source?.textHash) || !hashValid(target.source?.donorTextHash)) throw new Error('Expected target units/transfers and target/donor source hashes.');
  if (options.expectedTargetTextHash && options.expectedTargetTextHash !== target.source.textHash) throw new Error('Target edition text hash mismatch.');
  const parsed = parseReference(rawReference);
  const references = new Map(parsed.units.map(unit => [unit.ref, unit]));
  const targetUnits = new Map();
  for (const [unitKey, unit] of Object.entries(target.units)) {
    const ref = unit.ref || unit.targetRef || (!Array.isArray(target.units) ? unitKey : null);
    if (!ref || !Array.isArray(unit.words) || targetUnits.has(ref)) throw new Error('Expected unique target units with ref and words[].');
    targetUnits.set(ref, unit);
  }
  const counts = {match: 0, different: 0, 'reference-suspect': 0, 'annotation-open': 0, 'alignment-open': 0, 'target-open': 0};
  const details = [], perUnit = [], examples = [];
  const categoryOf = ch => /[\u05b0-\u05bb\u05c7]/u.test(ch) ? 'vowel' : ch === '\u05bc' ? 'dagesh' : ch === '\u05bd' ? 'meteg' : ch === '\u05bf' ? 'rafe' : 'shin-dot';
  const differencesByMarkCategory = Object.fromEntries(['vowel', 'shin-dot', 'dagesh', 'meteg', 'rafe'].map(category => [category, {positions: 0, letterDifferences: 0, targetMissing: 0, referenceMissing: 0, differingNonemptySets: 0}]));
  const differenceShapes = {onlyMissingMarks: 0, hasDifferingNonemptySets: 0};
  for (const [ref, unit] of targetUnits) {
    const reference = references.get(ref), words = unit.words;
    const transfers = target.transfers.filter(transfer => transfer.targetRef === ref);
    const tokens = words.map(word => ({...word, consonants: consonants(word.originalWord)}));
    const anchors = reference ? uniqueConsonantAnchors(tokens, reference.tokens) : {length: 0, anchors: []};
    const partners = new Map(anchors.anchors.map(anchor => [anchor.targetIndex, anchor.referenceIndex]));
    const local = {ref, ...Object.fromEntries(Object.keys(counts).map(key => [key, 0]))};
    const used = new Set();
    for (const transfer of transfers) {
      if (!Number.isInteger(transfer.targetWordIndex) || transfer.targetWordIndex < 0 || transfer.targetWordIndex >= words.length || used.has(transfer.targetWordIndex)) throw new Error('Invalid/duplicate target word index in ' + ref);
      used.add(transfer.targetWordIndex);
      const index = transfer.targetWordIndex, word = words[index], r = reference?.tokens[partners.get(index)];
      if (transfer.originalWord !== word.originalWord || transfer.pointedWord !== (word.text || word.pointed || word.pointedWord)) throw new Error('Transfer no longer matches target unit at ' + ref + '#' + index);
      let status, reason, difference;
      const targetPointed = transfer.pointedWord;
      if (transfer.status !== 'transferred') { status = 'target-open'; reason = 'Transfer was not completed; no vowel comparison.'; }
      else if (!r || !tokens[index].consonants || tokens[index].consonants !== r.consonants) { status = 'alignment-open'; reason = 'No mandatory unique consonant-only 1:1 LCS anchor.'; }
      else if (r.annotationTouched) { status = 'annotation-open'; reason = 'Reference token touches preserved editorial markup; no base-hand attribution is inferred.'; }
      else if (r.pointingSuspect) { status = 'reference-suspect'; reason = r.pointingSuspect; }
      else {
        const sourceSignature = pointingSignature(r.raw), targetSignature = pointingSignature(targetPointed);
        if (sourceSignature.status === 'blocked') { status = 'reference-suspect'; reason = sourceSignature.reason; }
        else if (targetSignature.status === 'blocked' || consonants(targetPointed) !== tokens[index].consonants) { status = 'target-open'; reason = targetSignature.reason || 'Target pointing changes consonants.'; }
        else if (JSON.stringify(sourceSignature.clusters) === JSON.stringify(targetSignature.clusters)) status = 'match';
        else {
          status = 'different';
          difference = targetSignature.clusters.map((cluster, i) => ({letterIndex: i, target: cluster.marks, reference: sourceSignature.clusters[i]?.marks || []})).filter(item => JSON.stringify(item.target) !== JSON.stringify(item.reference));
          const wordCategories = new Set(); let nonemptyDifference = false;
          for (const change of difference) {
            for (const category of new Set(change.target.concat(change.reference).map(categoryOf))) {
              const left = change.target.filter(ch => categoryOf(ch) === category), right = change.reference.filter(ch => categoryOf(ch) === category);
              if (JSON.stringify(left) === JSON.stringify(right)) continue;
              wordCategories.add(category);
              const summary = differencesByMarkCategory[category]; summary.letterDifferences++;
              if (!left.length) summary.targetMissing++;
              else if (!right.length) summary.referenceMissing++;
              else { summary.differingNonemptySets++; nonemptyDifference = true; }
            }
          }
          for (const category of wordCategories) differencesByMarkCategory[category].positions++;
          differenceShapes[nonemptyDifference ? 'hasDifferingNonemptySets' : 'onlyMissingMarks']++;
          reason = 'NFD point-mark sets differ; this is not an error judgment.';
        }
      }
      counts[status]++; local[status]++;
      details.push({id: transfer.id, ref, targetWordIndex: index, sourceRef: transfer.sourceRef, sourceToken: transfer.sourceToken, status, reason: reason || null, targetWord: targetPointed, reference: r ? {start: r.start, end: r.end, raw: r.raw, annotationRanges: r.annotationRanges} : null, ...(difference ? {difference} : {})});
      // Public examples contain positions and mark names only, never whole lines.
      if (status === 'different' && examples.length < 4) examples.push({ref, targetWordIndex: index, markDifferences: difference.slice(0, 3).map(item => ({letterIndex: item.letterIndex, target: item.target.map(ch => 'U+' + ch.codePointAt(0).toString(16).toUpperCase()), reference: item.reference.map(ch => 'U+' + ch.codePointAt(0).toString(16).toUpperCase())}))});
    }
    perUnit.push(local);
  }
  if (target.transfers.some(transfer => !targetUnits.has(transfer.targetRef))) throw new Error('Transfer points to a missing target unit.');
  const aggregate = {
    kind: 'independent-kaufmann-berakhot-surface-pointing-comparison', version: 1,
    reference: {kind: 'independent user-pasted vocalized Accordance surface text', sha256: options.referenceSha256 || sha(Buffer.from(rawReference)), units: parsed.units.length, inferredOpeningRef: parsed.units.find(unit => unit.refInferred)?.ref || null, usedAsDonor: false},
    target: {datasetSha256: options.datasetSha256 || hash(target), hashBasis: options.datasetSha256 ? 'exact dataset file bytes' : 'JSON serialization of supplied object', textHash: target.source.textHash, textHashVerifiedAgainstEdition: Boolean(options.expectedTargetTextHash), donorTextHash: target.source.donorTextHash, alignmentSha256: target.source.alignmentSha256 || null, diplomaticSha256: target.source.diplomaticSha256 || null},
    method: {alignment: 'Consonants only, by ref; mandatory 1:1 LCS edges unique at both indices across all optimal alignments; vowels never select anchors.', comparison: 'NFD sets of Hebrew pointing marks per letter; no vowel normalization or point deletion beyond canonical NFD/set order.', annotations: 'All markup preserved privately; touched tokens stay open, without assigning any annotation to a base hand.', offsets: parsed.offsetConvention},
    referenceInventory: {tokens: parsed.units.reduce((n, unit) => n + unit.tokens.length, 0), annotationSpans: parsed.units.reduce((n, unit) => n + unit.annotations.length, 0), annotationTouchedTokens: parsed.units.flatMap(unit => unit.tokens).filter(token => token.annotationTouched).length, unbalancedAnnotations: parsed.units.flatMap(unit => unit.annotations).filter(annotation => !annotation.balanced).length, invalidPointingTokens: parsed.units.flatMap(unit => unit.tokens).filter(token => pointingSignature(token.raw).status === 'blocked').length, floatingMarkRanges: parsed.units.reduce((n, unit) => n + unit.floatingMarkRanges.length, 0), suspectTokensIncludingAdjacentFloatingMarks: parsed.units.flatMap(unit => unit.tokens).filter(token => token.pointingSuspect || pointingSignature(token.raw).status === 'blocked').length},
    counts, differencesByMarkCategory, differenceShapes,
    markCategoryMeaning: 'Category positions overlap; letterDifferences are counted per letter/category. targetMissing/referenceMissing mean an empty mark set on that side; differingNonemptySets means both sides carry different marks. None is an editorial error judgment.',
    perUnit, differencePositions: details.filter(item => item.status === 'different').map(({ref, targetWordIndex}) => ({ref, targetWordIndex})), examples,
    meaning: 'A difference is an observed independent surface-mark difference, not a proof of error or philological approval; this text has not supplied morphology tags.',
    limitations: ['Only completed transfers with identical consonants, unique anchors, unannotated reference tokens and valid pointing clusters are compared.', 'Reference numerals, labels and bidi marks are removed only in the search projection; raw input and offsets remain unchanged.', 'Suspect abbreviation/export pointing is blocked; it is never moved to another letter.', 'No complete reference lines or private reference text are included in this public aggregate report.']
  };
  return {aggregate, privateDetails: {referenceSha256: aggregate.reference.sha256, datasetSha256: aggregate.target.datasetSha256, offsetConvention: parsed.offsetConvention, units: parsed.units, comparisons: details}};
}

function main(args) {
  if (!args.length || args.includes('--help')) { process[args.includes('--help') ? 'stdout' : 'stderr'].write('Usage: node tools/mishnah-morph/compare-kaufmann-pointing.cjs REFERENCE.txt [AGGREGATE.json] [--dataset TARGET.js] [--private-details OUTSIDE_REPO.json]\n'); return args.includes('--help') ? 0 : 1; }
  const positional = [], options = {};
  for (let i = 0; i < args.length; i++) {
    if (['--dataset', '--private-details'].includes(args[i])) { if (!args[i + 1] || args[i + 1].startsWith('--') || options[args[i]]) throw new Error('Invalid or duplicate option ' + args[i]); options[args[i]] = args[++i]; }
    else if (args[i].startsWith('--')) throw new Error('Unknown option ' + args[i]);
    else positional.push(args[i]);
  }
  if (positional.length < 1 || positional.length > 2) throw new Error('Expected reference path and optional aggregate output.');
  const referencePath = path.resolve(positional[0]), datasetPath = path.resolve(options['--dataset'] || path.join(__dirname, '../../mishnah-kaufmann-berakhot-data.js'));
  const aggregatePath = positional[1] && path.resolve(positional[1]), privatePath = options['--private-details'] && path.resolve(options['--private-details']);
  const repo = path.resolve(__dirname, '../../..');
  if (privatePath && (privatePath === repo || privatePath.startsWith(repo + path.sep))) throw new Error('Private reference details must be outside the repository.');
  for (const output of [aggregatePath, privatePath].filter(Boolean)) if ([referencePath, datasetPath].includes(output)) throw new Error('Output must not overwrite reference or dataset.');
  if (aggregatePath && privatePath === aggregatePath) throw new Error('Public aggregate and private details require separate paths.');
  const referenceBytes = fs.readFileSync(referencePath), datasetBytes = fs.readFileSync(datasetPath);
  const dataset = require(datasetPath);
  let expectedTargetTextHash;
  if (dataset.source?.rel) {
    const edition = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../bundled', dataset.source.rel), 'utf8'));
    if (!Array.isArray(edition.text)) throw new Error('Target edition has no text array for hash verification.');
    expectedTargetTextHash = hash(edition.text);
  }
  const result = comparePointing(dataset, referenceBytes.toString('utf8'), {referenceSha256: sha(referenceBytes), datasetSha256: sha(datasetBytes), expectedTargetTextHash});
  const publicJSON = JSON.stringify(result.aggregate, null, 2) + '\n';
  if (privatePath) fs.writeFileSync(privatePath, JSON.stringify(result.privateDetails, null, 2) + '\n', {mode: 0o600});
  if (aggregatePath) fs.writeFileSync(aggregatePath, publicJSON); else process.stdout.write(publicJSON);
  return 0;
}
module.exports = {parseReference, uniqueConsonantAnchors, pointingSignature, comparePointing, main};
if (require.main === module) { try { process.exitCode = main(process.argv.slice(2)); } catch (error) { process.stderr.write('Kaufmann surface comparison failed: ' + error.message + '\n'); process.exitCode = 1; } }
