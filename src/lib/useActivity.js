import { useCallback, useEffect, useRef, useState } from "react";
import { fetchActivity, acknowledgeActivity, activitySections } from "./activity";

export default function useActivity(userId) {
  const [state, setState] = useState({
    userId: null,
    events: [],
    error: "",
    loading: false,
  });
  const [savingFor, setSavingFor] = useState(null);
  const refreshRef = useRef(() => {});
  const readVersion = useRef(0);
  const currentUser = useRef(userId);
  currentUser.current = userId;

  useEffect(() => {
    let active = true;
    let pending = false;
    setState({ userId, events: [], error: "", loading: Boolean(userId) });
    async function refresh() {
      if (!userId || pending || navigator.onLine === false) return;
      pending = true;
      const version = readVersion.current;
      try {
        const events = await fetchActivity(userId);
        if (active && version === readVersion.current)
          setState({ userId, events, error: "", loading: false });
      } catch (error) {
        // Clear stale events on error rather than leaving old permissions visible.
        if (active)
          setState({ userId, events: [], error: error.message, loading: false });
      } finally {
        pending = false;
      }
    }
    const refreshVisible = () => {
      if (document.visibilityState !== "hidden") refresh();
    };
    refreshRef.current = refresh;
    refresh();
    const timer = setInterval(refreshVisible, 15000);
    window.addEventListener("focus", refreshVisible);
    window.addEventListener("online", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
      window.removeEventListener("online", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [userId]);

  const markRead = useCallback(
    async (ids) => {
      if (!userId || !ids.length) return true;
      setSavingFor(userId);
      try {
        await acknowledgeActivity(userId, ids);
        if (currentUser.current === userId) {
          readVersion.current++;
          setState((previous) =>
            previous.userId !== userId
              ? previous
              : {
                  ...previous,
                  error: "",
                  events: previous.events.map((event) =>
                    ids.includes(event.id) ? { ...event, read: true } : event,
                  ),
                },
          );
        }
        return true;
      } catch (error) {
        if (currentUser.current === userId)
          setState((previous) => ({ ...previous, error: error.message }));
        return false;
      } finally {
        setSavingFor((previous) => (previous === userId ? null : previous));
      }
    },
    [userId],
  );

  const current = state.userId === userId;
  const events = current ? state.events : [];
  const unread = events.filter((event) => !event.read);
  const counts = {};
  for (const event of unread) {
    for (const section of activitySections(event))
      counts[section] = (counts[section] || 0) + 1;
  }
  return {
    events,
    unread,
    counts,
    error: current ? state.error : "",
    loading: current ? state.loading : Boolean(userId),
    saving: savingFor === userId && Boolean(userId),
    markRead,
    refresh: () => refreshRef.current(),
  };
}
