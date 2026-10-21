import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../pococha-answers/answers-auto-sync.js',import.meta.url),'utf8');
let cases=0;
for(const mode of ['enabled','disabled','offline','invalid','duplicate','badstate']){
 const nodes=new Map();
 for(const id of ['answers-share','answers-sync-status','answers-retry','answers-direct'])nodes.set(id,{textContent:'',disabled:false,href:'',handlers:{},addEventListener(k,v){this.handlers[k]=v;}});
 let moved=null,calls=0;
 const context={URL,AbortController,setTimeout,clearTimeout,document:{getElementById:id=>nodes.get(id)||null},location:{href:'https://pococha2026.github.io/pococha-answers/?month=2026-09&event=poco-land-2026',replace:u=>moved=u},navigator:{},fetch:async()=>{
  calls++;if(mode==='offline')throw Error('offline fixture');
  const tool={id:'answers',enabled:mode==='disabled'?false:mode==='badstate'?'true':true,url:mode==='invalid'?'https://invalid.example/':'https://pococha-challenge.freefreelife2000.chatgpt.site/'};
  return {ok:true,json:async()=>({tools:mode==='duplicate'?[tool,tool]:[tool]})};
 }};
 vm.runInNewContext(code,context);
 nodes.get('answers-retry').handlers.click();
 await new Promise(r=>setImmediate(r));
 assert.equal(calls,1);
 assert.equal(nodes.get('answers-retry').disabled,false);
 assert.equal(new URL(nodes.get('answers-direct').href).search,'?month=2026-09&event=poco-land-2026');
 assert.equal(moved,mode==='enabled'?nodes.get('answers-direct').href:null);
 if(mode==='disabled')assert(nodes.get('answers-sync-status').textContent.includes('非公開'));
 cases++;
}
for(const path of ['pococha-answers/index.html','pococha-challenge/index.html']){
 const html=await readFile(new URL('../'+path,import.meta.url),'utf8');
 assert(html.includes('id="answers-direct"'));
 assert(!html.includes("getElementById('message')"));
}
console.log(JSON.stringify({suite:'answer-entry-routing',cases,passed:true,realBrowser:false,productionRequests:0}));
