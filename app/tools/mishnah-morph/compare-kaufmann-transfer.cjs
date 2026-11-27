'use strict';
// This compares existing donor analyses with private reference FEATURES only.
// In particular, reference.rows[].word is not an independent vowel witness.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {featureCompatible} = require('./compare.cjs');
const TITLE = 'Mishnah Berakhot';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const hashObject = value => sha256(JSON.stringify(value));
const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
const readablePart = part => part && !part.unreadable && Object.keys(part).some(key => !['note', 'referenceWord', 'unreadable'].includes(key));

function compareTransfer(original, target, reference, provenance = {}) {
  if (reference?.module !== 'MISH-T' || reference?.version !== '4.3' || reference?.title !== TITLE || !Array.isArray(reference.rows)) {
    throw new Error('Expected the private MISH-T 4.3 Mishnah Berakhot reference with rows[].parts.');
  }
  const donor = original?.sources?.[TITLE];
  if (!donor || !Array.isArray(original.forms) || !Array.isArray(target?.transfers)) {
    throw new Error('Expected original Berakhot forms/sources and target transfers[].');
  }
  if (!isHash(donor.textHash) || target.source?.donorTextHash !== donor.textHash) {
    throw new Error('Donor source hash mismatch: transfer contexts must belong to the exact original Berakhot source.');
  }
  if (!isHash(target.source?.textHash)) throw new Error('Missing target edition text hash.');
  if (reference.sourceHash && reference.sourceHash !== donor.textHash) throw new Error('Private reference source hash mismatch.');

  const references = new Map();
  for (const row of reference.rows) {
    if (!/^\d+:\d+$/.test(row.ref || '') || !Number.isInteger(row.token) || row.token < 1) {
      throw new Error('Private reference contains an invalid ref/token alignment.');
    }
    const key = row.ref + '#' + row.token;
    if (references.has(key)) throw new Error('Duplicate private reference position: ' + key);
    references.set(key, row);
  }
  // The four result categories are disjoint. Partial unreadability is also
  // counted separately even where all supplied readable features are compatible.
  const counts = {transfers: target.transfers.length, transferred: 0, 'open-skipped': 0, compatible: 0, different: 0, 'reference-missing': 0, unreadable: 0, 'with-unreadable-features': 0, 'without-original-analyses': 0};
  const units = new Map(), ids = new Set();
  for (const transfer of target.transfers) {
    if (!transfer || !['transferred', 'open'].includes(transfer.status)) throw new Error('Unexpected transfer status.');
    if (transfer.status === 'open') { counts['open-skipped']++; continue; }
    counts.transferred++;
    if (typeof transfer.id !== 'string' && typeof transfer.id !== 'number') throw new Error('Transferred position has no stable id.');
    if (ids.has(transfer.id)) throw new Error('Duplicate transferred id: ' + transfer.id);
    ids.add(transfer.id);
    const match = /^(\d+):(\d+)$/.exec(transfer.sourceRef || '');
    if (!match || !Number.isInteger(transfer.sourceToken) || transfer.sourceToken < 1) throw new Error('Invalid transferred donor position.');
    const formId = donor.chapters?.[+match[1] - 1]?.[+match[2] - 1]?.[transfer.sourceToken - 1];
    const form = original.forms[formId];
    if (!form || transfer.donorWord !== form.word) {
      throw new Error('Transferred donor word no longer matches hash-bound source at ' + transfer.sourceRef + '#' + transfer.sourceToken);
    }
    if (typeof transfer.targetRef !== 'string' || !Number.isInteger(transfer.targetWordIndex)) throw new Error('Invalid transferred target position.');
    let unit = units.get(transfer.targetRef);
    if (!unit) { unit = {targetRef: transfer.targetRef, transferred: 0, compatible: 0, different: 0, 'reference-missing': 0, unreadable: 0, 'with-unreadable-features': 0}; units.set(transfer.targetRef, unit); }
    unit.transferred++;
    const row = references.get(transfer.sourceRef + '#' + transfer.sourceToken);
    let status;
    if (!row) status = 'reference-missing';
    else {
      const parts = Array.isArray(row.parts) ? row.parts : [];
      const partial = parts.some(part => part?.unreadable);
      if (partial) { counts['with-unreadable-features']++; unit['with-unreadable-features']++; }
      if (!parts.some(readablePart)) status = 'unreadable';
      else {
        const analyses = Array.isArray(form.analyses) ? form.analyses : [];
        if (!analyses.length) counts['without-original-analyses']++;
        // Never use target spelling to select another occurrence's analyses.
        const compatible = analyses.some(analysis => {
          if (typeof analysis.lemma !== 'string' || typeof analysis.morph !== 'string') throw new Error('Malformed original analysis.');
          return featureCompatible(analysis, parts);
        });
        status = compatible ? 'compatible' : 'different';
      }
    }
    counts[status]++; unit[status]++;
  }
  if (counts.transferred !== counts.compatible + counts.different + counts['reference-missing'] + counts.unreadable) throw new Error('Internal count mismatch.');
  return {
    kind: 'kaufmann-berakhot-transfer-morph-feature-comparison',
    version: 1,
    title: TITLE,
    scope: 'Only transferred positions; existing analyses at exact original sourceRef/sourceToken; no new analyses and no changes to either edition.',
    provenance: {
      reference: {module: reference.module, version: reference.version, sha256: provenance.referenceSha256 || hashObject(reference), hashBasis: provenance.referenceSha256 ? 'exact input file bytes' : 'JSON serialization of supplied object', containsSourceHash: Boolean(reference.sourceHash)},
      target: {datasetSha256: provenance.targetDatasetSha256 || hashObject(target), hashBasis: provenance.targetDatasetSha256 ? 'exact dataset file bytes' : 'JSON serialization of supplied object', edition: target.source.edition || target.edition || null, textHash: target.source.textHash, donorTextHash: target.source.donorTextHash, diplomaticSha256: target.source.diplomaticSha256 || null, alignmentSha256: target.source.alignmentSha256 || null},
      original: {textHash: donor.textHash, datasetSha256: provenance.originalDatasetSha256 || hashObject(original), contextBinding: 'target.source.donorTextHash equals original.sources[Mishnah Berakhot].textHash; every transferred donorWord is checked at its exact sourceRef/sourceToken'},
      referenceAlignment: 'Legacy manually aligned ref/token rows; existing reference word fields derive from the original edition and are not surface-vowel evidence.'
    },
    counts,
    perTargetUnit: [...units.values()].sort((a, b) => a.targetRef.localeCompare(b.targetRef, undefined, {numeric: true})),
    countMeaning: {compatible: 'At least one existing original analysis matches all supplied readable parts; extra or absent reference features are not verified.', different: 'No existing original analysis matches the supplied readable parts, including positions with no original analyses.', 'reference-missing': 'No private reference row at the exact donor ref/token.', unreadable: 'Reference row has no supplied readable feature parts.', 'with-unreadable-features': 'Overlapping count: at least one explicitly unreadable part, also where readable features match.', 'open-skipped': 'Open transfers are not compared.'},
    vowels: {status: 'not-checked', reason: 'No independently transcribed Accordance surface vowels in existing reference'},
    limitations: [
      'Morphological feature compatibility is not a vowel comparison or a philological approval of the transferred text.',
      'Private reference word fields are never treated as independently transcribed Accordance Niqqud.',
      'The legacy reference lacks per-image source hashes and independently captured surface vowels; its reference-file SHA identifies this exact transcription only.',
      'Compatible means that one candidate matches supplied readable features, not that all candidate analyses or missing suffix features are validated.',
      'No commercial reference text, reference word fields, or private parts are reproduced in this aggregate report.'
    ]
  };
}

function main(args) {
  if (!args.length || args.includes('--help')) {
    process[args.includes('--help') ? 'stdout' : 'stderr'].write('Usage: node tools/mishnah-morph/compare-kaufmann-transfer.cjs PRIVATE_REFERENCE.json [REPORT.json] [--dataset TARGET.js] [--original ORIGINAL.js]\n');
    return args.includes('--help') ? 0 : 1;
  }
  const positional = [], options = {};
  for (let i = 0; i < args.length; i++) {
    if (['--dataset', '--original'].includes(args[i])) {
      const key = args[i].slice(2);
      if (!args[i + 1] || args[i + 1].startsWith('--') || options[key]) throw new Error('Invalid or duplicate option ' + args[i]);
      options[key] = args[++i];
    } else if (args[i].startsWith('--')) throw new Error('Unknown option ' + args[i]);
    else positional.push(args[i]);
  }
  if (!positional.length || positional.length > 2) throw new Error('Expected private reference path and optional aggregate report path.');
  const referencePath = path.resolve(positional[0]);
  const targetPath = path.resolve(options.dataset || path.join(__dirname, '../../mishnah-kaufmann-berakhot-data.js'));
  const originalPath = path.resolve(options.original || path.join(__dirname, '../../mishnah-morph-data.js'));
  const outputPath = positional[1] ? path.resolve(positional[1]) : null;
  if (outputPath && [referencePath, targetPath, originalPath].includes(outputPath)) throw new Error('Report output must not overwrite a reference or dataset.');
  const referenceBytes = fs.readFileSync(referencePath), targetBytes = fs.readFileSync(targetPath), originalBytes = fs.readFileSync(originalPath);
  const reference = JSON.parse(referenceBytes.toString('utf8'));
  const target = require(targetPath), original = require(originalPath);
  const report = compareTransfer(original, target, reference, {referenceSha256: sha256(referenceBytes), targetDatasetSha256: sha256(targetBytes), originalDatasetSha256: sha256(originalBytes)});
  const json = JSON.stringify(report, null, 2) + '\n';
  if (outputPath) fs.writeFileSync(outputPath, json); else process.stdout.write(json);
  return 0;
}
module.exports = {compareTransfer, main};
if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { process.stderr.write('Kaufmann transfer comparison failed: ' + error.message + '\n'); process.exitCode = 1; }
}
