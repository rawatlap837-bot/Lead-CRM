import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../context/toast-state";
export default function useLoad(loader, deps = [], { notifyErrors = true } = {}) {
  // A new filter or record ID gets a new identity. The generation counter below
  // prevents an older request from replacing the current screen's results.
  const identity = useMemo(() => ({}), deps);
  const [result, setResult] = useState({
    identity: null,
    data: null,
    error: "",
  });
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const generation = useRef(0);
  const reload = useCallback(
    async ({ background = false } = {}) => {
      const token = ++generation.current;
      if (!background) setLoading(true);
      setResult((previous) =>
        previous.identity === identity ? { ...previous, error: "" } : previous,
      );
      try {
        const data = await loader();
        if (token === generation.current) setResult({ identity, data, error: "" });
      } catch (issue) {
        if (token === generation.current) {
          setResult((previous) => ({
            identity,
            data: previous.identity === identity ? previous.data : null,
            error: issue.message,
          }));
          if (!background && notifyErrors) toast(issue.message);
        }
      } finally {
        if (token === generation.current) setLoading(false);
      }
    },
    [identity, notifyErrors],
  );
  useEffect(() => {
    reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  const current = result.identity === identity;
  return {
    data: current ? result.data : null,
    loading: loading || !current,
    error: current ? result.error : "",
    reload,
  };
}
