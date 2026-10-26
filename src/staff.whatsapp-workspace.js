/* Corner Cafe WhatsApp workspace. Preview add-on, no customer messages until Meta connected. */
(function(){
'use strict';
if(window.CornerWhatsappWorkspace)return;
const BASE='https://ilbrfwxblhidtlsjgxlh.supabase.co/functions/v1/whatsapp-admin';
const SB='https://ilbrfwxblhidtlsjgxlh.supabase.co';
const PUB='sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E';
let state={tab:'',orderId:'',inbox:null,thread:null,order:null,peer:'',busy:false,error:'',mode:'inbox'};
const root=document.getElementById('cc-staff');if(!root)return;
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const date=x=>x?new Date(x).toLocaleString('en-FJ',{timeZone:'Pacific/Fiji',dateStyle:'medium',timeStyle:'short'}):'';
const client=()=>window.supabase&&window.supabase.createClient(SB,PUB,{auth:{persistSession:true,storageKey:'cc-cakes-staff'}});
const db=client();
async function call(op,payload={}){
 if(!db)throw new Error('WhatsApp sign-in is unavailable.');
 const {data:{session}}=await db.auth.getSession();
 if(!session)throw new Error('Sign in to the Cake CRM.');
 const res=await fetch(BASE,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,apikey:PUB},body:JSON.stringify({op,...payload})});
 const result=await res.json();
 if(!res.ok||!result.ok)throw new Error(result.error||'WhatsApp could not load.');
 return result;
}
function mine(){return !!root.querySelector('.ccs-app')&&!root.querySelector('#ccs-login');}
function role(){const nav=root.querySelector('.ccs-nav');return !!nav && [...nav.querySelectorAll('[data-tab]')].some(el=>el.dataset.tab==='customers');}
function orderId(){
 const s=root.querySelector('#ccs-sheet.ccs-open');
 if(!s)return '';
 const ref=s.querySelector('.os-tref');
 const item=ref&&ref.textContent.trim();
 if(!item)return '';
 // Order ID is not encoded in the rendered UI. Find matching in-app order button only when unique.
 const matched=[...root.querySelectorAll('[data-act="open-order"][data-id]')].filter(b=>b.textContent.includes(item));
 return matched.length===1?matched[0].dataset.id:'';
}
function panel(name){let el=root.querySelector('#ccwa-panel');if(!el){el=document.createElement('section');el.id='ccwa-panel';el.className='ccwa-panel';root.appendChild(el);}el.hidden=false;el.innerHTML='<div class="ccwa-top"><h2>'+esc(name)+'</h2><button type="button" class="ccs-btn ccs-ghost" data-wa="close">Close</button></div><div id="ccwa-body"><p>Loading messages…</p></div>';return el;}
function list(messages,orderView){
 return (messages||[]).length?'<div class="ccwa-messages">'+messages.map(m=>'<article class="ccwa-message '+(m.direction==='outbound'?'out':'in')+'"><p>'+esc(m.body||'['+(m.message_type||'message')+']')+'</p><small>'+date(m.created_at)+' · '+esc(m.status)+'</small>'+(orderView?'':'')+'</article>').join('')+'</div>':'<p class="ccs-quiet">No messages yet.</p>';
}
function composer(peer,order){
 if(!peer)return '<p class="ccs-note">This order has no valid WhatsApp contact number.</p>';
 return '<form class="ccwa-compose" id="ccwa-compose"><label for="ccwa-text">Reply to '+esc(peer)+'</label><textarea id="ccwa-text" maxlength="4096" rows="3" required placeholder="Type your reply…"></textarea><button class="ccs-btn" type="submit">Send WhatsApp reply</button><p class="ccs-hint">Replies require a customer message within 24 hours. Messages sent outside this window require an approved template.</p></form>';
}
function err(e){const b=root.querySelector('#ccwa-body');if(b)b.innerHTML='<p class="ccs-err">'+esc(e.message||e)+'</p><button class="ccs-btn ccs-ghost" data-wa="refresh">Retry</button>';}
async function showInbox(){
 state.mode='inbox';panel('WhatsApp inbox');
 try{state.inbox=await call('inbox');const b=root.querySelector('#ccwa-body');if(!b)return;
 if(!state.inbox.enabled){b.innerHTML='<p class="ccs-note">WhatsApp is not connected yet. No messages can be sent.</p>';return;}
 b.innerHTML='<p class="ccs-hint">Conversations are grouped by phone number. Link messages to the correct cake order after checking the details.</p>'+
 (state.inbox.threads.length?state.inbox.threads.map(t=>'<button type="button" class="ccwa-thread" data-wa="thread" data-phone="'+esc(t.peer_number)+'"><b>'+esc(t.peer_number)+'</b><small>'+date(t.created_at)+'</small><span>'+esc((t.body||'Media message').slice(0,110))+'</span></button>').join(''):'<p>No messages yet.</p>');
 }catch(e){err(e);}
}
async function showThread(peer){
 state.mode='thread';state.peer=peer;panel('WhatsApp · '+peer);
 try{state.thread=await call('thread',{peer_number:peer});const b=root.querySelector('#ccwa-body');if(!b)return;
 b.innerHTML='<button type="button" class="ccs-link" data-wa="inbox">Back to inbox</button>'+list(state.thread.messages)+composer(peer);
 }catch(e){err(e);}
}
async function showOrder(id){
 state.mode='order';state.orderId=id;panel('Order messages');
 try{state.order=await call('order',{order_id:id});const x=state.order,b=root.querySelector('#ccwa-body');if(!b)return;
 b.innerHTML='<h3>Order '+esc(x.order_reference)+'</h3><p class="ccs-hint">Conversation: '+esc(x.peer_number||'No phone number')+'</p>'+
 (!x.enabled?'<p class="ccs-note">WhatsApp is not connected. Messaging remains disabled.</p>':'')+
 '<h4>Messages linked to this order</h4>'+list(x.linked,true)+
 (x.unlinked.length?'<h4>Other messages from this number — check before linking</h4>'+
 x.unlinked.map(m=>'<div class="ccwa-review"><p>'+esc(m.body||'Media message')+'</p><small>'+date(m.created_at)+'</small> <button type="button" class="ccs-btn ccs-ghost" data-wa="link" data-message="'+esc(m.id)+'">Link to this order</button></div>').join(''):'')+
 (x.enabled?composer(x.peer_number,true):'');
 }catch(e){err(e);}
}
function enhance(){
 if(!mine()||!role())return;
 const nav=root.querySelector('.ccs-nav');
 if(nav&&!nav.querySelector('[data-wa="inbox"]')){
 const button=document.createElement('button');button.type='button';button.className='ccs-nav-item';button.dataset.wa='inbox';button.innerHTML='<span aria-hidden="true">✉</span><span>WhatsApp inbox</span>';nav.appendChild(button);
 }
 const sheet=root.querySelector('#ccs-sheet.ccs-open');
 if(sheet&&sheet.querySelector('.os-tref')&&!sheet.querySelector('[data-wa="order"]')){
 const id=orderId();if(id){
 const button=document.createElement('button');button.type='button';button.className='ccs-btn ccs-ghost ccwa-order-button';button.dataset.wa='order';button.dataset.order=id;button.textContent='WhatsApp messages';
 const target=sheet.querySelector('.ccs-sheet-body');
 if(target)target.prepend(button);
 }}
}
let queued=false;const watch=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});});
watch.observe(root,{childList:true,subtree:true});
root.addEventListener('click',e=>{
 const btn=e.target.closest('[data-wa]');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();
 if(btn.dataset.wa==='close'){root.querySelector('#ccwa-panel').hidden=true;return;}
 if(btn.dataset.wa==='inbox')return showInbox();
 if(btn.dataset.wa==='thread')return showThread(btn.dataset.phone);
 if(btn.dataset.wa==='order')return showOrder(btn.dataset.order);
 if(btn.dataset.wa==='refresh')return state.mode==='order'?showOrder(state.orderId):state.mode==='thread'?showThread(state.peer):showInbox();
 if(btn.dataset.wa==='link'&&state.orderId){
 if(!confirm('Link this message to the current cake order?'))return;
 call('link',{order_id:state.orderId,message_id:btn.dataset.message}).then(()=>showOrder(state.orderId)).catch(err);
 }
},true);
root.addEventListener('submit',e=>{
 if(e.target.id!=='ccwa-compose')return;e.preventDefault();e.stopImmediatePropagation();
 const txt=root.querySelector('#ccwa-text');const message=txt?.value.trim();if(!message)return;
 if(state.busy)return;state.busy=true;const btn=e.target.querySelector('button');if(btn)btn.disabled=true;
 call('reply',{to:state.mode==='order'?state.order.peer_number:state.peer,message,request_id:crypto.randomUUID(),...(state.mode==='order'?{order_id:state.orderId}:{})})
 .then(()=>state.mode==='order'?showOrder(state.orderId):showThread(state.peer))
 .catch(err).finally(()=>{state.busy=false;if(btn)btn.disabled=false;});
},true);
enhance();window.CornerWhatsappWorkspace={preview:true};
})();