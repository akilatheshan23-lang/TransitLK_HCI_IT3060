const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('mobile/src/location/demoMotion.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const lib={};new Function('exports',source)(lib);
const points=[{latitude:6.9,longitude:79.9},{latitude:6.91,longitude:79.9},{latitude:6.91,longitude:79.91}];
test('demo follows route vertices and advances with elapsed time',()=>{const start=lib.demoFrame(points,0),next=lib.demoFrame(points,10);assert.deepEqual(start.position,points[0]);assert.ok(next.position.latitude>start.position.latitude);assert.equal(next.position.longitude,79.9);assert.equal(next.speedKmh,36);assert.ok(next.etaMinutes<=start.etaMinutes);});
test('demo stops at destination without teleporting or inventing speed',()=>{const end=lib.demoFrame(points,100000);assert.deepEqual(end.position,points[2]);assert.equal(end.speedKmh,0);assert.equal(end.etaMinutes,0);assert.equal(end.arrived,true);});
test('duplicate route vertices do not produce invalid coordinates',()=>{const frame=lib.demoFrame([points[0],points[0],points[1]],1);assert.ok(Number.isFinite(frame.position.latitude));assert.ok(Number.isFinite(frame.position.longitude));});
