import { TZDate } from "@date-fns/tz";
import { format, formatDistanceToNowStrict } from "date-fns";

export const BUSINESS_TZ = "America/Chicago";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatMoney(cents: number | null | undefined) {
  return usd.format((cents ?? 0) / 100);
}

/** "12.50 h" — used on invoices and totals. */
export function formatHours(seconds: number | null | undefined, digits = 2) {
  return `${((seconds ?? 0) / 3600).toFixed(digits)} h`;
}

/** "1h 05m" — used in time logs. */
export function formatDuration(seconds: number | null | undefined) {
  const s = Math.max(0, Math.round(seconds ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** "01:05:32" — running timer display. */
export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

export function inBusinessTz(date: Date | string | number) {
  return new TZDate(new Date(date), BUSINESS_TZ);
}

export function formatDate(date: Date | string | null | undefined, pattern = "MMM d, yyyy") {
  if (!date) return "—";
  // Plain `YYYY-MM-DD` columns are calendar dates; don't shift them across timezones.
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split("-").map(Number);
    return format(new Date(y, m - 1, d), pattern);
  }
  return format(inBusinessTz(date), pattern);
}

export function formatDateTime(date: Date | string | null | undefined) {
  return formatDate(date, "MMM d, yyyy · h:mm a");
}

export function formatTime(date: Date | string | null | undefined) {
  return formatDate(date, "h:mm a");
}

export function formatRelative(date: Date | string) {
  return formatDistanceToNowStrict(new Date(date), { addSuffix: true });
}

/** Today's calendar date in the business timezone, as YYYY-MM-DD. */
export function todayIso() {
  return format(inBusinessTz(Date.now()), "yyyy-MM-dd");
}

export function initials(name: string | null | undefined) {
  return (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
