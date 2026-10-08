import { supabase } from './supabase';
export async function invitePageMember(source, email) {
 const { data, error } = await supabase.functions.invoke('page-invite', { body: { source, email: email.trim().toLowerCase() } });
 if (error) {
  let message = error.message;
  try { message = (await error.context.json()).error || message; } catch {}
  throw new Error(message);
 }
 if (!data?.success) throw new Error(data?.error || 'Invitation failed.');
 return data;
}
export async function pageMembers(source) {
 const { data, error } = await supabase.from('crm_page_members').select('email,created_at').eq('source',source).order('created_at');
 if (error) throw error;
 return data;
}
export async function revokePageMember(source,email) {
 const { error } = await supabase.from('crm_page_members').delete().eq('source',source).eq('email',email);
 if (error) throw error;
}
