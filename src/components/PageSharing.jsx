import { useState } from 'react';
import { invitePageMember, pageMembers, revokePageMember } from '../lib/page-access';
import useLoad from '../lib/useLoad';
import { useToast } from '../context/toast-state';
export default function PageSharing({ source }) {
 const [email,setEmail]=useState('');
 const [busy,setBusy]=useState(false);
 const toast=useToast();
 const {data,loading,error,reload}=useLoad(()=>pageMembers(source),[source],{notifyErrors:false});
 async function invite(event) {
  event.preventDefault();
  if(busy) return;
  setBusy(true);
  try {
   const result=await invitePageMember(source,email);
   toast(result.email_sent ? 'Invitation sent. This person can manage this page’s leads.' : 'Access granted, but the email could not be sent. Check Supabase email delivery and retry.',result.email_sent?'success':'error');
   setEmail(''); await reload();
  } catch(issue) {toast(issue.message);} finally {setBusy(false);}
 }
 async function revoke(address) {
  if(busy) return;
  setBusy(true);
  try {await revokePageMember(source,address); await reload(); toast('Page access removed.','success');}
  catch(issue) {toast(issue.message);} finally {setBusy(false);}
 }
 return <div className="mt-4 border-t border-slate-100 pt-4">
  <h4 className="text-sm font-semibold">Share this landing page</h4>
  <p className="mt-1 text-xs leading-5 text-slate-500">Invited people can view, edit and delete leads, manage follow-ups and export reports for this page only.</p>
  <form className="mt-3 flex flex-col gap-2" onSubmit={invite}>
   <label className="text-xs text-slate-600">Recipient email
    <input className="input mt-1" required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="person@company.com" disabled={busy}/>
   </label>
   <button className="btn-primary" disabled={busy}>{busy?'Working…':'Send invitation'}</button>
  </form>
  {error && <p role="alert" className="mt-2 text-xs text-rose-600">Sharing setup is unavailable. {error}</p>}
  {!loading && data?.length>0 && <ul className="mt-3 space-y-2">{data.map(member=><li className="flex items-center justify-between gap-2 text-xs" key={member.email}><span className="break-all">{member.email}</span><button type="button" className="shrink-0 text-rose-600" disabled={busy} onClick={()=>revoke(member.email)}>Remove access</button></li>)}</ul>}
 </div>;
}
