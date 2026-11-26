'use strict';
const crypto=require('node:crypto'),R=require('../../reader'),T=require('../../maccabees-text');
function profile(doc,family,provenance={}){
 return {title:doc.title,language:doc.language,versionTitle:doc.versionTitle,family,...provenance,
  textHash:crypto.createHash('sha256').update(JSON.stringify(doc.text)).digest('hex'),
  chapters:doc.text.map(ch=>({slots:ch.length,visible:R.flattenNode(ch).length,signature:T.signature(R.flattenNode(ch))}))};
}
module.exports={profile};
