// One-number Corner Cafe WhatsApp Cloud API adapter. Staged: no deployment or customer sends.
// Configure WA_ACCESS_TOKEN in Supabase Edge Function secrets (never browser code).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const env = (name: string) => Deno.env.get(name) || "";
const allowed = new Set(["https://cornercafefiji.com", "https://www.cornercafefiji.com"]);
function respond(req: Request, data: unknown, status = 200) {
  const origin = req.headers.get("origin") || "";
  return new Response(JSON.stringify(data), { status, headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowed.has(origin) ? origin : "https://www.cornercafefiji.com",
    "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info",
    "Access-Control-Allow-Methods": "POST,OPTIONS", "Vary": "Origin",
  } });
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return respond(req, {ok:true});
  if (req.method !== "POST") return respond(req,{ok:false,error:"method_not_allowed"},405);
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer /i,"");
  const service = env("SUPABASE_SERVICE_ROLE_KEY"), url = env("SUPABASE_URL");
  if (!service || !url) return respond(req,{ok:false,error:"server_unconfigured"},503);
  const db = createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:auth,error:authError} = await db.auth.getUser(jwt);
  if (authError || !auth.user) return respond(req,{ok:false,error:"sign_in_required"},401);
  const {data:staff} = await db.from("staff_profiles").select("role,active").eq("user_id",auth.user.id).maybeSingle();
  if (!staff?.active) return respond(req,{ok:false,error:"staff_access_required"},403);
  let body: Record<string,unknown>;
  try { body=await req.json(); } catch { return respond(req,{ok:false,error:"invalid_json"},400); }
  const op=String(body.op||"status");
  const admin=staff.role==="admin" || staff.role==="manager";
  if (["configure","enable","disable"].includes(op) && !admin) return respond(req,{ok:false,error:"manager_required"},403);
  const {data:conn,error:readErr}=await db.from("wa_connection").select("*").eq("id",1).maybeSingle();
  if (readErr) return respond(req,{ok:false,error:"schema_not_installed"},503);
  if (op==="status") return respond(req,{ok:true,connected:!!conn?.verified_at,enabled:!!conn?.enabled,display_number:conn?.display_number||null,can_manage:admin,can_message:["admin","manager","front_of_house"].includes(staff.role)});
  if (op==="disable") {
    const {error}=await db.from("wa_connection").update({enabled:false,updated_by:auth.user.id,updated_at:new Date().toISOString()}).eq("id",1);
    return respond(req,error?{ok:false,error:"save_failed"}:{ok:true,enabled:false},error?500:200);
  }
  if (op==="configure") {
    const display=String(body.display_number||"").trim();
    const id=String(body.phone_number_id||"").trim();
    const waba=String(body.waba_id||"").trim();
    if (!/^\+[1-9][0-9]{7,14}$/.test(display)||!/^[0-9]{5,25}$/.test(id)||!/^[0-9]{5,25}$/.test(waba))
      return respond(req,{ok:false,error:"invalid_number_or_meta_ids"},400);
    const token=env("WA_ACCESS_TOKEN");
    if (!token) return respond(req,{ok:false,error:"meta_token_not_configured"},503);
    const check=await fetch("https://graph.facebook.com/v23.0/"+encodeURIComponent(id)+"?fields=id,display_phone_number,verified_name",{
      headers:{Authorization:"Bearer "+token}
    }).catch(()=>null);
    if (!check?.ok) return respond(req,{ok:false,error:"meta_verification_failed"},400);
    const info=await check.json();
    const norm=(v:unknown)=>String(v||"").replace(/\D/g,"");
    if (String(info.id)!==id || norm(info.display_phone_number)!==norm(display))
      return respond(req,{ok:false,error:"number_does_not_match_meta"},400);
    const {error}=await db.from("wa_connection").upsert({id:1,display_number:display,phone_number_id:id,waba_id:waba,
      verified_at:new Date().toISOString(),enabled:false,updated_by:auth.user.id,updated_at:new Date().toISOString()});
    return respond(req,error?{ok:false,error:"save_failed"}:{ok:true,verified:true,enabled:false},error?500:200);
  }
  if (op==="enable") {
    if (!conn?.verified_at || !conn?.phone_number_id || !env("WA_ACCESS_TOKEN") || !env("WA_APP_SECRET"))
      return respond(req,{ok:false,error:"verification_or_secrets_missing"},409);
    const {error}=await db.from("wa_connection").update({enabled:true,updated_by:auth.user.id,updated_at:new Date().toISOString()}).eq("id",1);
    return respond(req,error?{ok:false,error:"save_failed"}:{ok:true,enabled:true},error?500:200);
  }

  // All inbox and order views are server-authorized; private message rows stay off the browser Data API.
  const mayMessage=["admin","manager","front_of_house"].includes(staff.role);
  const e164=(input:unknown) => {
    let digits=String(input||"").replace(/[^0-9]/g,"");
    if(digits.length===7) digits="679"+digits;
    return /^[1-9][0-9]{7,14}$/.test(digits)?"+"+digits:"";
  };
  // Order references have a UNIQUE constraint in the existing Cakes database.
  // Resolving the reference on the server works for orders opened from calendar,
  // search, customer history and the orders list without relying on UI click history.
  async function validatedOrder(id:unknown, reference?:unknown) {
    const orderId=String(id||"").trim();
    const ref=String(reference||"").trim();
    if(orderId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId))return null;
    if(!orderId && (!ref || ref.length>60))return null;
    let query=db.from("orders").select("id,reference,contact_phone,contact_name");
    query=orderId?query.eq("id",orderId):query.eq("reference",ref);
    const {data,error}=await query.maybeSingle();
    return error?null:data;
  }
  if (["inbox","thread","order","link"].includes(op) && !mayMessage)
    return respond(req,{ok:false,error:"messaging_not_allowed"},403);
  if (op==="inbox") {
    if(!conn?.enabled)return respond(req,{ok:true,enabled:false,threads:[]});
    const {data,error}=await db.from("wa_messages")
      .select("peer_number,body,status,direction,created_at,order_id,message_type")
      .eq("number_id",conn.phone_number_id).order("created_at",{ascending:false}).limit(250);
    if(error)return respond(req,{ok:false,error:"inbox_unavailable"},503);
    const seen=new Set<string>();
    const threads=(data||[]).filter((m:any)=>{
      if(seen.has(m.peer_number))return false; seen.add(m.peer_number); return true;
    }).slice(0,80);
    return respond(req,{ok:true,enabled:true,threads});
  }
  if (op==="thread") {
    if(!conn?.enabled)return respond(req,{ok:true,enabled:false,messages:[]});
    const peer=e164(body.peer_number);
    if(!peer)return respond(req,{ok:false,error:"invalid_phone"},400);
    const {data,error}=await db.from("wa_messages").select("id,meta_message_id,peer_number,direction,message_type,body,status,created_at,order_id")
      .eq("number_id",conn.phone_number_id).eq("peer_number",peer).order("created_at",{ascending:true}).limit(150);
    if(error)return respond(req,{ok:false,error:"thread_unavailable"},503);
    return respond(req,{ok:true,enabled:true,peer_number:peer,messages:data||[]});
  }
  if (op==="order") {
    const order=await validatedOrder(body.order_id,body.order_reference);
    if(!order)return respond(req,{ok:false,error:"order_not_found"},404);
    const peer=e164(order.contact_phone);
    const {data:linked,error}=await db.from("wa_messages")
      .select("id,direction,body,message_type,status,created_at,peer_number,order_id")
      .eq("order_id",order.id).order("created_at",{ascending:true}).limit(150);
    if(error)return respond(req,{ok:false,error:"order_messages_unavailable"},503);
    let unlinked:any[]=[];
    if(conn?.enabled && peer){
      const {data:pending,error:pendingErr}=await db.from("wa_messages")
        .select("id,direction,body,message_type,status,created_at,peer_number,order_id")
        .eq("number_id",conn.phone_number_id).eq("peer_number",peer).is("order_id",null)
        .order("created_at",{ascending:false}).limit(30);
      if(pendingErr)return respond(req,{ok:false,error:"unlinked_messages_unavailable"},503);
      unlinked=pending||[];
    }
    return respond(req,{ok:true,enabled:!!conn?.enabled,display_number:conn?.display_number||null,
      order_id:order.id,order_reference:order.reference,peer_number:peer,linked:linked||[],unlinked});
  }
  if (op==="link") {
    const order=await validatedOrder(body.order_id);
    const mid=String(body.message_id||"");
    if(!order||!/^[0-9a-f-]{36}$/i.test(mid))return respond(req,{ok:false,error:"invalid_order_or_message"},400);
    const peer=e164(order.contact_phone);
    if(!peer)return respond(req,{ok:false,error:"order_phone_missing"},409);
    const {data:msg}=await db.from("wa_messages").select("id,order_id,peer_number,number_id")
      .eq("id",mid).maybeSingle();
    if(!msg||msg.order_id||msg.peer_number!==peer||msg.number_id!==conn?.phone_number_id)
      return respond(req,{ok:false,error:"message_already_linked_or_phone_mismatch"},409);
    const {data:linked,error}=await db.from("wa_messages")
      .update({order_id:order.id,linked_by:auth.user.id,linked_at:new Date().toISOString()})
      .eq("id",msg.id).is("order_id",null).select("id").maybeSingle();
    if(error||!linked)return respond(req,{ok:false,error:"link_failed"},409);
    return respond(req,{ok:true,linked:true});
  }
  if (op==="reply") {
    if (!conn?.enabled || !conn?.phone_number_id) return respond(req,{ok:false,error:"whatsapp_disabled"},409);
    if (!mayMessage) return respond(req,{ok:false,error:"messaging_not_allowed"},403);
    const to=e164(body.to), message=String(body.message||"").trim(), requestId=String(body.request_id||"").trim();
    let replyOrder:any=null;
    if(body.order_id){
      replyOrder=await validatedOrder(body.order_id);
      if(!replyOrder||e164(replyOrder.contact_phone)!==to)
        return respond(req,{ok:false,error:"order_phone_mismatch"},409);
    }
    if (!/^\+[1-9][0-9]{7,14}$/.test(to) || !message || message.length>4096 ||
       !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))
      return respond(req,{ok:false,error:"invalid_reply"},400);
    const recent = await db.from("wa_messages").select("id").eq("peer_number",to).eq("direction","inbound")
      .eq("number_id",conn.phone_number_id).gte("created_at",new Date(Date.now()-24*3600*1000).toISOString())
      .order("created_at",{ascending:false}).limit(1);
    if (recent.error || !recent.data?.length) return respond(req,{ok:false,error:"customer_service_window_closed"},409);
    const {data:existing}=await db.from("wa_messages").select("id,status").eq("client_request_id",requestId).maybeSingle();
    if (existing) return respond(req,{ok:true,duplicate:true,status:existing.status});
    const {error:writeError}=await db.from("wa_messages").insert({number_id:conn.phone_number_id,peer_number:to,
      direction:"outbound",message_type:"text",body:message,status:"sending",client_request_id:requestId,staff_id:auth.user.id,
      order_id:replyOrder?.id||null,linked_by:replyOrder?auth.user.id:null,linked_at:replyOrder?new Date().toISOString():null});
    if (writeError) return respond(req,{ok:false,error:"log_failed"},500);
    const sent=await fetch("https://graph.facebook.com/v23.0/"+encodeURIComponent(conn.phone_number_id)+"/messages",{
      method:"POST",headers:{"Authorization":"Bearer "+env("WA_ACCESS_TOKEN"),"Content-Type":"application/json"},
      body:JSON.stringify({messaging_product:"whatsapp",to:to.replace("+",""),type:"text",text:{body:message}})
    }).catch(()=>null);
    const payload=sent?await sent.json().catch(()=>({})):{};
    const ok=!!sent?.ok && !!payload.messages?.[0]?.id;
    await db.from("wa_messages").update({status:ok?"sent":"failed",
      meta_message_id:ok?payload.messages[0].id:null,error_note:ok?null:"Meta send failed",
      updated_at:new Date().toISOString()}).eq("client_request_id",requestId);
    return respond(req,{ok,status:ok?"sent":"failed"},ok?200:502);
  }
  return respond(req,{ok:false,error:"unknown_operation"},400);
});