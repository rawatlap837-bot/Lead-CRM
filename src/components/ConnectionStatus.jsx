import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function ConnectionStatus() {
  const [offline, setOffline] = useState(() => navigator.onLine === false);
  useEffect(() => {
    const update = () => setOffline(navigator.onLine === false);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div
      role="status"
      className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <WifiOff size={18} />
      You're offline. Reconnect to load or save changes.
    </div>
  );
}
