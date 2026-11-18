'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {claimSingleInstance,focusWindow}=require('../app-instance');
test('A second launch exits without registering another profile owner',()=>{
 const app=new EventEmitter();let quit=0,activated=0;app.requestSingleInstanceLock=()=>false;app.quit=()=>quit++;
 assert.equal(claimSingleInstance(app,()=>activated++),false);app.emit('second-instance');
 assert.equal(quit,1);assert.equal(activated,0);
});
test('The owner activates its existing window for subsequent launches',()=>{
 const app=new EventEmitter();let activated=0;app.requestSingleInstanceLock=()=>true;app.quit=()=>assert.fail('Owner must remain open');
 assert.equal(claimSingleInstance(app,()=>activated++),true);app.emit('second-instance');assert.equal(activated,1);
 const calls=[],win={isDestroyed:()=>false,isMinimized:()=>true,isVisible:()=>false,restore:()=>calls.push('restore'),show:()=>calls.push('show'),focus:()=>calls.push('focus')};
 assert.equal(focusWindow(win),true);assert.deepEqual(calls,['restore','show','focus']);
 assert.equal(focusWindow(null),false);assert.equal(focusWindow({isDestroyed:()=>true}),false);
});
