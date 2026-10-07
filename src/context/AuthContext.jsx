import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { AuthContext } from "./auth-state";
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
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
  return (
    <AuthContext.Provider value={{ session, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}
