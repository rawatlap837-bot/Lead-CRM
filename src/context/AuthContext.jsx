import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { AuthContext } from "./auth-state";
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [access,setAccess]=useState(null);
  const [accessLoading,setAccessLoading]=useState(false);
  const [accessError,setAccessError]=useState("");
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true,
      changed = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      changed = true;
      if (active) {
        setSession(next);
        setError("");
        setLoading(false);
      }
    });
    supabase.auth
      .getSession()
      .then(({ data, error: issue }) => {
        if (active) {
          if (!changed) setSession(data?.session ?? null);
          setError(issue?.message || "");
          setLoading(false);
        }
      })
      .catch((issue) => {
        if (active) {
          setError(issue.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let active=true;
    setAccess(null); setAccessError("");
    if(!session?.user?.id || !supabase) {setAccessLoading(false); return;}
    setAccessLoading(true);
    supabase.rpc('crm_access_context').then(({data,error:issue})=>{
      if(!active) return;
      if(issue) setAccessError('Workspace access settings are not installed or could not load. Contact the administrator.');
      else setAccess(data);
    }).catch(()=>{if(active) setAccessError('Could not verify workspace access. Please try signing in again.');})
      .finally(()=>{if(active) setAccessLoading(false);});
    return ()=>{active=false;};
  },[session?.user?.id]);
  return (
    <AuthContext.Provider value={{ session, loading, error, access, accessLoading: accessLoading || Boolean(session && access === null && !accessError), accessError }}>
      {children}
    </AuthContext.Provider>
  );
}
