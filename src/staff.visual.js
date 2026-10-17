  // Shared visual language. Labels remain visible; icons are decorative.
  function visualIcon(name) {
    var paths = {
      heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
      money:'<path d="M12 2v20M17 6.5c-1.3-2-8-2-8 1.5s8 2 8 6-6.7 4.5-9 1.5"/>',
      calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 11h18M8 15h2M14 15h2"/>',
      cake:'<path d="M4 13h16v8H4zM3 13c0-3 3-3 4-1 1-2 3-2 5 0 2-2 4-2 5 0 1-2 4-2 4 1M7 9V6M12 9V4M17 9V6"/>',
      check:'<path d="m5 12 4 4L19 6"/>',
      clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>'
    };
    return '<svg class="vr-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(paths[name]||paths.cake)+'</svg>';
  }
  var VF = { map: {}, loaded: false, loading: false, busy: {}, err: null, user: null };
  function favouriteBadge(id) { return id && VF.loaded && VF.map[id] ? '<span class="vr-fav-badge" title="Favourite customer">'+visualIcon('heart')+'<span class="vr-sr">Favourite customer</span></span>' : ''; }
  function favouriteLoad(force) {
    if (!canP('cust.view') || !S.me) return;
    var user=S.me.user_id;
    if(VF.user!==user){VF.map={};VF.loaded=false;VF.loading=false;VF.user=user;}
    if(VF.loading || VF.loaded && !force)return;
    VF.loading=true;VF.err=null;
    return sb.from('customer_favourites').select('customer_id').eq('is_favourite',true).then(function(r){
      if(!S.me || S.me.user_id!==user)return;
      VF.loading=false;if(r.error)throw r.error;
      VF.map={};(r.data||[]).forEach(function(x){VF.map[x.customer_id]=true;});VF.loaded=true;
      view();if(S.sheet&&S.sheet.type==='customer')renderSheet();
    }).catch(function(){VF.loading=false;VF.err='Could not load favourites.';if(S.sheet&&S.sheet.type==='customer')renderSheet();});
  }
  function favouriteControl(c) {
    if(!canP('cust.view')||c.archived_at||c.merged_into||c.full_name==='No contact (walk-in orders)')return '';
    if(VF.err)return '<p class="ccs-hint">Favourites unavailable. <button type="button" class="ccs-link" data-act="vf-retry">Try again</button></p>';
    if(!VF.loaded)return '<p class="ccs-hint">Loading favourites…</p>';
    if(!canP('cust.edit'))return VF.map[c.id]?'<p class="vr-fav-label">'+favouriteBadge(c.id)+' Favourite customer</p>':'';
    return '<button type="button" class="ccs-btn ccs-ghost vr-fav-toggle" data-act="vf-toggle" data-id="'+esc(c.id)+'" aria-pressed="'+!!VF.map[c.id]+'"'+(VF.busy[c.id]?' disabled aria-busy="true"':'')+'>'+visualIcon('heart')+(VF.busy[c.id]?'Saving…':VF.map[c.id]?'Favourite customer':'Mark as favourite')+'</button>';
  }
  function favouriteToggle(id) {
    if(!canP('cust.edit')||!VF.loaded||VF.busy[id]||!S.sheet||S.sheet.type!=='customer'||S.sheet.id!==id||!S.sheet.data)return;
    var c=S.sheet.data.c;if(c.archived_at||c.merged_into||c.full_name==='No contact (walk-in orders)')return;
    var desired=!VF.map[id],user=S.me.user_id;VF.busy[id]=true;renderSheet();
    sb.from('customer_favourites').upsert({customer_id:id,is_favourite:desired},{onConflict:'customer_id'}).select('customer_id,is_favourite').single().then(function(r){
      delete VF.busy[id];if(!S.me||S.me.user_id!==user)return;
      if(r.error||!r.data||r.data.customer_id!==id||r.data.is_favourite!==desired)throw Error('Favourite not verified');
      VF.map[id]=desired;view();if(S.sheet&&S.sheet.type==='customer')renderSheet();toast(desired?'Customer marked as favourite.':'Customer removed from favourites.');
    }).catch(function(){delete VF.busy[id];if(S.me&&S.me.user_id===user){if(S.sheet&&S.sheet.type==='customer')renderSheet();toast('Favourite was not saved. Check the connection and try again.',true);}});
  }
