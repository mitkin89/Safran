// An additive pointing layer. Diplomatic letters, punctuation and existing marks
// are never normalized or replaced. All offsets are original UTF-16 offsets.
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KaufmannPointing = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const pointing = /[\u05b0-\u05bd\u05bf\u05c1\u05c2\u05c7]/u;
  const allPointing = /[\u05b0-\u05bd\u05bf\u05c1\u05c2\u05c7]/gu;
  const combining = /\p{M}/u;
  const hebrewLetter = /[א-ת]/u;

  function string(value, name) {
    if (typeof value !== 'string') throw new TypeError(name + ' must be a string');
    return value;
  }

  function stripPointing(s) {
    return string(s, 'text').replace(allPointing, '');
  }

  function markClass(mark) {
    if (/[\u05b0-\u05bb\u05c7]/u.test(mark)) return 'vowel';
    if (mark === '\u05c1' || mark === '\u05c2') return 'shin/sin';
    if (mark === '\u05bc' || mark === '\u05bf') return 'dagesh/rafe';
    return null; // Meteg may coexist with the other classes.
  }

  // Keep non-pointing combining signs (including cantillation) attached to the
  // same letter, without changing their order or their original positions.
  function clusters(s) {
    const result = [];
    let current = null, offset = 0;
    for (const ch of s) {
      if (pointing.test(ch)) {
        if (!current || !hebrewLetter.test(current.base)) {
          return {reason: 'Pointing without a Hebrew-letter anchor'};
        }
        if ((ch === '\u05c1' || ch === '\u05c2') && current.base !== 'ש') {
          return {reason: 'Shin/sin point on a different letter'};
        }
        current.marks.push(ch);
      } else if (!(combining.test(ch) && current)) {
        current = {base: ch, marks: [], end: offset};
        result.push(current);
      }
      offset += ch.length;
      current.end = offset;
    }
    return {items: result};
  }

  function conflicting(marks) {
    const classes = new Map();
    for (const mark of marks) {
      const cls = markClass(mark);
      if (cls && classes.has(cls) && classes.get(cls) !== mark) return cls;
      if (cls) classes.set(cls, mark);
    }
    return null;
  }

  function insert(original, insertions) {
    let text = original;
    for (let i = insertions.length - 1; i >= 0; i--) {
      const addition = insertions[i];
      text = text.slice(0, addition.offset) + addition.text + text.slice(addition.offset);
    }
    return text;
  }

  function transferWord(target, donor) {
    string(target, 'target'); string(donor, 'donor');
    const blocked = reason => ({status: 'blocked', text: target, target, donor, reason, insertions: []});
    if (stripPointing(target) !== stripPointing(donor)) {
      return blocked('Non-pointing characters differ');
    }
    const destination = clusters(target), source = clusters(donor);
    if (destination.reason || source.reason) return blocked(destination.reason || source.reason);
    const insertions = [];
    for (let i = 0; i < destination.items.length; i++) {
      const to = destination.items[i], from = source.items[i];
      const conflict = conflicting(to.marks.concat(from.marks));
      if (conflict) return blocked('Conflicting ' + conflict + ' marks');
      const present = new Set(to.marks), additions = [];
      for (const mark of from.marks) {
        if (!present.has(mark)) { additions.push(mark); present.add(mark); }
      }
      if (additions.length) insertions.push({offset: to.end, text: additions.join('')});
    }
    return {status: insertions.length ? 'transferred' : 'unchanged',
      text: insert(target, insertions), target, donor, insertions};
  }

  function splitsSurrogate(s, offset) {
    return offset > 0 && offset < s.length &&
      /[\ud800-\udbff]/.test(s[offset - 1]) && /[\udc00-\udfff]/.test(s[offset]);
  }

  function applyWordTransfers(originalText, edits) {
    string(originalText, 'originalText');
    if (!Array.isArray(edits)) throw new TypeError('edits must be an array');
    const ordered = edits.map(edit => {
      if (!edit || typeof edit !== 'object') throw new TypeError('Each edit must be an object');
      const {start, end, target, donor} = edit;
      string(target, 'target'); string(donor, 'donor');
      if (!Number.isInteger(start) || !Number.isInteger(end) ||
          start < 0 || end <= start || end > originalText.length ||
          splitsSurrogate(originalText, start) || splitsSurrogate(originalText, end)) {
        throw new RangeError('Invalid original word span');
      }
      if (originalText.slice(start, end) !== target) throw new Error('Original span does not match target');
      return {start, end, target, donor};
    }).sort((a, b) => a.start - b.start);
    for (let i = 1; i < ordered.length; i++) {
      if (ordered[i].start < ordered[i - 1].end) throw new Error('Overlapping original word spans');
    }
    const insertions = [];
    for (const edit of ordered) {
      const result = transferWord(edit.target, edit.donor);
      for (const addition of result.insertions) {
        insertions.push({offset: edit.start + addition.offset, text: addition.text});
      }
    }
    return {text: insert(originalText, insertions), insertions};
  }

  return {stripPointing, transferWord, applyWordTransfers};
});
