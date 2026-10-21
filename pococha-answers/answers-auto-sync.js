(()=>{'use strict';
const endpoint='https://pococha-comment-access.freefreelife2000.chatgpt.site/api/catalog';
const button=document.getElementById('answers-share');
const status=document.getElementById('answers-sync-status');
let destination=null;
function valid(u){try{const x=new URL(u);return x.origin==='https://pococha-challenge.freefreelife2000.chatgpt.site'&&/^\/(?:index\.html)?$/.test(x.pathname)&&!x.username&&!x.password?x.href:null;}catch{return null;}}
async function share(){const url=destination||location.href;if(navigator.share){try{await navigator.share({title:'ポコチャレ先生',url});return;}catch(e){if(e&&e.name==='AbortError')return;}}
try{await navigator.clipboard.writeText(url);status.textContent='共有URLをコピーしました。';}catch{status.textContent='アドレスバーからURLをコピーしてください。';}}
button?.addEventListener('click',share);
async function update(){
const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
try{const r=await fetch(endpoint,{cache:'no-store',credentials:'omit',signal:controller.signal});
if(!r.ok)throw Error('http');const data=await r.json();if(!Array.isArray(data.tools))throw Error('format');
const match=data.tools.find(x=>x&&x.id==='answers'&&x.enabled===true);const url=match&&valid(match.url);
if(!url){status.textContent='現在、公開中の解答ページを確認できません。';return;}
const target=new URL(url),incoming=new URL(location.href);
for(const key of ['month','event']){const values=incoming.searchParams.getAll(key);if(values.length){target.searchParams.delete(key);for(const value of values)target.searchParams.append(key,value);}}
destination=target.href;status.textContent='公開中の最新版へ移動しています。';location.replace(destination);
}catch{status.textContent='最新版の確認に失敗しました。下の「更新」で再確認できます。';}
finally{clearTimeout(timer);}}
document.getElementById('answers-retry')?.addEventListener('click',update);
update();
})();