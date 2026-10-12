const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('mobile/src/location/routing.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function service(fetch){const exports={};new Function('require','exports','fetch',source)(()=>({GEOAPIFY_API_KEY:'test-key'}),exports,fetch);return exports;}
test('GeoJSON lon/lat converts into native lat/lon across route legs',()=>{const r=service();assert.deepEqual(r.routeGeometry({type:'MultiLineString',coordinates:[[[79.95,6.90],[79.92,6.91]],[[79.92,6.91],[79.87,6.91]]]}),[{latitude:6.9,longitude:79.95},{latitude:6.91,longitude:79.92},{latitude:6.91,longitude:79.92},{latitude:6.91,longitude:79.87}]);});
test('missing routes never produce fabricated geometry',async()=>{const r=service(async()=>({ok:true,json:async()=>({features:[]})}));await assert.rejects(r.roadRoute({latitude:6.9,longitude:79.9},{latitude:6.8,longitude:79.8}),/No road route/);});
test('registered intermediate stops remain ordered in routing request',async()=>{let url;const r=service(async u=>{url=u;return {ok:true,json:async()=>({features:[{geometry:{type:'LineString',coordinates:[[79,6],[80,7]]}}]})};});await r.roadRoute({latitude:6,longitude:79},{latitude:7,longitude:80},undefined,[{latitude:6.5,longitude:79.5}]);assert.match(url,/waypoints=6,79\|6.5,79.5\|7,80/);});
test('location search rejects invalid geometry and limits results to Sri Lanka',async()=>{let url;const r=service(async u=>{url=u;return {ok:true,json:async()=>({features:[{geometry:{coordinates:[79.95,6.9]},properties:{formatted:'Malabe'}},{geometry:{coordinates:[300,200]}}]})};});assert.equal((await r.searchPlaces('Malabe')).length,1);assert.match(url,/filter=countrycode:lk/);});
