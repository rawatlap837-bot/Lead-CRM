import { useOutletContext } from "react-router-dom";

// Indicators use the same unread activity as the sidebar and notification bell.
export default function UpdateIndicator({ source, entityId, section }) {
  const activity = useOutletContext()?.activity;
  const events = (activity?.events || []).filter(
    (event) =>
      !event.read &&
      (!source || event.source === source) &&
      (!entityId || event.entity_id === entityId) &&
      (!section || event.section === section),
  );
  if (!events.length) return null;
  const label = `${events.length} new updates: ${events.map((event) => event.message).join("; ")}`;
  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className="ml-2 inline-block h-2 w-2 shrink-0 rounded-full bg-red-500 align-middle"
    />
  );
}
