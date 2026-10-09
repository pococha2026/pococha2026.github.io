/* © 2026 Pococha1012 — offline application shell only; no user data. */
'use strict';
const VERSION='2.46',BASE=new URL(self.registration.scope),ROOT=new URL('./',BASE).href;
const PREFIX='pococha-offline:'+encodeURIComponent(BASE.pathname)+':',CACHE=PREFIX+VERSION;
const CONTROL=PREFIX+'control',CONTROL_URL=new URL('offline-control',BASE).href;
const ASSETS=['manifest.webmanifest','icon-192.png','icon-512.png'];
let cacheEpoch=0,mutation=Promise.resolve(),prepareJob=null;
const downloads=new Set();
function cacheName(fence){return CACHE+(fence===null?'':':g:'+encodeURIComponent(fence));}
function mutate(fn){const next=mutation.then(fn,fn);mutation=next.catch(()=>{});return next;}
const isAppURL=url=>{try{const u=new URL(url);return u.origin===BASE.origin&&[...u.searchParams.keys()].every(k=>['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].includes(k))&&(u.pathname===BASE.pathname||u.pathname===new URL('index.html',BASE).pathname);}catch(_){return false;}};
async function isApp(response,exact=true){
 if(!response||response.status!==200||response.type==='opaque'||response.redirected)return false;
 if(response.url&&!isAppURL(response.url))return false;
 if(!/text\/html/i.test(response.headers.get('content-type')||''))return false;
 const size=Number(response.headers.get('content-length')||0);if(size>2000000)return false;
 const text=await response.clone().text();return text.length<2000000&&(exact?text.includes('<meta name="pococha-offline-version" content="'+VERSION+'">'):/<meta name="pococha-offline-version" content="[0-9.]+">/.test(text))&&text.includes('id="pocochaRightsConfig"')&&text.includes('function createEngine(');
}
async function download(url,validate,ms){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),ms);downloads.add(abort);
 try{const r=await fetch(url,{credentials:'same-origin',cache:'no-store',redirect:'error',signal:abort.signal});if(abort.signal.aborted||!await validate(r))throw Error('Unexpected offline asset');return r;}finally{clearTimeout(timer);downloads.delete(abort);}
}
async function validAsset(name,r){
 const url=new URL(name,BASE).href;if(!r||r.status!==200||r.redirected||r.type==='opaque'||r.url&&r.url!==url)return false;
 const mime=r.headers.get('content-type')||'';
 if(name==='manifest.webmanifest'){if(!/application\/(manifest\+json|json)/i.test(mime))return false;const text=await r.clone().text();if(text.length>16000)return false;try{const m=JSON.parse(text);return m.id==='./'&&m.start_url==='./'&&m.scope==='./'&&m.name==='Pococha1012 Pococha 同額コイン計算機'&&m.display==='standalone'&&ASSETS.slice(1).every(src=>m.icons?.some(i=>i.src===src&&i.type==='image/png'&&i.sizes===(src.includes('192')?'192x192':'512x512')));}catch(_){return false;}}
 if(!/^image\/png(?:;|$)/i.test(mime))return false;const bytes=new Uint8Array(await r.clone().arrayBuffer()),size=name==='icon-192.png'?192:name==='icon-512.png'?512:0;
 if(bytes.length<33||bytes.length>=500000||![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)||![0,0,0,13,73,72,68,82].every((v,i)=>bytes[i+8]===v))return false;
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);return size>0&&view.getUint32(16)===size&&view.getUint32(20)===size;
}
async function fetchShell(){return download(ROOT,isApp,8000);}
async function readFence(){if(!(await caches.keys()).includes(CONTROL))return null;const r=await (await caches.open(CONTROL)).match(CONTROL_URL);return r?await r.text():null;}
async function writeCache(epoch,url,response,fence){
 if(fence===undefined)fence=await readFence();const name=cacheName(fence);
 return mutate(async()=>{if(epoch!==cacheEpoch||fence!==await readFence())return false;const cache=await caches.open(name);if(epoch!==cacheEpoch||fence!==await readFence()){await caches.delete(name);return false;}await cache.put(url,response);if(epoch!==cacheEpoch||fence!==await readFence()){await caches.delete(name);return false;}return true;});
}
async function prepare(){
 const fence=await readFence();if(prepareJob?.epoch===cacheEpoch&&prepareJob.fence===fence)return prepareJob.promise;
 const epoch=cacheEpoch,job={epoch,fence,promise:null};
 job.promise=(async()=>{const response=await fetchShell();if(!await writeCache(epoch,ROOT,response,fence))throw Error('Offline preparation superseded');await Promise.allSettled(ASSETS.map(async name=>{if(epoch!==cacheEpoch)return;const url=new URL(name,BASE).href,r=await download(url,r=>validAsset(name,r),2000);await writeCache(epoch,url,r,fence);}));if(epoch!==cacheEpoch||fence!==await readFence())throw Error('Offline preparation superseded');})().finally(()=>{if(prepareJob===job)prepareJob=null;});
 prepareJob=job;return job.promise;
}
function olderCache(name){if(!name.startsWith(PREFIX)||!/^\d+(?:\.\d+)*$/.test(name.slice(PREFIX.length).split(':g:')[0]))return false;const a=name.slice(PREFIX.length).split(':g:')[0].split('.').map(Number),b=VERSION.split('.').map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)<(b[i]||0))return true;if((a[i]||0)>(b[i]||0))return false;}return false;}
async function cachedShell(){const epoch=cacheEpoch,fence=await readFence();const name=cacheName(fence);if(!(await caches.keys()).includes(name))return null;const c=await caches.open(name),r=await c.match(ROOT);if(!r)return null;try{return await isApp(r)&&epoch===cacheEpoch&&fence===await readFence()?r:null;}catch(_){return null;}}
function clearOwned(except=null){++cacheEpoch;for(const abort of downloads)if(abort!==except)abort.abort();return mutate(async()=>{const fence=String(Date.now())+':'+Math.random()+':'+cacheEpoch;const writeFence=async()=>await (await caches.open(CONTROL)).put(CONTROL_URL,new Response(fence,{headers:{'Content-Type':'text/plain'}}));let recorded=false;try{await writeFence();recorded=true;}catch(_){}const failures=[];for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CONTROL)try{await caches.delete(name);}catch(e){failures.push(e);}if(!recorded)await writeFence();if(failures.length)throw failures[0];});}
self.addEventListener('install',event=>event.waitUntil(prepare()));
self.addEventListener('activate',event=>event.waitUntil(mutate(async()=>{const epoch=cacheEpoch;if(!await cachedShell()||epoch!==cacheEpoch)throw Error('Missing offline shell');for(const name of await caches.keys())if(olderCache(name))await caches.delete(name);if(epoch!==cacheEpoch)throw Error('Offline cache cleared');await self.clients.claim();})));
function offlineFailure(){return new Response('<!doctype html><html lang="ja"><meta name="viewport" content="width=device-width,initial-scale=1"><title>接続が必要です</title><body><h1>オンラインで開き直してください</h1><p>オフライン用の保存が見つかりません。通信できるときに計算機を開いて、使い方・管理の「オフラインの準備」を確認してください。</p><button type="button" onclick="location.reload()">もう一度開く</button></body></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}
function boundedCache(operation,ms){return new Promise((resolve,reject)=>{let done=false;const timer=setTimeout(()=>finish(Error('Cache read timed out')),ms);function finish(error,value){if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(value);}Promise.resolve().then(operation).then(value=>finish(null,value),error=>finish(error));});}
async function navigate(request,background=null){
 const epoch=cacheEpoch,abort=new AbortController(),timer=setTimeout(()=>abort.abort(),3000);downloads.add(abort);
 try{
  const metadata=boundedCache(readFence,400).then(fence=>({fence,readable:true}),()=>({fence:null,readable:false}));const response=await fetch(request,{signal:abort.signal,cache:'no-store'});
  if(response.status===401||response.status===403||response.redirected){clearTimeout(timer);downloads.delete(abort);await clearOwned(abort).catch(()=>{});return response;}
  if(response.status>=500){const old=await boundedCache(cachedShell,1000).catch(()=>null);return old||response;}
  if(await isApp(response)){clearTimeout(timer);downloads.delete(abort);try{const {fence,readable}=await metadata;if(readable){const saving=writeCache(epoch,ROOT,response.clone(),fence).catch(()=>false);if(background)background(saving);else await boundedCache(()=>saving,1000).catch(()=>false);}}catch(_){/* A full cache must not block online use. */}}
  else if(response.status===200&&!await isApp(response,false)){clearTimeout(timer);downloads.delete(abort);await clearOwned(abort).catch(()=>{});}
  return response;
 }catch(_){return await boundedCache(cachedShell,1000).catch(()=>null)||offlineFailure();}
 finally{clearTimeout(timer);downloads.delete(abort);}
}
self.addEventListener('fetch',event=>{
 const r=event.request;if(r.method!=='GET')return;
 if(r.mode==='navigate'&&isAppURL(r.url)){let complete,deferred=false;event.waitUntil(new Promise(resolve=>complete=resolve));event.respondWith(navigate(r,p=>{deferred=true;p.finally(complete);}).finally(()=>{if(!deferred)complete();}));return;}
 const u=new URL(r.url);if(u.origin!==BASE.origin||u.search||!ASSETS.some(name=>u.href===new URL(name,BASE).href))return;
 event.respondWith((async()=>{try{const fence=await readFence(),name=cacheName(fence);if((await caches.keys()).includes(name)){const stored=await (await caches.open(name)).match(r);if(stored&&fence===await readFence())return stored;}}catch(_){}return fetch(r);})());
});
self.addEventListener('message',event=>{
 const data=event.data,port=event.ports?.[0];if(!port||!event.source||!isAppURL(event.source.url)||!data||!['STATUS','PREPARE','ACTIVATE','CLEAR'].includes(data.type))return;
 event.waitUntil((async()=>{try{
  if(data.type==='PREPARE')await prepare();if(data.type==='CLEAR')await clearOwned();
  if(data.type==='ACTIVATE'){const epoch=cacheEpoch;let activation;await mutate(async()=>{if(!await cachedShell()||epoch!==cacheEpoch)throw Error('Missing offline shell');activation=self.skipWaiting();});await activation;}
  port.postMessage({type:data.type,version:VERSION,cached:!!await cachedShell()});
 }catch(_){port.postMessage({type:data.type,version:VERSION,cached:false,error:'保存を確認できません。通信とブラウザーの保存設定を確認してください。'});}finally{port.close();}})());
});
