(()=>{'use strict';
const endpoint='https://pococha-comment-access.freefreelife2000.chatgpt.site/api/catalog';
const button=document.getElementById('answers-share');
const status=document.getElementById('answers-sync-status');
const retry=document.getElementById('answers-retry');
const direct=document.getElementById('answers-direct');
let destination=null,busy=false;
function canonicalUrl(){const target=new URL('https://pococha-challenge.freefreelife2000.chatgpt.site/'),incoming=new URL(location.href);for(const key of ['month','event'])for(const value of incoming.searchParams.getAll(key))target.searchParams.append(key,value);return target.href;}
if(direct)direct.href=canonicalUrl();
function valid(u){try{const x=new URL(u);return x.origin==='https://pococha-challenge.freefreelife2000.chatgpt.site'&&/^\/(?:index\.html)?$/.test(x.pathname)&&!x.username&&!x.password?x.href:null;}catch{return null;}}
async function share(){const url=destination||canonicalUrl();if(navigator.share){try{await navigator.share({title:'ポコチャレ先生',url});return;}catch(e){if(e&&e.name==='AbortError')return;}}
try{await navigator.clipboard.writeText(url);status.textContent='共有URLをコピーしました。';}catch{status.textContent='アドレスバーからURLをコピーしてください。';}}
button?.addEventListener('click',share);
async function update(){
if(busy)return;busy=true;if(retry)retry.disabled=true;
status.textContent='最新版を確認しています。';
const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
try{const r=await fetch(endpoint,{cache:'no-store',credentials:'omit',signal:controller.signal});
if(!r.ok)throw Error('http');const data=await r.json();if(!Array.isArray(data.tools))throw Error('format');
const entries=data.tools.filter(x=>x&&x.id==='answers');if(entries.length!==1)throw Error('duplicate or missing tool');
const match=entries[0];if(typeof match.enabled!=='boolean')throw Error('state');
if(!match.enabled){status.textContent='現在は非公開です。所有者の方は「最新版を直接開く」からログインしてください。';return;}
const url=valid(match.url);if(!url)throw Error('destination');
const target=new URL(url),incoming=new URL(location.href);
for(const key of ['month','event']){const values=incoming.searchParams.getAll(key);if(values.length){target.searchParams.delete(key);for(const value of values)target.searchParams.append(key,value);}}
destination=target.href;status.textContent='公開中の最新版へ移動しています。';location.replace(destination);
}catch{status.textContent='最新版を確認できません。「更新」で再確認するか、「最新版を直接開く」をお使いください。';}
finally{clearTimeout(timer);busy=false;if(retry)retry.disabled=false;}}
document.getElementById('answers-retry')?.addEventListener('click',update);
update();
})();