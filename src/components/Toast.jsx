import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { ToastContext } from "../context/toast-state";
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const toast = useCallback((message, type = "error") => {
    const id = crypto.randomUUID();
    setItems((list) => [...list, { id, message, type }]);
    timers.current.push(
      setTimeout(
        () => setItems((list) => list.filter((item) => item.id !== id)),
        type === "error" ? 10000 : 4500,
      ),
    );
  }, []);
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="fixed bottom-4 left-4 right-4 z-[80] flex flex-col gap-3 sm:left-auto sm:w-96"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role={item.type === "error" ? "alert" : "status"}
            className="flex items-start gap-3 rounded-xl border bg-white p-4 shadow-lg"
          >
            {item.type === "error" ? (
              <AlertCircle className="shrink-0 text-rose-500" size={20} />
            ) : (
              <CheckCircle2 className="shrink-0 text-emerald-500" size={20} />
            )}
            <p className="min-w-0 flex-1 break-words text-sm">{item.message}</p>
            <button
              aria-label="Dismiss notification"
              onClick={() => setItems((list) => list.filter((t) => t.id !== item.id))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
