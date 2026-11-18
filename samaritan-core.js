// Morphology from the CACCHT / DT-UCPH Samaritan Pentateuch, CC BY-NC 4.0.
// This adapter describes the source annotations without inventing missing values.
(function(root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.SamaritanMorph = factory();
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';
  const POS = {subs:'Substantiv',verb:'Verb',prep:'Präposition',conj:'Konjunktion',nmpr:'Eigenname',art:'Artikel',adjv:'Adjektiv',nega:'Verneinung',prps:'Personalpronomen',advb:'Adverb',prde:'Demonstrativpronomen',intj:'Interjektion',inrg:'Fragepartikel',prin:'Fragepronomen'};
  const STEM = {qal:'Qal',hif:'Hifil',piel:'Piel',nif:'Nifal',hit:'Hitpael',hsht:'Hischtaphel',hof:'Hofal',pual:'Pual'};
  const TENSE = {perf:'Perfekt',impf:'Präfixkonjugation (Imperfekt)',inf:'Infinitiv',ptca:'Partizip aktiv',ptcp:'Partizip passiv',impv:'Imperativ'};
  const PERSON = {p1:'1. Person',p2:'2. Person',p3:'3. Person'};
  const GENDER = {m:'maskulin',f:'feminin'}, NUMBER = {sg:'Singular',pl:'Plural',du:'Dual'};
  const own = id => /^sp:\d{6}$/.test(String(id || ''));
  const present = value => value && value !== 'NA';
  function word(data, id) {
    if (!own(id)) return null;
    const token = data.words[id.slice(3)];
    if (!token) return null;
    return {parts:token[0].map(i=>data.lexicon[i]), phono:token[1] || [], notes:token[2] || [], variants:(token[3] || []).map(i=>data.variants[i])};
  }
  function describe(part, t = s => s) {
    const [, , sp, stem, tense, person, gender, number, suffixPerson, suffixGender, suffixNumber] = part;
    const rows = [t(POS[sp] || sp || 'Nicht bestimmt')];
    const add = (label, value, names) => {
      if (present(value)) rows.push(t(label)+': '+t(value === 'unknown' ? 'Nicht bestimmt' : names[value] || value));
    };
    if (sp === 'verb') rows.push(t('Stamm')+': '+t(STEM[stem] || stem || 'Nicht bestimmt'));
    add('Form',tense,TENSE); add('Person',person,PERSON); add('Genus',gender,GENDER); add('Numerus',number,NUMBER);
    if ([suffixPerson,suffixGender,suffixNumber].some(present)) {
      const suffix = [[suffixPerson,PERSON],[suffixGender,GENDER],[suffixNumber,NUMBER]].filter(([v])=>present(v)).map(([v,n])=>t(v==='unknown'?'Nicht bestimmt':n[v]||v));
      rows.push(t('Pronominalsuffix')+': '+suffix.join(' · '));
    }
    return rows;
  }
  const lemma = part => String(part[0] || '').replace(/[\/\[\]=]+$/g,'');
  return {own, word, describe, lemma};
});
