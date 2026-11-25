'use strict';
const assert=require('node:assert/strict');
module.exports=async({js})=>{
 await js("document.querySelector('header nav [data-tab=search]').click()");
 assert.equal(await js("document.querySelector('#sOutlineTab')"),null,'Gliederung nicht als zusätzlicher Suchmodus');
 assert.deepEqual(await js("[...document.querySelectorAll('#sModes [role=tab]')].map(b=>b.id)"),['sTextTab','sSyntaxTab','sClauseTab']);
 await js("document.querySelector('#sClauseTab').click()");
 assert(await js("!document.querySelector('#sSyntax').hidden&&!document.querySelector('#sxClausePanel').hidden&&document.querySelector('#gForm').hidden"));
 assert.equal(await js("document.querySelector('#sClauseTab').getAttribute('aria-selected')"),'true');
 await js("document.querySelector('#sSyntaxTab').click()");assert(await js("!document.querySelector('#gForm').hidden&&document.querySelector('#sxClausePanel').hidden"));
 await js("document.querySelector('#sSyntaxTab').dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}))");assert.equal(await js("document.activeElement.id"),'sClauseTab');
 await js("document.querySelector('#sTextTab').click()");assert(await js("!document.querySelector('#sText').hidden&&document.querySelector('#sSyntax').hidden"));
 console.log('Electron: Textsuche, Wortmerkmale und Klauseln direkt erreichbar; Gliederung aus Suchnavigation entfernt.');
};
