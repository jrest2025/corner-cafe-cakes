/* Corner Cafe WhatsApp workspace. Preview add-on, no customer messages until Meta connected. */
(function(){
'use strict';
if(window.CornerWhatsappWorkspace)return;
const BASE='https://ilbrfwxblhidtlsjgxlh.supabase.co/functions/v1/whatsapp-admin';
const SB='https://ilbrfwxblhidtlsjgxlh.supabase.co';
const PUB='sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E';
let state={tab:'',orderId:'',inbox:null,thread:null,order:null,peer:'',busy:false,error:'',mode:'inbox',status:null,statusPending:false,statusChecked:false,lastOpened:''};
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
// The live CRM Birthday Club bridge exposes the exact current sheet ID. Never guess from a
// customer name/order reference: a customer can have several cake orders.
function orderRef(){
 const sheet=root.querySelector('#ccs-sheet.ccs-open');
 const ref=sheet&&sheet.querySelector('.os-tref');
 return ref?ref.textContent.trim():'';
}
function orderId(){
 const sheet=root.querySelector('#ccs-sheet.ccs-open');
 if(!sheet || !sheet.querySelector('.os-tref'))return '';
 const bridge=window.__ccsBc;
 const current=bridge && typeof bridge.sheet==='function' ? bridge.sheet() : null;
 if(current && current.type==='order' && /^[0-9a-f-]{36}$/i.test(String(current.id||'')))return String(current.id);
 // Capture the explicit order ID on the existing order-button click. It is cleared when
 // another sheet is opened, so an older order cannot be mistaken for the current one.
 return /^[0-9a-f-]{36}$/i.test(state.lastOpened||'')?state.lastOpened:'';
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
 state.mode='inbox';panel('Customer messages');
 try{state.inbox=await call('inbox');const b=root.querySelector('#ccwa-body');if(!b)return;
 if(!state.inbox.enabled){b.innerHTML='<p class="ccs-note">WhatsApp is not connected yet. No messages can be sent.</p>';return;}
 b.innerHTML='<div class="ccwa-channels"><b>WhatsApp</b><span>Viber · planned, provider access required</span></div><p class="ccs-hint">Conversations are grouped by phone number. Link messages to the correct cake order after checking the details.</p>'+
 (state.inbox.threads.length?state.inbox.threads.map(t=>'<button type="button" class="ccwa-thread" data-wa="thread" data-phone="'+esc(t.peer_number)+'"><b>'+esc(t.peer_number)+'</b><small>'+date(t.created_at)+'</small><span>'+esc((t.body||'Media message').slice(0,110))+'</span></button>').join(''):'<p>No messages yet.</p>');
 }catch(e){err(e);}
}
async function showThread(peer){
 state.mode='thread';state.peer=peer;panel('WhatsApp · '+peer);
 try{state.thread=await call('thread',{peer_number:peer});const b=root.querySelector('#ccwa-body');if(!b)return;
 b.innerHTML='<button type="button" class="ccs-link" data-wa="inbox">Back to inbox</button>'+list(state.thread.messages)+composer(peer);
 }catch(e){err(e);}
}
async function showOrder(id,reference){
 state.mode='order';state.orderId=id||'';state.orderReference=reference||'';panel('Order messages');
 try{state.order=await call('order',id?{order_id:id}:{order_reference:reference});state.orderId=state.order.order_id;const x=state.order,b=root.querySelector('#ccwa-body');if(!b)return;
 b.innerHTML='<div class="ccwa-order-context"><b>'+esc(x.order_reference)+'</b><span>'+esc(x.order_customer||'Customer')+'</span><small>Collection: '+esc(x.required_date||'Not set')+' · '+esc(x.required_time||'')+'</small></div><div class="ccwa-channels"><b>WhatsApp</b><span>Viber · not connected</span></div><p class="ccs-hint">Conversation: '+esc(x.peer_number||'No phone number')+'</p>'+
 (!x.enabled?'<p class="ccs-note">WhatsApp is not connected. Messaging remains disabled.</p>':'')+
 '<h4>Messages linked to this order</h4>'+list(x.linked,true)+
 (x.unlinked.length?'<h4>Other messages from this number — check before linking</h4>'+
 x.unlinked.map(m=>'<div class="ccwa-review"><p>'+esc(m.body||'Media message')+'</p><small>'+date(m.created_at)+'</small> <button type="button" class="ccs-btn ccs-ghost" data-wa="link" data-message="'+esc(m.id)+'">Link to this order</button></div>').join(''):'')+
 (x.enabled?composer(x.peer_number,true):'');
 }catch(e){err(e);}
}
function statusView(){
 const st=state.status;
 if(!st)return '<p class="ccs-note">The WhatsApp connection has not been deployed or configured yet. Your live Cake CRM is unchanged.</p>';
 return '<p class="ccs-note"><b>'+ (st.enabled?'Connected — messages enabled':st.connected?'Number verified — messages disabled':'Not connected')+
 '</b></p><p>Business number: <b>'+esc(st.display_number||'Not set')+'</b></p>';
}
function settingsPanel(){
 const st=state.status,canManage=!!st&&st.can_manage;
 let h='<details class="ccwa-settings"><summary>WhatsApp Business <span>One active number</span></summary><div class="ccs-set-body">'+statusView();
 if(canManage){
 h+='<p class="ccs-hint">Changing the number requires verification through Meta. Your current number is not replaced if verification fails. Only one number can be active.</p>'+
 '<div class="ccwa-settings-fields"><label class="ccs-label" for="ccwa-number">Business WhatsApp number</label><input class="ccs-input" id="ccwa-number" type="tel" placeholder="+679..." value="'+esc(st.display_number||'')+'" autocomplete="off">'+
 '<details><summary>Meta connection details</summary><div class="ccwa-settings-fields">'+
 '<label class="ccs-label" for="ccwa-pid">Meta Phone Number ID</label><input class="ccs-input" id="ccwa-pid" inputmode="numeric" autocomplete="off" placeholder="From Meta Business Manager">'+
 '<label class="ccs-label" for="ccwa-waba">WhatsApp Business Account ID</label><input class="ccs-input" id="ccwa-waba" inputmode="numeric" autocomplete="off" placeholder="From Meta Business Manager"></div></details>'+
 '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-ghost" data-wa="configure">Verify and save number</button>'+
 (st.enabled?'<button type="button" class="ccs-btn ccs-ghost" data-wa="disable">Disable sending</button>':'')+
 '</div><p class="ccs-hint">Meta API secrets are entered securely in Supabase, never in this screen. Go-live is intentionally not available in this preview.</p></div>';
 } else if(st && !st.can_manage) h+='<p class="ccs-hint">Only a manager or administrator can configure the business number.</p>';
 h+='<button type="button" class="ccs-link" data-wa="checkstatus">Refresh connection status</button></div></details>';
 return h;
}
async function loadStatus(){
 if(state.statusPending)return;
 state.statusPending=true;
 try{state.status=await call('status');}catch(e){state.status=null;}
 finally{state.statusPending=false;state.statusChecked=true;enhance();}
}
function enhance(){
 if(!mine()||!role())return;
 const nav=root.querySelector('.ccs-nav');
 if(nav&&!nav.querySelector('[data-wa="inbox"]')&&(state.status===null || state.status.can_message)){
   const button=document.createElement('button');button.type='button';button.className='ccs-nav-item';button.dataset.wa='inbox';
   button.innerHTML='<span aria-hidden="true">✉</span><span>WhatsApp inbox</span>';nav.appendChild(button);
 }
 const sheet=root.querySelector('#ccs-sheet.ccs-open');
 if(sheet&&sheet.querySelector('.os-tref')&&!sheet.querySelector('[data-wa="order"]')&&(state.status===null || state.status.can_message)){
   const id=orderId();
   if(id||orderRef()){
     const button=document.createElement('button');button.type='button';button.className='ccs-btn ccs-ghost ccwa-order-button';button.dataset.wa='order';button.dataset.order=id;button.dataset.reference=orderRef();button.textContent='Customer messages';
     const target=sheet.querySelector('.ccs-sheet-body');if(target)target.prepend(button);
   }
 }
 const settings=root.querySelector('#ccs-main[data-screen="settings"] .ccs-set');
 if(settings&&!settings.querySelector('.ccwa-settings'))settings.insertAdjacentHTML('beforeend',settingsPanel());
 if(!state.statusChecked && !state.statusPending)loadStatus();
}
let queued=false;const watch=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});});
watch.observe(root,{childList:true,subtree:true});
// Capture the real order ID before the CRM's own click handler opens the order sheet.
document.addEventListener('click',event=>{
 const btn=event.target.closest('[data-act="open-order"][data-id]');
 if(btn && root.contains(btn))state.lastOpened=String(btn.dataset.id||'');
 else if(event.target.closest('[data-act="close-sheet"],[data-act="open-customer"],[data-tab="new"],[data-tab="customers"]'))state.lastOpened='';
},true);
root.addEventListener('click',e=>{
 const btn=e.target.closest('[data-wa]');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();
 if(btn.dataset.wa==='close'){root.querySelector('#ccwa-panel').hidden=true;return;}
 if(btn.dataset.wa==='checkstatus'){loadStatus();return;}
 if(btn.dataset.wa==='configure'){
   if(!state.status?.can_manage)return;
   const number=root.querySelector('#ccwa-number')?.value.trim();
   const phone_number_id=root.querySelector('#ccwa-pid')?.value.trim();
   const waba_id=root.querySelector('#ccwa-waba')?.value.trim();
   if(!/^[+][1-9][0-9]{7,14}$/.test(number||'')){
     alert('Enter the business number with country code, for example +679...');
     return;
   }
   if(!/^[0-9]{5,25}$/.test(phone_number_id||'')||!/^[0-9]{5,25}$/.test(waba_id||'')){
     alert('Open Meta connection details and enter the Phone Number ID and WhatsApp Business Account ID.');
     return;
   }
   btn.disabled=true;
   call('configure',{display_number:number,phone_number_id,waba_id})
     .then(()=>loadStatus()).catch(e=>alert(e.message||'The number could not be verified. No changes were saved.'))
     .finally(()=>{btn.disabled=false;});
   return;
 }
 if(btn.dataset.wa==='disable'){
   if(!state.status?.can_manage||!confirm('Disable WhatsApp sending and incoming-message processing for this number?'))return;
   btn.disabled=true;
   call('disable').then(()=>loadStatus()).catch(e=>alert(e.message||'Could not disable WhatsApp.'))
     .finally(()=>{btn.disabled=false;});return;
 }
 if(btn.dataset.wa==='inbox')return showInbox();
 if(btn.dataset.wa==='thread')return showThread(btn.dataset.phone);
 if(btn.dataset.wa==='order')return showOrder(btn.dataset.order,btn.dataset.reference);
 if(btn.dataset.wa==='refresh')return state.mode==='order'?showOrder(state.orderId,state.orderReference):state.mode==='thread'?showThread(state.peer):showInbox();
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