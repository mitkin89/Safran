'use strict';
const corrections=require('./round-2-corrections.json').corrections;
function apply(entry,reading,before){
 const c=corrections.find(c=>c.context===entry.uuid&&c.reading===reading.uuid);if(!c)return null;
 if(c.ordinal!==entry.ordinal||c.sourceHash!==entry.sourceHash||c.source!==reading.text||before.status!==c.before.status||before.de!==c.before.de||JSON.stringify(before.uncertain)!==JSON.stringify(c.before.uncertain))throw Error('Correction baseline mismatch: '+reading.uuid);
 return structuredClone(c.after);
}
module.exports={apply,corrections};
