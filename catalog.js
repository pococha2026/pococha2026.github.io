(()=>{'use strict';
const endpoint='https://pococha-comment-access.freefreelife2000.chatgpt.site/api/catalog',tools=document.querySelector('.tools'),status=document.getElementById('catalog-status'),refresh=document.getElementById('catalog-refresh'),toolId=document.body.dataset.toolId;
let busy=false,signature=null,focusRefresh=false;
async function sync(){
 if(busy)return;busy=true;refresh.disabled=true;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const r=await fetch(endpoint,{cache:'no-store',credentials:'omit',signal:controller.signal});
  if(!r.ok)throw Error();const data=await r.json();if(!Array.isArray(data.tools))throw Error();
  const selected=data.tools.filter(t=>t&&t.enabled===true&&(!toolId||t.id===toolId));
  const next=document.createDocumentFragment(),ids=new Set();
  for(const t of selected){
   if(typeof t.id!=='string'||ids.has(t.id)||typeof t.label!=='string'||typeof t.description!=='string')throw Error();ids.add(t.id);
   const url=new URL(t.url);if(url.protocol!=='https:'||!url.hostname.endsWith('.freefreelife2000.chatgpt.site')||url.username||url.password||url.port)throw Error();
   const a=document.createElement('a');a.className='tool';a.href=url.href;a.dataset.tool=t.id;
   const span=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=t.label;small.textContent=toolId?'ツールを開く ↗':t.description;span.append(strong,small);a.append(span);next.append(a);
  }
  const key=JSON.stringify(selected.map(t=>[t.id,t.label,t.url,t.description]));
  if(key!==signature){const focused=document.activeElement?.dataset?.tool;tools.replaceChildren(next);signature=key;if(focused){const link=Array.from(tools.children).find(a=>a.dataset.tool===focused);if(link)link.focus({preventScroll:true});else focusRefresh=true;}}
  status.textContent=selected.length?(toolId?'公開中のツールを開けます。':'使いたいツールを選んでください。'):(toolId?'このツールは現在非公開です。':'現在公開中のツールはありません。');
 }catch{const focused=document.activeElement?.dataset?.tool;tools.replaceChildren();signature=null;if(focused)focusRefresh=true;status.textContent='公開設定を確認できません。通信を確認して更新してください。';}
 finally{clearTimeout(timer);busy=false;refresh.disabled=false;if(focusRefresh){focusRefresh=false;refresh.focus({preventScroll:true});}}
}
refresh.addEventListener('click',sync);window.addEventListener('pageshow',sync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});setInterval(()=>{if(!document.hidden)sync();},15000);sync();})();
