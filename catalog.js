(()=>{'use strict';
const toolDescriptions={"meter":"Pocochaのメーターボーダーを確認。目標までのコイン・アイテム数の目安を計算。","coin":"コイン予算や人数・K数から、余りの少ない配分を比較。","answers":"Pococha「ぽこチャレ」の月別解答一覧。オープン・ファミリーの解答を確認・コピペ。","record":"時間・エールを記録して、日々の活動を振り返る。","comments-library":"Pococha配信中に付けるタグや、キラコメ・連コメ・定期コメを探してコピペ。","profile":"検索結果の文章からPocochaプロフィールURLを取り出す。"};
const endpoint='https://pococha-comment-access.freefreelife2000.chatgpt.site/api/catalog',tools=document.querySelector('.tools'),status=document.getElementById('catalog-status'),refresh=document.getElementById('catalog-refresh'),toolId=document.body.dataset.toolId;
let busy=false,signature=null,focusRefresh=false;
async function sync(){
 if(busy)return;busy=true;refresh.disabled=true;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const r=await fetch(endpoint,{cache:'no-store',credentials:'omit',signal:controller.signal});
  if(!r.ok)throw Error();const data=await r.json();if(!Array.isArray(data.tools))throw Error();
  const selected=data.tools.filter(t=>t&&(!toolId||t.id===toolId));
  const next=document.createDocumentFragment(),ids=new Set();
  for(const t of selected){
   if(typeof t.enabled!=='boolean'||typeof t.id!=='string'||ids.has(t.id)||typeof t.label!=='string'||typeof t.description!=='string')throw Error();ids.add(t.id);
   const a=document.createElement(t.enabled?'a':'article');a.className='tool'+(t.enabled?' is-public':' is-disabled');a.dataset.tool=t.id;
   if(t.enabled){const url=new URL(t.url);if(url.protocol!=='https:'||!url.hostname.endsWith('.freefreelife2000.chatgpt.site')||url.username||url.password||url.port)throw Error();a.href=url.href;}
   else a.setAttribute('aria-disabled','true');
   const span=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small'),badge=document.createElement('span');strong.textContent=t.label;small.textContent=toolDescriptions[t.id]||t.description;badge.className='catalog-state '+(t.enabled?'public':'private');badge.textContent=t.enabled?'公開中':'非公開中';span.append(strong,small,badge);a.append(span);next.append(a);
  }
  const key=JSON.stringify(selected.map(t=>[t.id,t.label,t.url,t.description,t.enabled]));
  if(key!==signature){const focused=document.activeElement?.dataset?.tool;tools.replaceChildren(next);signature=key;if(focused){const link=Array.from(tools.children).find(a=>a.dataset.tool===focused);if(link&&link.tagName==='A')link.focus({preventScroll:true});else focusRefresh=true;}}
  const active=selected.filter(t=>t.enabled).length;
  status.textContent=selected.length?(active?(toolId?'公開中のツールを開けます。':'公開中のツールを選んでください。'):(toolId?'このツールは現在非公開中です。':'ツールはすべて非公開中です。')):'ツールが登録されていません。';
 }catch{const focused=document.activeElement?.dataset?.tool;tools.replaceChildren();signature=null;if(focused)focusRefresh=true;status.textContent='公開設定を確認できません。通信を確認して更新してください。';}
 finally{clearTimeout(timer);busy=false;refresh.disabled=false;if(focusRefresh){focusRefresh=false;refresh.focus({preventScroll:true});}}
}
refresh.addEventListener('click',sync);window.addEventListener('pageshow',sync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});setInterval(()=>{if(!document.hidden)sync();},15000);sync();})();
