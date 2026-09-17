import { TZDate } from "@date-fns/tz";
import { addDays, format, parseISO, startOfWeek } from "date-fns";

import { BUSINESS_TZ } from "@/lib/format";

/** Resolve a `YYYY-MM` param (default: current month) into a business-timezone range. */
export function monthRange(month?: string | null) {
  const now = new TZDate(Date.now(), BUSINESS_TZ);
  const valid = month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const [y, m] = valid ? month!.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const from = new Date(new TZDate(y!, m! - 1, 1, BUSINESS_TZ).getTime());
  const to = new Date(new TZDate(y!, m!, 1, BUSINESS_TZ).getTime());
  return { key: `${y}-${String(m).padStart(2, "0")}`, from, to, label: format(new Date(y!, m! - 1, 1), "MMMM yyyy") };
}

/** Monday–Sunday week (business TZ) for a `YYYY-MM-DD` anchor param, defaulting to the current week. */
export function weekRange(week?: string | null) {
  const now = new TZDate(Date.now(), BUSINESS_TZ);
  const anchor = week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? parseISO(week) : now;
  const monday = startOfWeek(anchor, { weekStartsOn: 1 });
  const currentMonday = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const start = new Date(new TZDate(monday.getFullYear(), monday.getMonth(), monday.getDate(), BUSINESS_TZ).getTime());
  return {
    startIso: format(monday, "yyyy-MM-dd"),
    currentMondayIso: currentMonday,
    start,
    end: new Date(start.getTime() + 7 * 86_400_000),
    days: Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), "yyyy-MM-dd")),
    prevIso: format(addDays(monday, -7), "yyyy-MM-dd"),
    nextIso: format(addDays(monday, 7), "yyyy-MM-dd"),
  };
}
