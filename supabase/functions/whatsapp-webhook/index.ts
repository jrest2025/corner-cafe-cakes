// Meta WhatsApp webhook. Staged only. Verify Meta signature on every POST before DB access.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const env=(k:string)=>Deno.env.get(k)||"";
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json"}});
const bytes=new TextEncoder();
async function valid(body:string,signature:string,secret:string) {
  if(!/^sha256=[0-9a-f]{64}$/i.test(signature)||!secret) return false;
  const key=await crypto.subtle.importKey("raw",bytes.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const sig=new Uint8Array(await crypto.subtle.sign("HMAC",key,bytes.encode(body)));
  const hex=Array.from(sig,x=>x.toString(16).padStart(2,"0")).join("");
  const expected=signature.slice(7).toLowerCase();
  let diff=0; for(let i=0;i<hex.length;i++)diff|=hex.charCodeAt(i)^expected.charCodeAt(i);
  return diff===0;
}
Deno.serve(async(req:Request)=>{
  if(req.method==="GET"){
    const u=new URL(req.url);
    const same=u.searchParams.get("hub.verify_token")===env("WA_VERIFY_TOKEN");
    if(u.searchParams.get("hub.mode")!=="subscribe"||!env("WA_VERIFY_TOKEN")||!same) return new Response("Forbidden",{status:403});
    return new Response(u.searchParams.get("hub.challenge")||"",{headers:{"Content-Type":"text/plain"}});
  }
  if(req.method!=="POST")return json({ok:false},405);
  const raw=await req.text();
  if(raw.length>1024*1024)return json({ok:false},413);
  if(!await valid(raw,req.headers.get("x-hub-signature-256")||"",env("WA_APP_SECRET")))return json({ok:false},401);
  const url=env("SUPABASE_URL"),key=env("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key)return json({ok:false},503);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:conn,error}=await db.from("wa_connection").select("phone_number_id,enabled").eq("id",1).maybeSingle();
  if(error)return json({ok:false},503);
  if(!conn?.enabled)return json({ok:true,ignored:"disabled"});
  let event:any;
  try{event=JSON.parse(raw)}catch{return json({ok:false},400)}
  for(const entry of event.entry||[]) for(const change of entry.changes||[]){
    if(change.field!=="messages")continue;
    const v=change.value||{};
    if(String(v.metadata?.phone_number_id||"")!==conn.phone_number_id)continue;
    for(const m of v.messages||[]){
      const sender=String(m.from||"");
      if(!/^[1-9][0-9]{7,14}$/.test(sender)||!m.id)continue;
      const record={meta_message_id:String(m.id),number_id:conn.phone_number_id,peer_number:"+"+sender,
        direction:"inbound",message_type:String(m.type||"unknown"),
        body:m.type==="text"?String(m.text?.body||"").slice(0,4096):null,status:"received"};
      const {error:e}=await db.from("wa_messages").upsert(record,{onConflict:"meta_message_id",ignoreDuplicates:true});
      if(e)return json({ok:false},503); // Meta retries transient failures.
    }
    for(const st of v.statuses||[]){
      const id=String(st.id||"");
      const state=String(st.status||"");
      if(!id||!["sent","delivered","read","failed"].includes(state))continue;
      await db.from("wa_messages").update({status:state,updated_at:new Date().toISOString()})
        .eq("meta_message_id",id).eq("number_id",conn.phone_number_id);
    }
  }
  return json({ok:true});
});