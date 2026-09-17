import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Conventions: money in integer cents, durations in integer seconds, timestamps
// as timestamptz. User ids reference neon_auth."user".id (managed by Neon Auth,
// intentionally not a foreign key — see lib/db/auth-schema.ts).

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const clientStatus = pgEnum("client_status", ["active", "archived"]);
export const memberRole = pgEnum("member_role", ["owner", "member"]);
export const serviceType = pgEnum("service_type", [
  "web_dev",
  "ui_ux",
  "modeling_3d",
  "printing_3d",
  "app_dev",
  "automation",
  "other",
]);
export const projectStatus = pgEnum("project_status", [
  "planned",
  "in_progress",
  "review",
  "on_hold",
  "completed",
  "cancelled",
]);
export const billingType = pgEnum("billing_type", ["hourly", "fixed"]);
export const milestoneStatus = pgEnum("milestone_status", ["upcoming", "in_progress", "done"]);
export const invoiceStatus = pgEnum("invoice_status", [
  "draft",
  "open",
  "paid",
  "void",
  "uncollectible",
]);
export const requestStatus = pgEnum("request_status", ["new", "in_review", "accepted", "declined"]);

export const referenceKind = pgEnum("reference_kind", ["link", "note"]);

export const referenceStatus = pgEnum("reference_status", ["pending", "approved", "declined"]);
export const uploadKind = pgEnum("upload_kind", ["pictures", "videos", "files"]);

export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    businessName: text("business_name").notNull().default("Luke Baber"),
    businessEmail: text("business_email").notNull().default("luke.baber1@gmail.com"),
    defaultRateCents: integer("default_rate_cents").notNull().default(5000),
    roundingMinutes: integer("rounding_minutes").notNull().default(0),
    defaultTermsDays: integer("default_terms_days").notNull().default(15),
    timezone: text("timezone").notNull().default("America/Chicago"),
    longTimerAlertHours: integer("long_timer_alert_hours").notNull().default(8),
    ...timestamps,
  },
  (t) => [
    check("settings_singleton", sql`${t.id} = 1`),
    check("settings_rounding", sql`${t.roundingMinutes} in (0, 6, 15, 30)`),
  ],
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    company: text("company"),
    email: text("email").notNull(),
    phone: text("phone"),
    status: clientStatus("status").notNull().default("active"),
    defaultRateCents: integer("default_rate_cents"),
    termsDays: integer("terms_days"),
    stripeCustomerId: text("stripe_customer_id").unique(),
    storageUsername: text("storage_username"),
    storagePath: text("storage_path"),
    storageProvisionedAt: timestamp("storage_provisioned_at", { withTimezone: true }),
    notesInternal: text("notes_internal"),
    ...timestamps,
  },
  (t) => [index("clients_status_idx").on(t.status)],
);

export const clientMembers = pgTable(
  "client_members",
  {
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: memberRole("role").notNull().default("owner"),
    emailUpdates: boolean("email_updates").notNull().default(true),
    emailWeeklySummary: boolean("email_weekly_summary").notNull().default(true),
    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.clientId, t.userId] }),
    index("client_members_user_idx").on(t.userId),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    serviceType: serviceType("service_type").notNull().default("web_dev"),
    status: projectStatus("status").notNull().default("planned"),
    billingType: billingType("billing_type").notNull().default("hourly"),
    rateCents: integer("rate_cents"),
    fixedPriceCents: integer("fixed_price_cents"),
    budgetHours: integer("budget_hours"),
    progressPct: integer("progress_pct").notNull().default(0),
    startDate: date("start_date"),
    dueDate: date("due_date"),
    clientVisible: boolean("client_visible").notNull().default(true),
    // Folder name under the client's storage path. Set once; never renamed with the project.
    storageFolder: text("storage_folder"),
    storageProvisionedAt: timestamp("storage_provisioned_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("projects_client_idx").on(t.clientId, t.status),
    check("projects_progress_range", sql`${t.progressPct} between 0 and 100`),
  ],
);

export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: milestoneStatus("status").notNull().default("upcoming"),
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("milestones_project_idx").on(t.projectId, t.sortOrder)],
);

export const projectUpdates = pgTable(
  "project_updates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").notNull(),
    body: text("body").notNull(),
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("project_updates_project_idx").on(t.projectId, t.createdAt)],
);

export const projectReferences = pgTable(
  "project_references",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: referenceKind("kind").notNull().default("link"),
    url: text("url"),
    title: text("title").notNull(),
    note: text("note"),
    screenshotUrl: text("screenshot_url"),
    faviconUrl: text("favicon_url"),
    status: referenceStatus("status").notNull().default("pending"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    // Client's own typed feedback — separate from `note` (the admin's context when sending it).
    responseNote: text("response_note"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by"),
    ...timestamps,
  },
  (t) => [index("project_references_project_idx").on(t.projectId, t.sortOrder)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    stripeInvoiceId: text("stripe_invoice_id").notNull().unique(),
    number: text("number"),
    status: invoiceStatus("status").notNull().default("draft"),
    currency: text("currency").notNull().default("usd"),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    amountPaidCents: integer("amount_paid_cents").notNull().default(0),
    amountDueCents: integer("amount_due_cents").notNull().default(0),
    dueDate: date("due_date"),
    hostedInvoiceUrl: text("hosted_invoice_url"),
    invoicePdfUrl: text("invoice_pdf_url"),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    memo: text("memo"),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    lastReminderAt: timestamp("last_reminder_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("invoices_client_status_idx").on(t.clientId, t.status),
    index("invoices_status_due_idx").on(t.status, t.dueDate),
  ],
);

export const timeEntries = pgTable(
  "time_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    userId: uuid("user_id").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds").generatedAlwaysAs(
      sql`case when ended_at is null then null else floor(extract(epoch from (ended_at - started_at)))::int end`,
    ),
    description: text("description"),
    billable: boolean("billable").notNull().default(true),
    rateCents: integer("rate_cents"),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("time_entries_one_running_per_user")
      .on(t.userId)
      .where(sql`ended_at is null`),
    index("time_entries_project_started_idx").on(t.projectId, t.startedAt),
    index("time_entries_invoice_idx").on(t.invoiceId),
    check("time_entries_end_after_start", sql`ended_at is null or ended_at > started_at`),
  ],
);

export const invoiceLineItems = pgTable(
  "invoice_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitAmountCents: integer("unit_amount_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("invoice_line_items_invoice_idx").on(t.invoiceId)],
);

export const clientRequests = pgTable(
  "client_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    serviceType: serviceType("service_type"),
    status: requestStatus("status").notNull().default("new"),
    ...timestamps,
  },
  (t) => [index("client_requests_status_idx").on(t.status, t.createdAt)],
);

export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

/** FileBrowser upload-share hashes handed to the portal, one per (project, kind). */
export const projectUploadShares = pgTable(
  "project_upload_shares",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: uploadKind("kind").notNull(),
    hash: text("hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.kind] })],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_entity_idx").on(t.entityType, t.entityId, t.createdAt)],
);

export type Client = typeof clients.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type ProjectUpdate = typeof projectUpdates.$inferSelect;
export type ProjectReference = typeof projectReferences.$inferSelect;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type ClientRequest = typeof clientRequests.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type ProjectStatus = (typeof projectStatus.enumValues)[number];
export type InvoiceStatus = (typeof invoiceStatus.enumValues)[number];
export type ServiceType = (typeof serviceType.enumValues)[number];
export type MilestoneStatus = (typeof milestoneStatus.enumValues)[number];
export type RequestStatus = (typeof requestStatus.enumValues)[number];
export type UploadKind = (typeof uploadKind.enumValues)[number];
