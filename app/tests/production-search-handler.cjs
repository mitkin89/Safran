'use strict';
// Exercise the real app IPC callback without booting main.js against a user profile.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
module.exports=function productionSearchHandler({getLibrary,searchJobs,outlineDirs=()=>[]}){
 const main=path.join(__dirname,'../main.js'),source=fs.readFileSync(main,'utf8');let handler;
 const jobs=require('../search-jobs');
 const ctx=vm.createContext({
  ipcMain:{handle:(channel,fn)=>{if(channel==='off:search')handler=fn;}},
  getLibrary,searchJobs,outlineDirs,ownerOf:jobs.ownerOf,runSearchWorker:jobs.runSearchWorker,emptyResult:jobs.emptyResult,
  cacheDirOf:()=>null,BHSA:require('../bhsa-index'),require:createRequire(main),
 });
 const start=source.indexOf("ipcMain.handle('off:search'"),end=source.indexOf("ipcMain.on('off:cancelSearch'",start);
 if(start<0||end<0)throw Error('Production search handler not found');
 vm.runInContext(source.slice(start,end),ctx);return handler;
};
