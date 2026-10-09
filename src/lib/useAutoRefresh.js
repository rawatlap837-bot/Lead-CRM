import { useEffect, useRef } from "react";

// Refresh authenticated database queries while the page is visible. Works without
// enabling a Realtime publication and never interrupts a dialog or a form save.
export default function useAutoRefresh(reload, interval = 15000) {
  const latest = useRef(reload);
  latest.current = reload;
  useEffect(() => {
    const refresh = () => {
      if (
        navigator.onLine === false ||
        document.visibilityState === "hidden" ||
        document.querySelector('[role="dialog"], form[aria-busy="true"]')
      )
        return;
      latest.current({ background: true });
    };
    const timer = setInterval(refresh, interval);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [interval]);
}
