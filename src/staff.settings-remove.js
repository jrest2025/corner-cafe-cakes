/* Uses the existing signed-in client, Settings state, feedback and refresh functions. */
var SR_ENTRY_LIST = [];
["input","change"].forEach(function(type){document.getElementById("cc-staff").addEventListener(type,function(e){if(e.target.id==="sr-entry")e.stopPropagation()},true)});
function srSettingsView(st) {
  if (!la('admin')) return '';
  SR_ENTRY_LIST=[];
  function add(kind,id,name,label){if(id)SR_ENTRY_LIST.push({kind:kind,id:id,expected:String(name),label:label})}
  (st.products||[]).forEach(function(p){add('cake',p.id,p.name,'Cake · '+p.name);(p.product_sizes||[]).forEach(function(s){add('size',s.id,s.size_inch,p.name+' · '+s.size_inch+' inch')});(p.product_variants||[]).forEach(function(v){add('flavour',v.id,v.name,p.name+' · '+v.name)})});
  (st.zones||[]).forEach(function(z){add('area',z.id,z.name,'Delivery area · '+z.name)});
  (st.closed||[]).forEach(function(c){add('closed',c.id,c.closed_on,'Closed day · '+c.closed_on+(c.reason?' · '+c.reason:''))});
  if(st.occ){(st.occ.occasions||[]).forEach(function(o){if(!o.system&&!o.merged_into)add('occasion',o.id,o.label,'Occasion · '+o.label)});(st.occ.dates||[]).forEach(function(d){var o=(st.occ.occasions||[]).filter(function(x){return x.code===d.code})[0];add('date',d.id,d.starts_on,'Occasion date · '+(o?o.label:d.code)+' · '+d.starts_on)})}
  var groups=[['cake','Cakes'],['size','Sizes'],['flavour','Flavours'],['area','Delivery areas'],['closed','Closed days'],['occasion','Occasions'],['date','Occasion dates']];
  return '<details class="sr-settings"><summary>Remove Settings entries <span>Administrators</span></summary><div class="ccs-set-body"><p class="ccs-hint">Add and edit entries in the other Settings sections. Choose an entry here to remove it. Entries used by orders are protected; take them off sale or archive them instead.</p><div class="sr-controls"><div class="ccs-field"><label class="ccs-label" for="sr-entry">Entry to remove</label><select id="sr-entry" class="ccs-input"><option value="">Choose an entry</option>'+groups.map(function(g){var options='';SR_ENTRY_LIST.forEach(function(x,i){if(x.kind===g[0])options+='<option value="'+i+'">'+Tt(x.label)+'</option>'});return options?'<optgroup label="'+g[1]+'">'+options+'</optgroup>':''}).join('')+'</select></div><button type="button" class="ccs-btn ccs-danger" data-act="sr-remove"><svg class="sr-bin" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7M14 10v7"/></svg>Remove entry</button></div><div id="sr-message" role="status" aria-live="polite"></div><p class="ccs-hint">You will confirm the entry before it is removed. Staff access is managed in Team and access.</p></div></details>';
}
function srSettingsRemove(button) {
  if (!la('admin')) return ma('Only an administrator can remove Settings entries.',true);
  var select=document.getElementById('sr-entry'), value=select&&select.value;
  var entry=value!==''&&value!=null?SR_ENTRY_LIST[Number(value)]:null;
  var message=document.getElementById('sr-message');
  function show(text,bad){if(message){message.textContent=text;message.className=bad?'ccs-err':'ccs-note'}}
  if(!entry)return show('Choose the entry you want to remove.',true);
  if(!window.confirm('Remove '+entry.label+'?\n\nThis removes the entry from Settings and new order choices. Entries already used by orders are protected. This cannot be undone from the app.'))return;
  _a(button,'Removing…');select.disabled=true;
  a.rpc('admin_remove_setting',{p_kind:entry.kind,p_id:entry.id,p_expected:entry.expected}).then(function(r){xa();select.disabled=false;if(r.error)throw r.error;if(!r.data||!r.data.ok)return show(r.data&&r.data.message||'The entry was not removed. Please refresh Settings and try again.',true);ma('Entry removed');ou();Ed()}).catch(function(e){xa();select.disabled=false;show('The entry could not be removed. Refresh Settings before trying again.',true);console.error(e)});
}
