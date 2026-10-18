/* Shared contact close controls: no navigation, storage writes, or submission. */
(()=>{'use strict';
 const embedded=document.getElementById('contact-app');
 const root=embedded||document.querySelector('html[data-mode="visitor"] main');
 if(!root||document.getElementById('contact-close-top'))return;
 const panel=embedded&&document.getElementById('contact-home');
 const summary=panel&&panel.querySelector('summary');
 let reopen;
 if(!panel){
  reopen=document.createElement('button');reopen.type='button';reopen.textContent='お問い合わせを開く';reopen.hidden=true;
  reopen.style.cssText='min-height:44px;margin:16px;padding:8px 16px;font:inherit';
  root.before(reopen);
  reopen.addEventListener('click',()=>{root.hidden=false;reopen.hidden=true;top.focus();});
 }
 function close(){
  if(panel){panel.open=false;if(summary)summary.focus();}
  else{root.hidden=true;reopen.hidden=false;reopen.focus();}
 }
 function control(id){
  const row=document.createElement('div');row.style.cssText='display:flex;justify-content:flex-end;margin:8px 0';
  const button=document.createElement('button');button.id=id;button.type='button';button.className='secondary';button.textContent='閉じる';button.setAttribute('aria-label','お問い合わせフォームを閉じる');
  button.style.cssText='min-width:88px;min-height:44px;padding:8px 16px;font:inherit;cursor:pointer';
  button.addEventListener('click',close);row.append(button);return {row,button};
 }
 const first=control('contact-close-top'),last=control('contact-close-bottom'),top=first.button;
 root.prepend(first.row);root.append(last.row);
})();
