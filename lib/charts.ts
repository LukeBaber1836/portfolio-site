export type Week = { week: string; billable: number; nonBillable: number };

/** Fill the last N weeks so empty weeks still show as gaps on the axis. */
export function fillWeeks(rows: Week[], count = 8): Week[] {
  const byWeek = new Map(rows.map((r) => [r.week, r]));
  const out: Week[] = [];
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - i * 7);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push(byWeek.get(key) ?? { week: key, billable: 0, nonBillable: 0 });
  }
  return out;
}
