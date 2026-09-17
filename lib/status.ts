// Client-facing labels + semantic tones for every status vocabulary (styles.md §Status).

export type Tone = "info" | "attention" | "success" | "danger" | "neutral";

type StatusDef = { label: string; tone: Tone };

export const PROJECT_STATUS: Record<string, StatusDef> = {
  planned: { label: "Scheduled", tone: "neutral" },
  in_progress: { label: "In progress", tone: "info" },
  review: { label: "Awaiting your review", tone: "attention" },
  on_hold: { label: "On hold", tone: "neutral" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const MILESTONE_STATUS: Record<string, StatusDef> = {
  upcoming: { label: "Upcoming", tone: "neutral" },
  in_progress: { label: "In progress", tone: "info" },
  done: { label: "Done", tone: "success" },
};

export const INVOICE_STATUS: Record<string, StatusDef> = {
  draft: { label: "Draft", tone: "neutral" },
  open: { label: "Due", tone: "attention" },
  overdue: { label: "Overdue", tone: "danger" },
  paid: { label: "Paid", tone: "success" },
  void: { label: "Void", tone: "neutral" },
  uncollectible: { label: "Uncollectible", tone: "danger" },
};

export const REQUEST_STATUS: Record<string, StatusDef> = {
  new: { label: "New", tone: "attention" },
  in_review: { label: "In review", tone: "info" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "neutral" },
};

export const REFERENCE_STATUS: Record<string, StatusDef> = {
  pending: { label: "Pending review", tone: "attention" },
  approved: { label: "Approved", tone: "success" },
  declined: { label: "Not for me", tone: "neutral" },
};

export const TIME_STATUS: Record<string, StatusDef> = {
  running: { label: "Running", tone: "info" },
  unbilled: { label: "Unbilled", tone: "attention" },
  invoiced: { label: "Invoiced", tone: "neutral" },
  paid: { label: "Paid", tone: "success" },
  no_charge: { label: "No charge", tone: "neutral" },
};

export const SERVICE_TYPES = [
  { value: "web_dev", label: "Web Development" },
  { value: "ui_ux", label: "UI/UX Design" },
  { value: "modeling_3d", label: "3D Modeling" },
  { value: "printing_3d", label: "3D Printing" },
  { value: "app_dev", label: "App Development" },
  { value: "automation", label: "Automation" },
  { value: "other", label: "Other" },
] as const;

export function serviceLabel(value: string | null | undefined) {
  return SERVICE_TYPES.find((s) => s.value === value)?.label ?? "Other";
}
