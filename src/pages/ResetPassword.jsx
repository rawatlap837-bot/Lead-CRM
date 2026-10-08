import {useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {useAuth} from '../context/auth-state';
import {supabase} from '../lib/supabase';
import Spinner from '../components/Spinner';
export default function ResetPassword(){
 const {session,loading}=useAuth(); const navigate=useNavigate();
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(loading) return <Spinner full/>;
 async function submit(event){event.preventDefault();if(busy)return;
 if(password.length<8){setError('Use at least 8 characters.');return;}
 if(password!==confirm){setError('Passwords do not match.');return;}
 setBusy(true);setError('');
 try{const {error:issue}=await supabase.auth.updateUser({password});if(issue)throw issue;navigate('/',{replace:true});}
 catch(issue){setError(issue.message);}finally{setBusy(false);}
 }
 return <main className="min-h-dvh flex items-center justify-center p-5"><section className="card w-full max-w-sm p-6"><h1 className="text-2xl font-bold">Choose a new password</h1>
 {session?<form onSubmit={submit} className="mt-5 space-y-4"><label className="block">New password<input className="input mt-2" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></label><label className="block">Confirm password<input className="input mt-2" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>{error&&<p role="alert" className="text-rose-600">{error}</p>}<button className="btn-primary w-full" disabled={busy}>{busy?'Saving…':'Save new password'}</button></form>:<p className="mt-4">Open a fresh password reset link from your email to continue.</p>}
 <Link to="/login" className="mt-4 block text-indigo-600">Back to sign in</Link></section></main>;
}
