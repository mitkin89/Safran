'use strict';
const manual=require('./round-2-root-manual.json'),exact=new Map(manual.map(m=>[m.source,m]));
function manualFor(reading,entry){
 const m=exact.get(reading.text);if(!m||!m.entryUUIDs.includes(entry.uuid)||!m.readingUUIDs.includes(reading.uuid)||!m.references.every(ref=>(reading.references||[]).includes(ref)))return null;
 return {uuid:reading.uuid,de:m.de,status:m.status,uncertain:[...m.uncertain],method:'manual-source-context-review-root'};
}
module.exports={manualFor};
