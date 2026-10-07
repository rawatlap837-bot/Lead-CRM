import { createContext, useContext } from "react";
// Keep the same context identity when Vite replaces a module during development.
export const AuthContext =
  import.meta.hot?.data.authContext ?? createContext(null);
if (import.meta.hot) import.meta.hot.data.authContext = AuthContext;
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value)
    throw new Error(
      "Authentication could not initialize. Reload the page to reconnect.",
    );
  return value;
}
