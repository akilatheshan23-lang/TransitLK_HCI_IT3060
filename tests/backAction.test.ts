import {test} from 'node:test';
import assert from 'node:assert/strict';
import {performBack} from '../mobile/src/navigation/backAction.ts';
test('explicit back action takes priority over stack history',()=>{
 const calls:string[]=[];
 performBack({explicit:()=>calls.push('explicit'),navigation:{canGoBack:()=>true,goBack:()=>calls.push('stack')},appBack:()=>calls.push('app')});
 assert.deepEqual(calls,['explicit']);
});
test('nested screen returns through stack history',()=>{
 const calls:string[]=[];
 performBack({navigation:{canGoBack:()=>true,goBack:()=>calls.push('stack')},moduleBack:()=>calls.push('module'),appBack:()=>calls.push('app')});
 assert.deepEqual(calls,['stack']);
});
test('empty stack exits to module entry instead of doing nothing',()=>{
 const calls:string[]=[];
 performBack({navigation:{canGoBack:()=>false,goBack:()=>calls.push('stack')},moduleBack:()=>calls.push('module'),appBack:()=>calls.push('app')});
 assert.deepEqual(calls,['module']);
});
test('standalone screen falls back to app navigation',()=>{
 let called=false;performBack({appBack:()=>{called=true;}});assert.equal(called,true);
});
