'use strict';
// Context-bound editorial working translations for round 2, shard B.
// Source text and existing complete working translations are never replaced.
const manual = require('./round-2-b-manual.json');
const exact = new Map(manual.map(x => [x.source, x]));
function manualFor(reading, entry) {
 const m = exact.get(reading.text);
 if (!m || !m.contexts.some(c => (Number.isInteger(c.ordinal) && c.ordinal === entry.ordinal) || (typeof c.label === 'string' && c.label.length > 0 && c.label === entry.label) || (c.references || []).some(ref => (reading.references || []).includes(ref)))) return null;
 const uncertain = [...m.uncertain];
 const losses = [...String(reading.text).matchAll(/\*|#+|[\[\]]|�|…|\.{2,}|∅/g)].map(x => x[0]);
 uncertain.push(...losses);
 return { de: m.de + (losses.length ? ' [Lücke oder unsichere Zeichen im Original.]' : ''), status: uncertain.length ? 'partial' : m.status, uncertain: [...new Set(uncertain)], method: 'editorial-review-working-translation', uuid: reading.uuid };
}
function review(entry, priorRecord) {
 return { ...priorRecord, ordinal: entry.ordinal, uuid: entry.uuid, sourceHash: entry.sourceHash, readings: entry.readings.map((reading, i) => {
  const prior = priorRecord.readings[i];
  if (prior.uuid !== reading.uuid) throw new Error('Reading order mismatch at ' + entry.ordinal);
  return prior.status === 'partial' ? manualFor(reading, entry) || prior : prior;
 }) };
}
module.exports = { review, manualFor };
