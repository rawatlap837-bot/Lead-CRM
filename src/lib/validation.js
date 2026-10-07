import { isValid, parseISO } from "date-fns";
import { todayIST } from "./dates.js";
export function validDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    isValid(parseISO(value))
  );
}
export function validateLead(values) {
  if (!values.name?.trim()) return "Please enter the lead’s name.";
  if (!/^\+?\d+$/.test(values.phone || ""))
    return "Enter a phone number using digits and an optional leading +.";
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
    return "Please enter a valid email address.";
  if (
    !["new", "contacted", "follow-up", "converted", "lost"].includes(
      values.status,
    )
  )
    return "Please select a valid lead status.";
  return "";
}
export function validateFollowup(values, today = todayIST()) {
  if (!values.description?.trim()) return "Please enter a follow-up note.";
  if (!validDate(values.connected_on))
    return "Please choose a valid connected date.";
  if (!validDate(values.reconnect_on) || values.reconnect_on < today)
    return "Reconnect date must be today or later.";
  return "";
}
