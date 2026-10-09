import { createContext, useContext } from "react";
import { personalSource } from "../lib/personalWorkspace";
// Keep the same context identity when Vite replaces a module during development.
export const AuthContext = import.meta.hot?.data.authContext ?? createContext(null);
if (import.meta.hot) import.meta.hot.data.authContext = AuthContext;
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value)
    throw new Error("Authentication could not initialize. Reload the page to reconnect.");
  if (!value.access || !value.session?.user?.id) return value;
  const ownSource = personalSource(value.session.user.id);
  return {
    ...value,
    access: {
      ...value.access,
      personal_source: ownSource,
      sources: [...new Set([ownSource, ...(value.access.sources || [])])],
    },
  };
}
