# Client Portal & Admin Console — Implementation Plan

> Status: **Draft for review** · Author: Claude (with Luke Baber) · Date: 2026-09-12
> Scope: add authenticated client portal + admin console (clients, jobs, time tracking, Stripe invoicing) to `portfolio-site`.

---

## 0. TL;DR

- The header's **Contact** button becomes **Client Login**, which turns into **Portal** once you're signed in. **Contact** moves into the main nav next to Home / Services / Resume / Work.
- There are two new areas in the same Next.js app:
  - **`/portal`** is for clients. They can see project status, milestones, updates, hours logged, invoices (with Stripe Pay links), a file-upload handoff to `storage.lukebaber.com`, and their account settings.
  - **`/admin`** is for you. You can manage clients, jobs/projects, the clock-in/clock-out timer, timesheets, the invoice builder (Stripe), accounts receivable (outstanding and overdue), and settings.
- **Stack:**
  - **Neon Postgres + Drizzle** for data.
  - **Neon Managed Better Auth** for sign-in. Email/password (12+ chars with a strength policy) plus Google OAuth. Clients are invite-only.
  - **Stripe Invoicing** on the *Luke Baber sandbox* account.
  - **Resend** for branded transactional emails.
  - **shadcn/ui** components skinned with your gold/clay design system.
  - **transitions.dev** recipes for motion polish.
- **The build has 9 phases.** Each one can ship on its own, so you get a usable admin (clients + timer) before invoicing is finished.

---

## 1. What I found in the current project

| Area | Current state | Impact on plan |
|---|---|---|
| Framework | Next.js 16.2, React 19, Tailwind v4 (`@theme` in `app/globals.css`), TypeScript | Use `proxy.ts` (Next 16 replacement for `middleware.ts`), Server Components + Server Actions |
| Pages | `/`, `/services`, `/resume`, `/work`, `/contact` | Move into an `(site)` route group so the portal gets its own shell |
| Header | `components/Header.tsx`: logo, `Nav`, gold `Contact` button. `MobileNav` already lists contact | Swap button → Login/Portal; add Contact to desktop nav |
| Root layout | Renders `Header` + `GitHubCommitBG` for every route; `app/template.tsx` does a 0.75s fade on every navigation | Portal needs no marketing header and snappier transitions → route groups |
| Design | Dark `#141416` bg, `#232329` / `#27272c` surfaces, gold gradient (`gold-d1 → gold-l1 → gold-d2`), accent `#f3d076`, hover cyan `#00b4c8`, JetBrains Mono, `rounded-xl`, claymorphism utilities (`.clay`, `.clay-glow`, `.clay-hover`) | Basis of the portal design language |
| shadcn | `components.json` present (style `default`, `cssVariables: false`, Tailwind v3-style config path, `@animate-ui` registry). Hand-restyled `button`, `input`, `select`, `tabs`, `sheet`, `alert-dialog`, `tooltip`, `scroll-area`, `textarea` | Needs a Tailwind v4 / CSS-variable refresh before adding many components (see §5.2) |
| **`styles.md`** | **Does not exist** (searched the repo and parent folder) | Phase 1 creates it by documenting the existing system, then adds portal rules |
| Email | `app/api/contact/route.ts` uses Resend with `onboarding@resend.dev` sender | Resend has **no verified domains** — must verify `lukebaber.com` first |
| Neon | Project **Portfolio Website** (`empty-rice-65248177`, AWS us-east-2, PG 18, free plan). Branch `production`. **Managed Better Auth already provisioned** (email/password on, sign-up open, email verification off, Google OAuth on *shared dev keys*, shared SMTP sender). Only `neon_auth.*` tables exist — no app tables | Auth foundation exists; must harden config for production |
| Stripe | Two accounts on MCP: **Luke Baber sandbox** (`acct_1UEt0D2OQjSKrfOF`, test mode, 0 customers) and **Cloud Slicer** (live). | Build exclusively against Luke Baber sandbox. **Cloud Slicer is never touched.** Going live needs live-mode activation of the Luke Baber account |
| Vercel | Team "Luke Baber's projects" (Pro), project `portfolio-site` linked to GitHub | Deploy target, env vars, cron jobs |
| Storage | `storage.lukebaber.com` = **FileBrowser** login page | Portal "Files" page links out; per-client credentials managed in FileBrowser |
| Minor bugs spotted | `items-right` (not a class) in Header, `text-white-50` in Input, `focus:text-gold` in Select, `tranistion-all` typo in Tabs | Fix during Phase 1 restyle |

---

## 2. MCP services & tools available — and how each gets used

| Service | What's connected | How I'll use it |
|---|---|---|
| **Neon** (plugin MCP + skills) | Project `empty-rice-65248177` with full admin | • Create a long-lived `dev` branch for development and migrations<br>• `prepare_database_migration` → `complete_database_migration` to test schema changes on a branch before production<br>• `run_sql` / `describe_table_schema` / `compare_database_schema` to verify migrations<br>• Auth admin: `update_auth_user_role` (make you `admin`), `add_auth_trusted_domain` (lukebaber.com + Vercel preview), `add_auth_oauth_provider` (your own Google client), `create_auth_user` (seed test clients on `dev`)<br>• `inspect_database` / `list_slow_queries` / `query_logs` for performance and debugging<br>• Skills: `neon-postgres` (drivers, pooling, migrations), `neon-postgres-branches` |
| **Stripe** | Luke Baber sandbox (test) · Cloud Slicer (live, **off-limits**) | • `search_stripe_documentation` / `stripe_implementation_planner` for the invoicing design<br>• `stripe_api_write` to create test customers, invoice items, and invoices while building<br>• `stripe_api_read` to verify invoice state matches the DB<br>• Every call pinned to `stripe_context: acct_1UEt0D2OQjSKrfOF`, `livemode: false` |
| **Resend** | Account connected, no domains yet | • `create-domain` → DNS records → `verify-domain` for `lukebaber.com`<br>• `send-email` for template test sends<br>• `list-emails` / `get-email` / `list-logs` to debug delivery<br>• `create-webhook` (optional) to record bounces and complaints<br>• Not used: broadcasts, contacts, marketing |
| **Vercel** | Team (Pro) + `portfolio-site` project | • `list_deployments`, `get_deployment_build_logs`, `get_runtime_logs`, `get_runtime_errors` to debug deploys<br>• `get_project_deployment_protection` to keep preview deploys (with a live portal) protected<br>• `search_vercel_documentation` for cron/Fluid compute<br>• Env vars are set via Vercel dashboard or `vercel env` CLI (no MCP tool for env) |
| **PostHog** (claude.ai MCP) | Available | Optional, from Phase 8. Privacy-safe product analytics on the portal (which pages clients use, invoice-view → pay conversion) and error tracking. Session replay off or inputs masked on portal routes |
| **T3 Code browser preview** | `preview_*` tools | Drive the running app: click through login, timer, and invoice flows; responsive checks; screenshots and recordings for your review |
| **WebFetch / WebSearch** | — | shadcn, transitions.dev, and FileBrowser docs lookups |
| **Skills** | `dataviz`, `code-review`, `security-review`, `simplify`, `run`, Neon skills | `dataviz` before building charts; `security-review` + `code-review` before launch |
| **Not used** | MailerLite, Polar / Polar sandbox | Marketing email and an alternative payments provider. Out of scope because Stripe is the invoicing system. MailerLite could power a newsletter later |
| **To install** | transitions.dev skill | `npx skills add Jakubantalik/transitions.dev` and `npx skills add Jakubantalik/transitions.dev -s transitions-polish` (free tier is enough) |

---

## 3. Product design

### 3.1 Roles

| Role | How assigned | Can do |
|---|---|---|
| `admin` (you) | `neon_auth.user.role = 'admin'` via Neon MCP `update_auth_user_role` | Everything in `/admin`. Can also "view as client" (impersonation, capped at 1h by Better Auth) |
| Client member | Row in `client_members` linking a Neon Auth user to a `clients` row | Read-only access to **their** client's projects, hours, invoices, files link, and settings. Can submit requests |
| Signed-in user with no membership | Shouldn't exist (sign-up is disabled) | Sees a "Your account isn't linked yet" empty state |

A single client (company) can have **multiple contacts** — e.g. the owner and their office manager both log in.

### 3.2 Information architecture

```
Public site
├── Header: Home · Services · Resume · Work · Contact            [Client Login ▸]  (→ [Portal ▸] when signed in)
│
Auth  (centered clay card, gold accents, no marketing header)
├── /login                  email+password · "Continue with Google" · forgot password
├── /forgot-password        request reset
├── /reset-password         set new password (12+ policy, live checklist)
├── /accept-invite          first-time password set / Google link (from invite email)
└── /verify-email           6-digit OTP (input-otp)

Client portal  /portal   (sidebar shell)
├── Overview                KPI tiles · active projects · outstanding balance w/ Pay · recent activity
├── Projects  /[id]         status stepper · progress · milestones · updates · time log · hours vs budget
├── Hours                   filterable time log, monthly totals, CSV export
├── Invoices  /[id]         status · line items · linked time entries · Pay (Stripe) · PDF
├── Files                   storage.lukebaber.com handoff (+ "I uploaded files" notify button)
├── Requests                ask for a change / new job (emails you, tracked in admin)
└── Settings                profile · password · Google link · active sessions · email prefs

Admin console  /admin    (sidebar shell + persistent timer in top bar)
├── Dashboard               timer · this week's hours · unbilled $ · outstanding AR · overdue · recent payments
├── Clients  /new  /[id]    list · create (→ Stripe customer + invite) · detail tabs: Overview/Projects/Time/Invoices/Contacts/Notes
├── Projects  /[id]         CRUD · status · milestones · post update (optional email to client)
├── Time                    timesheet (week/list) · manual entry · edit/split · bulk non-billable
├── Invoices  /new  /[id]   AR dashboard (outstanding, overdue aging) · invoice builder · send/remind/void/mark paid
├── Requests                inbox of client requests → convert to project
└── Settings                business info · default rate ($50/h) · rounding · payment terms · email toggles
```

### 3.3 Key user journeys

**A. You onboard a new client (≈1 minute)**
1. Go to Admin → Clients → **New client**. Enter company name, contact name + email, hourly rate (defaults to $50), payment terms (defaults to Net 15), and optionally a FileBrowser username.
2. The server does three things:
   - Inserts `clients` + `client_members`.
   - Creates the **Stripe customer** (id stored on the client).
   - Creates the Neon Auth user (admin API).
3. Resend sends a branded **"Welcome to your portal"** email. It includes a set-password link, and the contact can also choose "Continue with Google" with the same email.
4. Create the first **project** (for example "Website redesign", type *Web Development*, hourly) with milestones.

**B. You log time**
1. Click **Clock in** in the admin top bar (or press `T`). Pick a client → project from a combobox (recent projects first). The description is optional at start.
2. A timer chip shows the running time on every admin page. The start time comes from the server, so closing the laptop doesn't lose time.
3. Click **Clock out**. A panel slides in asking **"What did you work on?"** (required, 3+ chars) and a billable toggle. Save.
4. The entry is now visible to the client under that project and in Hours: date, duration, description.
5. Guardrails:
   - Only one running timer at a time. Starting a new one prompts you to stop/switch.
   - If a timer runs past 8h, you get an email.
   - You can add manual entries for forgotten time.

**C. You invoice**
1. Admin → Invoices → **New invoice** → pick a client. The builder lists **unbilled billable time** grouped by project, filterable by date range, with checkboxes.
2. Optionally add fixed line items, for example "3D print — PETG, 2 parts" or "Domain renewal".
3. A live preview shows hours × rate per project, subtotal, and due date.
4. Click **Create draft**. This creates the Stripe draft invoice and items and locks the selected entries.
5. Review, then click **Finalize & send**. Stripe emails the hosted invoice. The client also gets a portal notification email, and the invoice appears in their portal with a **Pay** button.
6. Stripe webhooks update status to paid, overdue, void, and so on. When it's paid, you and the client both see it instantly, and a thank-you receipt goes out.

**D. The client checks in**
1. They log in and see "Hi Sarah 👋". Overview shows: 2 active projects, 14.5 h this month, **$725.00 outstanding — Pay now**.
2. They open the project: status *In progress*, progress 60%, next milestone "Staging review — Sep 30", your latest update, and the time log.
3. Files → **Open secure file storage** (opens in a new tab). The page reminds them of their username and has a button to let you know they've uploaded.

### 3.4 Status vocabularies (client-facing labels)

| Entity | Statuses |
|---|---|
| Project | `planned` (Scheduled) · `in_progress` (In progress) · `review` (Awaiting your review) · `on_hold` (On hold) · `completed` (Completed) · `cancelled` |
| Milestone | `upcoming` · `in_progress` · `done` |
| Time entry | `running` · `unbilled` · `invoiced` (derived: `paid` when invoice paid) · non-billable flag |
| Invoice (mirrors Stripe) | `draft` · `open` (Due) · `paid` · `void` · `uncollectible`. Derived **`overdue`** = open && due_date < today |
| Request | `new` · `in_review` · `accepted` · `declined` |

---

## 4. Architecture

### 4.1 Tech choices

| Concern | Choice | Why |
|---|---|---|
| DB access | **Drizzle ORM** + `pg` (node-postgres) with `attachDatabasePool` from `@vercel/functions` | Neon's recommendation for Vercel Fluid compute. Typed schema, migrations as code |
| Migrations | `drizzle-kit generate` → apply using **`DATABASE_URL_UNPOOLED`**. Test on Neon `dev` branch first | Pooled connections break migrations |
| Auth | `@neondatabase/auth` (`createNeonAuth`) — server SDK + `/api/auth/[...path]` proxy + `proxy.ts` | Already provisioned. HTTP-only cookie sessions. Admin plugin for user creation and impersonation |
| Validation | `zod` shared by forms (react-hook-form) and Server Actions | One source of truth for rules like the password policy |
| Payments | `stripe` Node SDK, Invoicing API (`collection_method: send_invoice`) | Hosted invoice page, PDF, reminders, card + ACH, no PCI scope |
| Email | `resend` (already installed) + **React Email** (`@react-email/components`) templates in repo | Versioned, branded dark/gold templates |
| UI | shadcn/ui (Radix) + existing custom components, `lucide-react` + `react-icons` | Requested; consistent with the current codebase |
| Tables | shadcn `table` + `@tanstack/react-table` (data-table pattern) | Sorting, filtering, pagination for time and invoices |
| Charts | shadcn `chart` (Recharts), following the `dataviz` skill | Hours/week, revenue, AR aging |
| Motion | `motion` / `framer-motion` (already installed) + transitions.dev recipes | Consistent with site; honors `prefers-reduced-motion` |
| Dates | `date-fns` + `date-fns-tz`, business TZ `America/Chicago` | Timesheets and due dates in your timezone |
| Scheduled jobs | Vercel Cron → `/api/cron/*` (secret-protected) | Overdue reminders, long-timer alerts, weekly digests |
| Tests | Vitest for pure logic (billing math, rounding, rate resolution, password policy, status derivation); browser-preview walkthroughs for flows | Repo has no tests today; focus on the money logic |

### 4.2 Folder structure (target)

```
app/
├── layout.tsx                      # html/body/fonts only (Header + GitHubCommitBG move out)
├── (site)/                         # URL-transparent group — marketing pages
│   ├── layout.tsx                  # GitHubCommitBG + Header
│   ├── template.tsx                # existing 0.75s fade (moved)
│   ├── page.tsx  services/  resume/  work/  contact/
├── (auth)/
│   ├── layout.tsx                  # centered clay card shell
│   ├── login/  forgot-password/  reset-password/  accept-invite/  verify-email/
├── portal/
│   ├── layout.tsx                  # requireClient() + sidebar shell
│   ├── page.tsx  projects/[id]/  hours/  invoices/[id]/  files/  requests/  settings/
├── admin/
│   ├── layout.tsx                  # requireAdmin() + sidebar + TimerBar
│   ├── page.tsx  clients/(new|[id])/  projects/[id]/  time/  invoices/(new|[id])/  requests/  settings/
└── api/
    ├── auth/[...path]/route.ts     # Neon Auth proxy (wrapped for password-policy checks)
    ├── webhooks/stripe/route.ts
    ├── webhooks/neon-auth/route.ts # branded auth emails via Resend
    ├── cron/(invoice-reminders|timer-alerts|weekly-digest)/route.ts
    ├── contact/route.ts            # existing
    └── github-*/                   # existing
components/
├── ui/                             # shadcn primitives (brand-skinned)
├── portal/  admin/  auth/  shared/ # feature components (StatusBadge, KpiTile, TimerBar, InvoiceBuilder…)
lib/
├── auth/(server|client|guards).ts
├── db/(index|schema).ts
├── dal/(clients|projects|time|invoices|requests).ts   # "server-only"; every query authorizes
├── billing/(rates|rounding|totals).ts                  # pure, unit-tested
├── stripe/(client|invoices|webhooks).ts
├── email/(send.ts, templates/*.tsx)
└── validation/(password|client|project|time|invoice).ts
drizzle/ (migrations) · drizzle.config.ts · proxy.ts · vercel.json · styles.md
```

### 4.3 Data model (public schema, Drizzle)

Money is stored as **integer cents**, durations as **integer seconds**, and timestamps as `timestamptz`. `neon_auth.user` is referenced read-only; drizzle-kit uses `schemaFilter: ['public']` so it never touches the auth schema.

```
settings            (singleton)  business_name, business_email, default_rate_cents=5000,
                                 rounding_minutes (0|6|15), default_terms_days=15, timezone,
                                 long_timer_alert_hours=8

clients             id uuid pk, name, company, email, phone, status(active|archived),
                    default_rate_cents null, terms_days null, stripe_customer_id unique,
                    storage_username null, storage_path null, notes_internal, created_at, updated_at

client_members      client_id fk, user_id text (neon_auth.user.id), role(owner|member),
                    invited_at, joined_at, pk(client_id,user_id)

projects            id, client_id fk, name, description, service_type
                    (web_dev|ui_ux|modeling_3d|printing_3d|app_dev|automation|other),
                    status, billing_type(hourly|fixed), rate_cents null, fixed_price_cents null,
                    budget_hours null, progress_pct 0-100, start_date, due_date,
                    client_visible bool default true, created_at, updated_at

milestones          id, project_id fk, title, description, status, due_date, completed_at, sort_order

project_updates     id, project_id fk, author_user_id, body (markdown), emailed_at null, created_at

time_entries        id, project_id fk, user_id, started_at, ended_at null,
                    duration_seconds (generated/stored when ended), description,
                    billable bool, rate_cents (snapshot at clock-out), invoice_id fk null,
                    created_at, updated_at
                    ↳ partial unique index: one row WHERE ended_at IS NULL per user_id
                    ↳ check: ended_at > started_at; invoiced rows are immutable (enforced in DAL)

invoice_line_items  id, client_id, project_id null, invoice_id null, description,
                    quantity, unit_amount_cents, created_at      # ad-hoc/fixed charges

invoices            id, client_id fk, stripe_invoice_id unique, number, status,
                    currency='usd', subtotal_cents, total_cents, amount_paid_cents, amount_due_cents,
                    due_date, hosted_invoice_url, invoice_pdf_url, period_start, period_end,
                    finalized_at, sent_at, paid_at, voided_at, last_reminder_at, created_at, updated_at

client_requests     id, client_id, user_id, title, body, service_type, status, created_at

stripe_events       id (evt_…) pk, type, received_at, processed_at     # webhook idempotency

audit_log           id, actor_user_id, action, entity_type, entity_id, metadata jsonb, created_at
```

**Rate resolution** (pure function, unit-tested): `project.rate_cents ?? client.default_rate_cents ?? settings.default_rate_cents`. The rate is snapshotted onto the entry when you clock out, so later rate changes don't rewrite history.

**Rounding**: store exact seconds. Apply `settings.rounding_minutes` only when computing invoice quantities, and show both "logged" and "billed" hours.

### 4.4 Authorization (defense in depth)

1. **`proxy.ts`** redirects unauthenticated users hitting `/portal/*` or `/admin/*` to `/login?next=…`. This is for UX, not security.
2. **Layouts** call `requireClient()` / `requireAdmin()` and render `notFound()`/redirect on failure.
3. **The data access layer (`lib/dal/*`, `import "server-only"`)** is the real boundary:
   - Every read and write takes the session and scopes by `client_members` membership.
   - A client ID from the URL or form is never trusted without a membership check.
   - All admin mutations call `requireAdmin()` inside the action itself.
4. **Server Actions** validate input with zod and write to `audit_log` for sensitive changes (rates, invoices, voids, role changes).
5. Stripe secret, Resend key, DB URLs, and cookie secret are server-only env vars. Nothing sensitive gets a `NEXT_PUBLIC_` prefix.
6. **Webhooks**:
   - Stripe: signature verified on the raw body, idempotent via `stripe_events`.
   - Neon Auth: Ed25519 JWS verified against JWKS, with a 5-min timestamp window.
7. **Cron routes** require `Authorization: Bearer ${CRON_SECRET}`.

---

## 5. Design system

### 5.1 Create and maintain `styles.md` (repo root)

It doesn't exist yet. Phase 1 writes it as the single source of truth, and **every PR that changes styling updates it**.

1. **Brand tokens**:
   - Colors: page `#141416`, surfaces `#232329` / `#27272c`, gold ramp `#aa771c → #bf953f → #f3d076 → #fbf5b7 → #fcf6ba`, hover cyan `#00b4c8`, muted `#616161`.
   - Gold gradient recipe.
   - Type: JetBrains Mono, `.h1`–`.h3` scale, `text-white/60` for secondary copy.
   - Radius 0.75rem.
   - Custom breakpoints (lg 960, xl 1200).
2. **Elevation**: `.clay` (static cards), `.clay-glow` (interactive gold glow — note the transition caveat already documented in CSS), `.clay-hover` (icon buttons).
3. **Components**: Button variants (`default` gold gradient, `goldOutline`, `iconOutline`, effects `shineHover` etc.), Input/Select/Textarea spec (48px, `rounded-xl`, `border-white/10`, `focus:border-accent`), Tabs active state (gold gradient), active nav (`text-accent border-b-2`).
4. **Motion**: marketing page fade 0.75s ease-in-out, stagger patterns (Socials, GitHub grid).
5. **NEW — App/portal density**:
   - Base text 14–15px.
   - Headings use `.h3` scale (the 80px `.h1` is marketing-only).
   - 4px spacing grid.
   - Content max-width 1200px.
   - Sidebar 260px (collapsible to icons).
6. **NEW — Semantic status colors** (gold is already the accent, so "warning" must not be gold):

   | Meaning | Token | Use |
   |---|---|---|
   | Info / in progress | cyan `#00b4c8` | project in progress, running timer pulse |
   | Due / attention | gold `#f3d076` | open invoice, awaiting review |
   | Success | emerald `#34d399` | paid, completed, milestone done |
   | Danger | rose `#fb7185` | overdue, failed payment, errors |
   | Neutral | white/40 on white/5 | draft, planned, void, archived |

   Badges are pill-shaped (`rounded-full`), with a tinted background at 12% and 1px border at 30%. Status is never shown by color alone: every badge also carries an icon + label.
7. **NEW — Data display**:
   - Tables: `bg-[#1b1b1f]` rows, `border-white/5` dividers, sticky header, tabular numbers (`tabular-nums`), right-aligned money.
   - KPI tiles: clay card, big number with number pop-in.
   - Charts: follow the `dataviz` skill, with the gold ramp for single series and a status palette for categorical data.
8. **NEW — Motion for the app**:
   - 150–250ms for UI state changes, 300–400ms for panels/modals.
   - `ease-out` enter, `ease-in` exit.
   - A transitions.dev recipe map (§5.3).
   - A `prefers-reduced-motion` fallback (opacity only).
9. **Accessibility**: WCAG AA contrast (gold on `#141416` passes; `text-white/60` minimum for body copy), visible focus rings (`ring-2 ring-accent/60`), 44px touch targets on mobile.

### 5.2 shadcn setup (Tailwind v4)

1. Update `components.json` for Tailwind v4 (`tailwind.config: ""`, `cssVariables: true`, `new-york` style) and keep the `@animate-ui` registry.
2. **Resolve the token naming collision:**
   - **The problem:** the site defines `primary = #141416` (dark background), but shadcn components use `bg-primary` as the *main action color*.
   - **Recommendation:** a one-time mechanical rename in Phase 1 — `primary → background`, `secondary → surface`. This touches roughly 15 usages; the ~50 `text-accent` usages stay. Then define the full shadcn semantic set in `@theme`:

     `background #141416` · `foreground #fff` · `card #27272c` · `popover #1b1b1f` · `primary #f3d076` / `primary-foreground #141416` · `secondary #232329` · `muted #232329` / `muted-foreground rgba(255,255,255,.6)` · `accent #f3d076` · `destructive #fb7185` · `border / input rgba(255,255,255,.1)` · `ring #f3d076` · `success` · `info` · `sidebar-*`
   - **Verify:** visual check of every marketing page before and after.
3. **Add components:** `sidebar`, `card`, `badge`, `table`, `dialog`, `drawer`, `dropdown-menu`, `avatar`, `form`, `label`, `command`, `popover` (combobox), `calendar` + date picker, `sonner`, `skeleton`, `progress`, `separator`, `breadcrumb`, `chart`, `switch`, `checkbox`, `input-otp`, `pagination`, `hover-card`, `toggle-group`.
4. **Skin each component to brand as you add it**, the way `input`/`select`/`tabs` already are:
   - Cards get `clay`.
   - Primary buttons stay the gold gradient `Button`.
   - Focus rings use accent.

### 5.3 transitions.dev — where each recipe goes

| Recipe | Where |
|---|---|
| Text states swap + Icon swap | Timer button "Clock in ▶" ↔ "Clock out ■" |
| Spinning counter / Number pop-in | Running timer digits, KPI tiles, invoice totals in builder |
| Panel reveal | Clock-out description panel; invoice builder summary |
| Modal open/close | All dialogs (new client, new project, confirm void) |
| Toast open/close | Sonner toasts ("Invoice sent", "Time saved") |
| Spinner → check morph / Success check | Submit buttons: send invoice, save entry, send invite |
| Error state shake | Failed login, invalid form submit |
| Checkbox check | Password requirement checklist; time-entry multi-select in builder |
| Tabs sliding | Client detail tabs, portal Hours month switcher |
| Notification badge | Sidebar "Invoices" unpaid count, admin "Requests" new count |
| Dropdown menu morph / Menu dropdown | User avatar menu, row action menus |
| Skeleton loader / Shimmer text | `loading.tsx` states for every portal/admin route |
| Accordion | Invoice line items → expand to time entries; FAQ on Files page |
| Card stack hover / 3D tilt (subtle) | Project cards on portal Overview |
| Toggle thumb | Billable switch, email preference toggles |
| Input clear | Search fields in tables |
| Page side-by-side | Portal ↔ admin route changes (replaces the slow marketing fade inside app shells) |

---

## 6. Authentication & security details

### 6.1 Neon Auth configuration changes (via Neon MCP / Console)

| Setting | Current | Target |
|---|---|---|
| Allow sign-up | ✅ on | **Off**. Clients are invite-only; you create users. Prevents strangers creating accounts via the public Neon Auth endpoint |
| Email verification | off | **On** (OTP) for any email change; invited users verify via invite link |
| Google OAuth | shared dev keys | **Your own Google Cloud OAuth client**. Redirect URI to Neon Auth callback; consent screen "Luke Baber Client Portal" |
| Email provider | shared `auth@mail.myneon.app` (rate-limited) | **Resend SMTP** (`smtp.resend.com`) with sender `portal@lukebaber.com` **plus** `send.otp` / `send.magic_link` webhooks → branded React Email templates |
| Trusted domains | none | `https://lukebaber.com`, `https://www.lukebaber.com`, Vercel preview domain |
| Allow localhost | on | On for `dev` branch only; **off on production** |
| Application name | "Portfolio Website" | "Luke Baber Client Portal" |
| Your user | — | Create yours, then `update_auth_user_role → admin` |

### 6.2 Password policy (shared `lib/validation/password.ts`)

- **Length:** 12 to 128 characters.
- **Character classes:** at least one each of lowercase, uppercase, number, and symbol.
- **Personal info:** must not contain the email local-part or the user's name (case-insensitive).
- **Strength:** `zxcvbn-ts` score ≥ 3.
- **Breach check:** not in known breaches, via the **Have I Been Pwned range API** (k-anonymity — only the first 5 chars of the SHA-1 hash leave the server). If HIBP is down, allow and log.
- **UI:** a live checklist with animated check marks, a strength meter, a show/hide toggle, and a confirm-password field.

**Enforcement points:**
1. Client-side (UX).
2. Server Actions for accept-invite, reset, and change password.
3. The `/api/auth/[...path]` proxy wrapper rejects `sign-up`, `reset-password`, and `change-password` bodies that fail the policy.

**Residual gap to verify in Phase 0:** Neon's hosted auth endpoint only enforces Better Auth's own minimum length (default 8) for requests that bypass our app. The risk is small because sign-up is disabled and all password-setting flows go through our UI. If Neon exposes a `minPasswordLength` setting, set it to 12.

### 6.3 Other auth features

- Rate limiting and lockout from Better Auth defaults, plus a generic "Invalid email or password" message (no account enumeration).
- Sessions list with "Sign out other devices" in Settings.
- Admin "View as client" via impersonation, with a gold banner "Viewing as Sarah (Acme) — Exit".
- **Future:** MFA is on Neon's roadmap ("coming soon"). Add TOTP for the admin account when it's available.

### 6.4 Invite flow (Google-compatible)

1. Admin creates the client and contact → `auth.admin.createUser` with a random 64-char throwaway password → `client_members` row.
2. The server requests a password reset for that email. Neon Auth fires the `send.magic_link` event (`forget-password`), and our webhook sends the **"Welcome — set up your portal"** email containing that link → `/accept-invite`.
3. The contact either sets a password (policy enforced) **or** clicks "Continue with Google". **Phase 0 spike:** confirm Better Auth links the Google account to the existing admin-created user by verified email with sign-up disabled. If it doesn't, the invite page asks them to set a password first, then link Google in Settings.

---

## 7. Stripe invoicing design (Luke Baber sandbox)

### 7.1 Setup

- **Keys:** `STRIPE_SECRET_KEY` (sandbox `sk_test_…` for dev), `STRIPE_WEBHOOK_SECRET`. Keep `STRIPE_PUBLISHABLE_KEY` only if we ever embed Elements (not needed — hosted invoice page).
- **Dashboard settings (sandbox, then live):**
  - Invoice numbering prefix (e.g. `LB-`).
  - Business name, logo, and brand color `#f3d076`.
  - Payment methods: **card + ACH (us_bank_account)**, since ACH is much cheaper on larger invoices.
  - Default memo/footer ("Thank you for your business — Luke Baber, Tyler TX").
  - Automatic reminder emails.
- **Local webhooks:** `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (Stripe CLI).
- **Taxes:** off by default. Texas treats some digital/data-processing services as taxable, so confirm with your accountant. Stripe Tax can be switched on per invoice later without a redesign.

### 7.2 Flow

1. **Client created** → `customers.create({ name, email, metadata: { client_id } })` using idempotency key `client-{id}`.
2. **Draft**:
   - `invoices.create({ customer, collection_method: 'send_invoice', days_until_due: terms, auto_advance: false, pending_invoice_items_behavior: 'exclude', metadata: { portal_invoice_id } })`.
   - For each project group, `invoiceItems.create({ invoice, amount: billed_cents, description: "Website redesign — 12.50 h @ $50.00/h (Sep 1–15)" })`.
   - For each ad-hoc item, `invoiceItems.create({ invoice, quantity, unit_amount_decimal, description })`.
   - One Stripe line per project keeps the PDF clean; the portal invoice page shows every underlying time entry.
3. **DB transaction** (after Stripe succeeds): insert the `invoices` row and set `time_entries.invoice_id`. If the DB write fails, delete the Stripe draft.
4. **Finalize & send** → `invoices.finalizeInvoice` → `invoices.sendInvoice`. Store `hosted_invoice_url` and `invoice_pdf`, then send the Resend "New invoice in your portal" email.
5. **Webhooks** (`/api/webhooks/stripe`) handle `invoice.finalized`, `invoice.sent`, `invoice.paid`, `invoice.payment_failed`, `invoice.overdue`, `invoice.voided`, `invoice.marked_uncollectible`, and `invoice.updated`:
   - Verify the signature, then insert into `stripe_events` (skip if it already exists).
   - Upsert the invoice mirror.
   - On `voided`, release the linked time entries back to *unbilled*.
   - On `paid`, send a thank-you email to the client and a "💰 Payment received" email to you.
6. **Out-of-band payments** (check or cash): the "Mark paid" action calls `invoices.pay({ paid_out_of_band: true })`.
7. **Reminders**: Stripe's automatic reminders, plus an admin **Send reminder** button (Resend email with the Pay link, rate-limited to once per 3 days via `last_reminder_at`) and a daily cron that flags newly overdue invoices.

### 7.3 Admin accounts-receivable view

- **KPI tiles:** Outstanding total · Overdue total (count) · Paid this month · Unbilled work (hours × rate not yet invoiced).
- **Aging buckets:** Current · 1–30 · 31–60 · 60+ days overdue (stacked bar per the `dataviz` skill).
- **Table:** number, client, issued, due, amount, status badge, and actions (View, Copy pay link, Remind, Void, Mark paid).
- **Filters:** status, client, date range.

---

## 8. Transactional emails (Resend + React Email)

**Sender setup:** verify `lukebaber.com` in Resend (SPF/DKIM/DMARC records added at your DNS host). Sender is `Luke Baber <portal@lukebaber.com>`, with reply-to `luke.baber1@gmail.com`. The existing contact form also moves off `onboarding@resend.dev`.

| Template | Trigger | To |
|---|---|---|
| Welcome / set up your portal | Client contact created | Client |
| Verification code (OTP) | Neon Auth `send.otp` webhook | User |
| Password reset | Neon Auth `send.magic_link` (forget-password) | User |
| Password changed / new sign-in from new device (optional) | Settings change | User |
| New invoice | Invoice sent | Client |
| Payment received — thank you | `invoice.paid` | Client |
| Payment received | `invoice.paid` | You |
| Invoice reminder / overdue | Manual button or daily cron | Client |
| Project update posted | Admin posts an update with "Email client" checked | Client |
| Milestone completed | Milestone → done | Client (respecting prefs) |
| Weekly summary | Monday cron: hours logged last week per project | Client (opt-out) |
| Timer still running | Cron: timer > 8h | You |
| New client request / "files uploaded" | Portal action | You |

All templates share one branded layout: dark `#141416` background, gold wordmark "Luke.", clay-style card, gold gradient CTA button, plain-text fallback, and an unsubscribe link for non-essential emails.

---

## 9. File storage integration (FileBrowser)

- **Portal → Files page:**
  - A clay card titled "Secure file storage" and a gold **Open file storage ↗** button to `https://storage.lukebaber.com` (new tab, `rel="noopener"`).
  - Their username (`clients.storage_username`) with a copy button.
  - Short instructions plus an accordion FAQ (file size limits, supported types, "forgot your storage password? contact Luke").
- **"I've uploaded files"** button → optional note → Resend email to you + `audit_log` entry (and a toast).
- **Admin:** set `storage_username` and optional `storage_path` per client. If `storage_path` is set, deep-link to `https://storage.lukebaber.com/files/<path>`. FileBrowser redirects to login and back — to verify in Phase 0.
- **Future option (not in scope):** single sign-on to FileBrowser via its proxy-auth mode, or migrate uploads into Neon Object Storage with presigned URLs so files show inline in the portal.

---

## 10. Phased implementation

Each phase ends with its acceptance criteria, `npm run lint` + `npm run build` clean, and a browser-preview walkthrough.

### Phase 0 — Accounts, config & spikes *(no UI)*
1. **Neon:**
   - Create a long-lived `dev` branch from `production` (the `neon.ts` TTL applies only to *new* branches created via `neon checkout`, so create `dev` via MCP).
   - Point `.env.local` at `dev`.
   - Update Neon Auth per §6.1 on both branches. Create your admin user and assign the role.
2. **Resend:** add and verify the `lukebaber.com` domain (you add the DNS records I generate) and get SMTP credentials.
3. **Google Cloud:** create an OAuth client (you do this in the console; I give exact redirect URIs) → `add_auth_oauth_provider`.
4. **Stripe sandbox:** branding, numbering prefix, payment methods, webhook endpoint for Vercel preview. Install Stripe CLI locally.
5. **Env vars** (local + Vercel): `NEON_AUTH_COOKIE_SECRET`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, `RESEND_FROM`, `APP_URL`. Rename `RESEND_TOKEN` usage consistently.
6. **Spikes** (30–60 min each, results written back into this doc):
   - (a) Google sign-in links to an admin-created user with sign-up disabled.
   - (b) Whether Neon Auth exposes a password min-length setting.
   - (c) FileBrowser `/files/<path>` deep-link survives login.
   - (d) Neon Auth `send.magic_link` webhook payload for admin-triggered reset.

**Done when:** you can sign in as admin via API on `dev`, a Resend test email lands from `lukebaber.com`, and a Stripe test customer exists in the sandbox.

### Phase 1 — Design foundation & header change
1. Write **`styles.md`** (§5.1).
2. Token rename + shadcn semantic tokens (§5.2). Fix the four minor class bugs. Visual regression pass on all 5 marketing pages.
3. Update `components.json`; add the shadcn components from §5.2; install the transitions.dev skills.
4. Route groups: move marketing pages to `app/(site)/` with Header, `GitHubCommitBG`, and `template.tsx`. Root layout keeps fonts only.
5. **Header:**
   - Desktop nav becomes Home · Services · Resume · Work · **Contact**.
   - The right button is **Client Login** (`goldOutline`, lock icon) → `/login`. When a session exists it becomes **Portal** (gold `default`) → `/portal` or `/admin` by role, via a small server component reading the session.
   - Mobile sheet gets the same Login/Portal button under the links.

**Done when:** marketing site looks identical except the header change, and `styles.md` is committed.

### Phase 2 — Authentication
1. Install `@neondatabase/auth`; add `lib/auth/server.ts`, `lib/auth/client.ts`, `app/api/auth/[...path]/route.ts` (with policy wrapper), `proxy.ts` matcher for `/portal`, `/admin`, and the auth pages.
2. Auth pages (`(auth)` group): login (email+password, Google, error shake, `?next=` redirect), forgot/reset password, accept-invite, verify-email (input-otp).
3. `lib/validation/password.ts` + `PasswordField` with checklist, strength meter, and HIBP check. Vitest tests for the policy.
4. `lib/auth/guards.ts`: `getSession`, `requireUser`, `requireAdmin`, `requireClient` (resolves membership).
5. Neon Auth webhook route → branded OTP / reset emails.
6. Placeholder `/portal` and `/admin` pages proving guards (client can't open `/admin`; admin can open both).

**Done when:** you and a seeded test client can log in with password and Google, reset a password, a weak password is rejected everywhere, and route protection holds.

### Phase 3 — Database & admin core (clients, projects)
1. Drizzle setup (`lib/db`, `drizzle.config.ts`, schema §4.3), first migration tested on `dev` via Neon MCP migration tools.
2. `lib/dal/clients.ts`, `projects.ts` with authorization built in; `audit_log` helper.
3. Admin shell: shadcn `sidebar` (Dashboard, Clients, Projects, Time, Invoices, Requests, Settings), breadcrumb, avatar menu, `loading.tsx` skeletons.
4. Clients: data table, **New client** dialog (→ Stripe customer + invite email), client detail with tabs, archive.
5. Projects: CRUD, status select, progress slider, milestones (add/reorder/complete), **Post update** (markdown, optional email).
6. Settings page: default rate, rounding, terms, timezone.

**Done when:** you can create a client (invite email arrives, Stripe customer exists), create projects/milestones, and post an update.

### Phase 4 — Time tracking
1. `lib/dal/time.ts` + `lib/billing/(rates|rounding|totals).ts` with Vitest coverage (rate precedence, rounding modes, midnight/DST spans, one-running-timer rule).
2. **TimerBar** in admin top bar:
   - Clock in → client/project combobox (`command`), with server-authoritative `started_at`.
   - Live counter.
   - Clock out → panel reveal with required description + billable toggle. Rate snapshot at save.
   - Keyboard shortcut `T`; switch-project flow.
3. Time page: week view (days × projects grid with totals) + list view (data table with filters), manual entry dialog, edit/split/delete (blocked once invoiced), bulk mark non-billable.
4. Admin dashboard v1: timer, hours this week (chart), unbilled amount, active projects.
5. Cron `timer-alerts` (hourly): timer > `long_timer_alert_hours` → email you.

**Done when:** a full clock-in → clock-out cycle with description appears correctly in the timesheet with the correct $ value, and a refresh or browser close doesn't lose a running timer.

### Phase 5 — Client portal
1. Portal shell: sidebar (Overview, Projects, Hours, Invoices [badge], Files, Requests, Settings), mobile bottom-sheet nav, client name + avatar.
2. Overview: greeting, KPI tiles (active projects, hours this month, outstanding balance + Pay, next milestone), project cards, activity feed (updates, completed milestones, time entries, invoices).
3. Project detail: status stepper, progress bar, hours used vs budget, milestones timeline, updates feed, time log for the project.
4. Hours: month switcher (tabs sliding), grouped-by-project table, totals, CSV export.
5. Files page (§9) + "I've uploaded files" notify.
6. Requests: submit form (service type from your services list) → email you; admin Requests inbox with status and "Convert to project".
7. Settings: name, password change (policy), Google link/unlink, sessions list/revoke, email preferences.
8. Empty states everywhere ("No invoices yet — you're all squared up ✨").
9. Admin "View as client" impersonation banner.

**Done when:** a seeded client sees only their own data (verified by trying another client's IDs in URLs → 404), and all pages work at 375px.

### Phase 6 — Stripe invoicing & receivables
1. `lib/stripe/*`, webhook route with idempotency, invoice mirror upserts.
2. Invoice builder (`/admin/invoices/new`): client picker → unbilled entries grouped by project with checkboxes and date range → ad-hoc line items → live totals → Create draft → review → Finalize & send.
3. Invoice detail (admin): timeline (created/sent/viewed?/paid), actions: copy pay link, remind, void (releases entries), mark paid out-of-band, open in Stripe.
4. AR dashboard: KPI tiles, aging chart, filterable table.
5. Portal invoices: list + detail (line items → accordion of time entries), **Pay** → `hosted_invoice_url`, PDF download, paid confetti-free success state.
6. Cron `invoice-reminders` (daily 9am CT): mark overdue, email per policy.
7. End-to-end test in sandbox: pay with test card `4242…`, ACH test account, failed card `4000 0000 0000 0341`, void flow, out-of-band payment. Cross-check DB ↔ Stripe via Stripe MCP.

**Done when:** time → invoice → client pays → both sides show *Paid* within seconds, and voiding returns hours to unbilled.

### Phase 7 — Notifications & digests
1. Finish all React Email templates (§8) with a shared layout; preview route in dev only.
2. Email preference toggles (portal Settings) respected by senders.
3. Weekly summary cron (Monday 8am CT).
4. Resend webhook (optional) → mark bounced addresses in admin.

### Phase 8 — Polish, QA, launch
1. Motion pass using the §5.3 map; `prefers-reduced-motion` check.
2. Accessibility pass (keyboard-only navigation of timer and invoice builder, focus management in dialogs, contrast, screen-reader labels on status badges).
3. Run `security-review` + `code-review` skills; fix findings.
4. Performance: `inspect_database` checks, add indexes (`time_entries(project_id, started_at)`, `time_entries(invoice_id)`, `invoices(client_id, status)`, `client_members(user_id)`).
5. Optional PostHog: pageviews + key events (`invoice_viewed`, `invoice_pay_clicked`, `request_submitted`), no PII, replay masked.
6. **Go-live checklist:**
   - Activate the Stripe live mode on the Luke Baber account → live keys + live webhook.
   - Neon Auth production settings (§6.1, localhost off).
   - Google OAuth consent screen published.
   - Vercel production env vars + crons.
   - Neon snapshot schedule on `production`.
   - Invite your first real client.
7. Update `styles.md` + README (portal section, env var list, runbooks: "how to invoice", "how to rotate keys").

### Phase 9 — Future ideas (post-launch backlog)
- **Retainers / maintenance plans:** Stripe Subscriptions for monthly hosting and maintenance, shown in the portal.
- **Fixed-price deposits:** "50% upfront" invoice auto-generated when a fixed-price project is accepted.
- **Estimates / proposals:** send a quote the client can **Approve** in the portal, which converts it to a project.
- **Client approvals:** "Awaiting your review" milestones with Approve / Request changes buttons.
- **Uploads inside the portal:** Neon Object Storage + presigned URLs, attached to projects.
- **3D printing orders:** material/color/quantity form with STL upload and auto-quoted line items.
- **Budget alerts:** email when a project hits 80% of budget hours.
- **Profitability report:** effective hourly rate per project and client, revenue by service type.
- **AI assist** (Neon AI Gateway): draft weekly update emails from the week's time-entry descriptions for you to edit and send.
- **MFA** for the admin account when Neon ships it.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Neon Managed Better Auth is **beta** | Keep auth behind `lib/auth/*` so the app depends on our guards, not SDK specifics. Verify spikes in Phase 0 |
| Double-billing or lost time | Invoiced entries immutable. Invoice creation is Stripe-first-then-DB with compensation. Idempotency keys. Unit-tested billing math. Void releases entries |
| Webhook missed or out of order | Idempotent handlers that re-fetch the invoice from Stripe instead of trusting event payload order. Admin "Resync from Stripe" button |
| Using the wrong Stripe account | Single `lib/stripe/client.ts` built from env keys. MCP calls pinned to `acct_1UEt0D2OQjSKrfOF`. A startup assertion logs the account name in dev |
| Client sees another client's data | All reads through DAL scoped by membership. Phase 5 includes explicit cross-tenant URL tests |
| Neon free plan limits (0.5 GB/branch, scale-to-zero cold starts) | Data volume is tiny. The cold start is a few hundred ms on first request; acceptable (upgrade if it bothers you) |
| Email deliverability | Verified domain with SPF/DKIM/DMARC. Transactional-only content. Resend logs monitored via MCP |
| Marketing site regressions from token rename | Mechanical rename in one commit + page-by-page screenshot comparison in browser preview |

---

## 12. Decisions I need from you (defaults in **bold** — I'll use these unless you say otherwise)

1. **Portal URL:** **`lukebaber.com/portal` and `/admin` (same app)** vs a `portal.lukebaber.com` subdomain.
2. **Invite-only accounts** (public sign-up disabled): **yes**.
3. **Default payment terms:** **Net 15**. Card + ACH enabled: **yes**.
4. **Time rounding on invoices:** **none (bill exact minutes)**, or 6-min / 15-min increments.
5. **Clock-out description required:** **yes**.
6. **Clients see non-billable entries** (labelled "No charge"): **yes** — shows goodwill.
7. **Weekly summary email to clients:** **on by default, client can opt out**.
8. **Who emails invoices:** **Stripe sends the invoice + receipts; our Resend email adds a portal notification**.
9. **Header button label:** **"Client Login"** (vs "Login" / "Portal").
