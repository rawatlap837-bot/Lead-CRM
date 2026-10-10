import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { AuthContext } from "./auth-state";
export function AuthProvider({ children }) {
  // Login state and page permissions load separately so a signed-in user never
  // sees a previous account's access while the next permission request is pending.
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [access, setAccess] = useState(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState("");
  const currentUser = useRef(session?.user?.id);
  currentUser.current = session?.user?.id;
  const refreshAccess = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId || !supabase) return;
    const { data, error } = await supabase.rpc("crm_access_context");
    if (error) throw new Error(error.message);
    if (currentUser.current === userId) setAccess(data);
  }, [session?.user?.id]);
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    let changed = false;
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
    // Auth events can arrive before getSession resolves. Keep the newer event.
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
    let active = true;
    setAccess(null);
    setAccessError("");
    if (!session?.user?.id || !supabase) {
      setAccessLoading(false);
      return;
    }
    setAccessLoading(true);
    supabase
      .rpc("crm_access_context")
      .then(({ data, error: issue }) => {
        if (!active) return;
        if (issue)
          setAccessError(
            "Workspace access settings are not installed or could not load. Contact the administrator.",
          );
        else setAccess(data);
      })
      .catch(() => {
        if (active)
          setAccessError(
            "Could not verify workspace access. Please try signing in again.",
          );
      })
      .finally(() => {
        if (active) setAccessLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id]);
  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        error,
        access,
        accessLoading:
          accessLoading || Boolean(session && access === null && !accessError),
        accessError,
        refreshAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
