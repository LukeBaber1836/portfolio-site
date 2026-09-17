import { requireClient } from "@/lib/auth/guards";
import { portalHours } from "@/lib/dal/portal";
import { formatDate, formatTime } from "@/lib/format";
import { monthRange } from "@/lib/portal-months";

// Neutralise spreadsheet formula injection and quote every cell.
function csvCell(value: string | number) {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const { client } = await requireClient();
  const range = monthRange(new URL(request.url).searchParams.get("month"));
  const entries = await portalHours(range);

  const rows = [
    ["Date", "Start", "End", "Project", "Description", "Hours", "Billing"],
    ...entries.map((e) => [
      formatDate(e.startedAt, "yyyy-MM-dd"),
      formatTime(e.startedAt),
      formatTime(e.endedAt),
      e.projectName,
      e.description ?? "",
      ((e.durationSeconds ?? 0) / 3600).toFixed(2),
      !e.billable ? "No charge" : e.invoiceStatus === "paid" ? "Paid" : e.invoiceId ? "Invoiced" : "Not yet invoiced",
    ]),
  ];
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const slug = (client.company || client.name).toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // Byte-order mark so Excel opens the file as UTF-8, built programmatically:
  // the raw character is forbidden by `no-irregular-whitespace`.
  const BOM = String.fromCharCode(0xfeff);
  return new Response(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hours-${slug}-${range.key}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
