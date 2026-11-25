'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const E=require('../research-export'),Flow=require('../research-flow');
const sheet={title:'Blatt',layout:{template:'classic'},blocks:[{id:'a',region:'main',type:'explanation',text:'עברית'},{id:'b',region:'left',type:'explanation',text:'Kommentar <script>window.userScriptRan=true</script>'}]};
test('standalone classic HTML permits only the fixed flow script by its exact CSP hash',()=>{
 const h=E.html(sheet),hash=crypto.createHash('sha256').update(Flow.scriptSource).digest('base64');
 assert(h.includes('script-src &apos;sha256-'+hash+'&apos;'));assert(h.includes('<script>'+Flow.scriptSource+'</script>'));
 assert(h.includes('&lt;script&gt;window.userScriptRan=true&lt;/script&gt;'));assert(!h.includes('<script>window.userScriptRan'));
 assert(h.includes("default-src 'none'"));assert(h.includes('@media print{body{width:190mm;'),'print layout is measured at its actual paper width');
});
test('sandboxed preview remains script-free and linear sheets retain their original layout',()=>{
 const preview=E.html(sheet,[],{interactive:false});assert(!preview.includes('<script>'));assert(!preview.includes('script-src'));assert(preview.includes(Flow.css));
 const linear=E.html({...sheet,layout:{template:'linear'}});assert(!linear.includes('<script>'));assert(!linear.includes('classic-upper'));
});
