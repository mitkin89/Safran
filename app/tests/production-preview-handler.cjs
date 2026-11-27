'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
module.exports=({getLibrary})=>{
 const source=fs.readFileSync(path.join(__dirname,'../main.js'),'utf8');let handler;
 const start=source.indexOf("ipcMain.handle('links:preview'"),end=source.indexOf('// Export eines Abschnitts als PDF',start);
 if(start<0||end<0)throw Error('Production preview handler not found');
 vm.runInNewContext(source.slice(start,end),{ipcMain:{handle:(_,fn)=>{handler=fn;}},getLibrary,LK:require('../links'),heRank:vt=>/^Westminster/.test(vt)?0:1});
 return handler;
};
