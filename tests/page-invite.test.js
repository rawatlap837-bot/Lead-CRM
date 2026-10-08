import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createInviteHandler} from '../supabase/functions/page-invite/handler.js';
const env=name=>({SUPABASE_URL:'https://test.supabase.co',CRM_DATABASE_KEY:'server-key',CRM_APP_URL:'https://crm.example'}[name]);
const req=()=>new Request('https://test/invite',{method:'POST',headers:{authorization:'Bearer session'},body:JSON.stringify({email:'Member@Example.com',source:'Page A'})});
function fixture(admin=true,mail=200){const calls=[];return {calls,handler:createInviteHandler({env,fetch:async(url,options)=>{calls.push({url,options});let body=url.includes('/user')?{id:'admin-id'}:url.includes('/crm_admins')?(admin?[{user_id:'admin-id'}]:[]):url.includes('/leads?')?[{id:'lead'}]:{};return new Response(JSON.stringify(body),{status:url.includes('/invite?')?mail:200});}})};}
test('anonymous and non-admin cannot grant access',async()=>{const a=fixture();assert.equal((await a.handler(new Request('https://test',{method:'POST'}))).status,401);assert.equal(a.calls.length,0);const b=fixture(false);assert.equal((await b.handler(req())).status,403);assert.equal(b.calls.length,2);});
test('admin grants only requested source',async()=>{const f=fixture();assert.deepEqual(await (await f.handler(req())).json(),{success:true,email_sent:true});const grant=f.calls.find(c=>c.url.includes('on_conflict'));assert.deepEqual(JSON.parse(grant.options.body),{source:'Page A',email:'member@example.com',invited_by:'admin-id'});});
test('email failure is distinct from grant',async()=>{const f=fixture(true,500);assert.deepEqual(await (await f.handler(req())).json(),{success:true,email_sent:false});});
