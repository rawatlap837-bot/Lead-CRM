import { createContext, useContext } from "react";
export const ToastContext = import.meta.hot?.data.toastContext ?? createContext(null);
if (import.meta.hot) import.meta.hot.data.toastContext = ToastContext;
export function useToast() {
  const value = useContext(ToastContext);
  if (!value)
    throw new Error("Notifications could not initialize. Reload the page to reconnect.");
  return value;
}
