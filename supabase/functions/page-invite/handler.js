const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json'}});
export function createInviteHandler({env,fetch}) {
 return async request=>{
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers});
  if(request.method!=='POST') return reply({error:'Use POST.'},405);
  const base=(env('SUPABASE_URL')||'').replace(/\/$/,'');
  const key=env('CRM_DATABASE_KEY')||env('SUPABASE_SERVICE_ROLE_KEY');
  const app=env('CRM_APP_URL');
  if(!base||!key||!app) return reply({error:'Configure CRM_APP_URL and the database key on the invitation function.'},503);
  let appUrl;
  try { appUrl=new URL(app); if(appUrl.protocol!=='https:' || appUrl.username || appUrl.password) throw new Error(); }
  catch {return reply({error:'CRM_APP_URL must be the public HTTPS address of your deployed CRM.'},503);}
  const authorization=request.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer ')) return reply({error:'Sign in first.'},401);
  const call=(path,options={})=>fetch(base+path,{...options,signal:AbortSignal.timeout(12000)});
  const serviceHeaders={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
  try {
   const userResponse=await call('/auth/v1/user',{headers:{apikey:key,Authorization:authorization}});
   if(!userResponse.ok) return reply({error:'Session expired. Sign in again.'},401);
   const user=await userResponse.json();
   if(!user.id) return reply({error:'Invalid session.'},401);
   const admin=await call('/rest/v1/crm_admins?'+new URLSearchParams({user_id:'eq.'+user.id,select:'user_id'}),{headers:serviceHeaders});
   if(!admin.ok) return reply({error:'Install the page access database setup first.'},503);
   if(!(await admin.json()).length) return reply({error:'Only administrators can share landing pages.'},403);
   const text=await request.text();
   if(text.length>4096) return reply({error:'Request is too large.'},413);
   let input;
   try {input=JSON.parse(text);} catch {return reply({error:'Send valid JSON.'},400);}
   const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
   const source=typeof input.source==='string'?input.source.trim():'';
   if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!source||source.length>200) return reply({error:'Enter a valid email and landing page.'},400);
   const exists=await call('/rest/v1/leads?'+new URLSearchParams({source:'eq.'+source,select:'id',limit:'1'}),{headers:serviceHeaders});
   if(!exists.ok || !(await exists.json()).length) return reply({error:'This landing page has no leads yet or does not exist.'},400);
   const grant=await call('/rest/v1/crm_page_members?on_conflict=source,email',{method:'POST',headers:{...serviceHeaders,Prefer:'resolution=merge-duplicates'},body:JSON.stringify({source,email,invited_by:user.id})});
   if(!grant.ok) return reply({error:'Could not grant access.'},502);
   const redirect=new URL('leads',appUrl.href.endsWith('/')?appUrl.href:appUrl.href+'/');
   redirect.searchParams.set('source',source);
   const redirectQuery='?'+new URLSearchParams({redirect_to:redirect.href});
   let mail=await call('/auth/v1/invite'+redirectQuery,{method:'POST',headers:serviceHeaders,body:JSON.stringify({email})});
   if(!mail.ok) {
    const error=await mail.json().catch(()=>({}));
    if(['email_exists','user_already_exists'].includes(error.code||error.error_code)||/already.*(registered|exists)/i.test(error.msg||error.message||'')) {
     mail=await call('/auth/v1/otp'+redirectQuery,{method:'POST',headers:serviceHeaders,body:JSON.stringify({email,create_user:false})});
    }
   }
   return reply({success:true,email_sent:mail.ok});
  } catch {return reply({error:'Invitation service is temporarily unavailable. Please retry.'},502);}
 };
}
