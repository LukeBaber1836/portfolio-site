# styles.md — portfolio-site design system

> Single source of truth for styling. **Every PR that changes styling updates this file.**
> Tokens live in `app/globals.css` (`@theme`); motion tokens in `app/transitions.css` (`:root`).
> Marketing pages: `app/(site)/`. App shells (portal/admin/auth): `app/portal/`, `app/admin/`, `app/(auth)/`.

---

## 1. Brand tokens

| Token (Tailwind class) | Value | Use |
|---|---|---|
| `background` | `#141416` | Page background everywhere |
| `card` | `#27272c` | Cards (`ui/card`, auth cards) |
| `popover` | `#1b1b1f` | Dropdowns, tooltips, table rows on dark |
| `secondary` / `muted` | `#232329` | Secondary surfaces, muted fills |
| `accent` / `primary` | `#f3d076` | Gold: primary actions, active states, focus rings |
| `accent-hover` (`--color-accent-hover`) | `#00b4c8` | Cyan hover (links, icon buttons) — **not** a text color |
| `foreground` | `#fff` | Primary text |
| `muted-foreground` | `rgba(255,255,255,.6)` | Secondary copy (`text-white/60`). Minimum for body text |
| `border` / `input` | `rgba(255,255,255,.1)` | Borders, input borders (`border-white/10`) |
| `ring` | `#f3d076` | Focus rings (`ring-accent/…`) |
| `destructive` | `#fb7185` | Danger text/borders/fills (aliased as `danger`) |
| Gold ramp | `#aa771c` (`gold-d2`) → `#bf953f` (`gold-d1`) → `#f3d076` (accent) → `#fbf5b7` (`gold-l2`) → `#fcf6ba` (`gold-l1`) | Gold gradient recipe (buttons, tabs pill, wordmark) |
| `sidebar` | `#18181b` | App sidebar; `sidebar-border` white/6, active item `text-accent` on white/6 |

**Gold gradient recipe** (primary buttons, wordmark): `linear-gradient(135deg, #bf953f, #fcf6ba 55%, #aa771c)`.
In Tailwind: `bg-gradient-to-bl from-gold-d1 via-gold-l1 to-gold-d2`.

**Type:** JetBrains Mono (`font-primary`) everywhere. Scale: `.h1` 48px/xl:80px (marketing only),
`.h2` 36px/xl:48px, `.h3` 20px/xl:24px. App pages use `PageHeader` (2xl/xl:3xl title, `sm` description).

**Radius:** `0.75rem` (`--radius`). Cards `rounded-2xl`, inputs/buttons `rounded-xl`, pills `rounded-full`.

**Breakpoints** (custom, not Tailwind defaults): `lg` 960px, `xl` 1200px. `sm` 640, `md` 768 unchanged.
Marketing container caps at 1200px at all sizes ≥1200px.

**Note (token rename, Phase 1):** the old `primary = #141416` background token was renamed to `background`;
`primary` is now gold `#f3d076` with `primary-foreground #141416`. `secondary` is the `#232329` surface.
`~50 text-accent` usages were untouched. shadcn `components.json`: `new-york`, `cssVariables: true`.

---

## 2. Elevation (claymorphism)

| Class | Use |
|---|---|
| `.clay` | Static cards (`ui/card`'s `Card`, auth cards). Puffy light/dark shadows |
| `.clay-glow` | Interactive gold glow on hover (primary buttons). Glow layer is always present at 0 alpha so it fades instead of snapping |
| `.clay-hover` | Icon buttons — no elevation at rest, puffy shadow on hover |

**Caveat:** never declare `transition` inside these classes — every consumer already carries Tailwind's
`transition-all`, and a second shorthand would clobber it to `box-shadow` only (documented in `globals.css`).

---

## 3. Components

- **Button** (`components/ui/button.tsx`): `default` = gold gradient pill + `clay-glow`;
  `goldOutline` / `iconOutline` = accent border, fills gold on hover; `destructive`, `outline`, `secondary`,
  `ghost`, `link`. Effects: `shineHover` (primary CTAs, incl. header), `ringHover`, `shine`, `underline`.
  Sizes: `default h-10`, `sm`, `lg h-11`, `icon`, `icon-sm`.
- **Inputs** (`components/shared/FormField.tsx` + skinned `ui/input|select|textarea`): 44px (`h-11`),
  `rounded-xl`, `border-white/10`, `bg-background`, `focus:border-accent` + `ring-accent/15`.
  All form selects use the shared `FieldSelect`/`FieldSelectItem` (`shared/FieldSelect.tsx`, Radix `ui/select`
  + popover) — never native `<select>`, whose OS chrome breaks the theme. Item highlight is white/10 + gold text.
- **Dark-OS guardrail:** the app is dark-only and `dark:` Tailwind variants key off the OS setting, so stock
  shadcn `dark:`/`slate-*` classes were purged from `ui/*` (select, tooltip, sheet, tabs, alert-dialog,
  input-otp, scroll-area). Never add `dark:` or `slate-*` classes — this codebase has no light theme.
  Labels: uppercase 12px `text-white/60`. Errors: danger border + shake + `role="alert"` message.
  Date inputs add `[color-scheme:dark]`. `NativeSelect` has a custom chevron, options on `bg-popover`.
- **Tabs:** marketing `ui/tabs` active = gold gradient; app sliding tabs = `SlidingTabs` — selected tab is a recessed gold-outline pill (transparent fill, gold border, gold text), slightly smaller than the bar, gliding between segments.
- **Nav:** desktop active link `text-accent border-b-2`; sidebar active item `text-accent` on white/6 + gold spine.
- **Breadcrumb** (`components/ui/breadcrumb.tsx`, auto-derived in `AppShell` topbar, hidden on mobile):
  links `text-white/50 hover:text-accent`, current page white semibold. ID segments render as "Details".
- **Dialogs/Sheets/Dropdowns/Popover/Command/Avatar/Skeleton/Progress/Separator/Table/Tooltip/InputOTP/Sonner/Sidebar/ScrollArea/AlertDialog/Label:** shadcn, skinned to brand (cards get `clay`, focus rings accent).
- **Badge** (`ui/badge`): `info`/`attention`/`success`/`danger`/`neutral` tone variants matching §6 + `StatusBadge`/`statusBadgeFor` helpers — icon + label always, never color-alone.
- **Card** (`ui/card`): `Card` is `clay rounded-2xl bg-card`; `CardHeader` (border-b row) + `CardTitle`/`CardDescription`/`CardAction` + `CardContent` (defaults `p-5`). All portal/admin sections use these directly.
- **Switch** (`ui/switch`, Radix): gold gradient when on; composed with `Label` (+ description `<p>`) at call sites.
- **Checkbox** (`ui/checkbox`, Radix): gold checked state, keeps the `t-check` draw animation; `checked="indeterminate"` for select-all headers; `disabled` for readonly indicators (password checklist).
- **Calendar** (`ui/calendar`, react-day-picker) + shared `DatePicker` (`shared/DatePicker.tsx`: popover + calendar for `yyyy-MM-dd` string state, optional `max`). Used for milestone due dates, project start/due, manual entry date.
- **LinkPreview** (`ui/link-preview`, Aceternity): hover screenshot previews for client reference links.
  Dark-clay skinned (gold underline trigger, clay tooltip). Always `isStatic` with the screenshot URL stored
  on the row at send time — never live-resolve on hover (Microlink rate limits, outages, auth-walled links).
  No screenshot → plain link (touch + fallback safe).
- **Custom instead of shadcn (deliberate):**
  - `PageHeader` — page-title layout block, no shadcn equivalent.
  - `FormField` + `TextInput`/`TextArea`/`NativeSelect` — kept by decision (2026-09-13): shadcn `form` requires react-hook-form, i.e. a ~15-form rewrite. Revisit as a gradual migration (login + request form first).
  - Hand-rolled `WeeklyHoursChart` — kept by decision (2026-09-13): no recharts dep (~100kb) for one chart.
  - `SlidingTabs` — sliding-pill behavior beyond static `ui/tabs`.
  - `Disclosure` — accordion on `t-acc` motion tokens.
  - `UploadDropbox` (`components/portal/UploadDropbox.tsx`) — portal file upload. Three numbered steps
    (`bg-accent/10` number chip): project `FieldSelect` → kind cards (`role="radio"`; selected = `clay` +
    `border-accent/70` + gold icon, idle = `border-white/10 bg-background/40`) → dashed `border-2` dropzone
    (`rounded-2xl`; drag-over = `border-accent bg-accent/[0.06] scale-[1.01]`; inert until a kind is picked,
    shakes via `t-input is-shaking`). Upload rows: `divide-white/5` list, `Progress h-1.5`, `SuccessCheck` when done,
    danger text + Retry on failure. No shadcn dropzone exists.
  - Time inputs stay native `type="time"` (styled dark); no time-picker primitive.
- **Tables:** `bg-[#1b1b1f]` rows, `border-white/5` dividers, sticky header, `tabular-nums`, right-aligned money.

---

## 4. Motion (marketing)

- Route change: `app/(site)/template.tsx` 0.75s fade. Stagger patterns: Socials, GitHub grid.
- `app-enter` keyframe (routes in app shells): 250ms slide-up 8px + blur, `both` fill.

## 5. App density (portal/admin/auth)

- Base text 14–15px; headings via `PageHeader` (never marketing `.h1`).
- 4px spacing grid; content `max-w-[1200px]`; sidebar 260px, collapsible to icons.
- Topbar: sidebar trigger + divider + breadcrumb + right-aligned `topbar` slot (TimerBar in admin).
- Cards: `ui/card`'s `Card`; KPI tiles: clay + `AnimatedNumber` pop-in.

## 6. Semantic status colors

Gold is the accent, so **warning/attention is gold but "in progress" is cyan** — never use gold for warnings.

| Meaning | Token | Use |
|---|---|---|
| Info / in progress | cyan `#00b4c8` (`info`) | Project in progress, running-timer pulse |
| Due / attention | gold `#f3d076` (`accent`) | Open invoice, awaiting review |
| Success | emerald `#34d399` (`success`) | Paid, completed, milestone done |
| Danger | rose `#fb7185` (`danger`/`destructive`) | Overdue, failed payment, errors |
| Neutral | white/40 on white/5 | Draft, planned, void, archived |

Badges: `rounded-full` pill, tinted bg at ~10%, 1px border at ~30%, icon + label always.
Status maps live in `lib/status.ts` (`*_STATUS` + `serviceLabel`); render via `statusBadgeFor`.
Chart slots: `--color-chart-1 #b8872c` (billable/gold), `--color-chart-2 #0098aa` (cyan) — validated for `#27272c` via the dataviz palette validator; see §7 before adding slots.

## 7. Data display

- Tables as §3. KPI tiles: clay + big `AnimatedNumber`.
- Charts: follow the `dataviz` skill. Single series = gold ramp; categorical = status palette (§6).
  Every chart ships an equivalent sr-only `<table>` (see `WeeklyHoursChart`).
- Money: `formatMoney` (cents → `$x.xx`), hours: `formatHours`/`formatDuration`, dates in `America/Chicago` (`lib/format.ts`).

## 8. Motion (app)

- 150–250ms UI state changes, 300–400ms panels/modals; `ease-out` enter, `ease-in` exit.
- Tokens + recipes in `app/transitions.css` (transitions.dev, pasted verbatim; brand overrides at bottom).
- Recipe map: text/icon swap → timer button + login password toggle; number pop-in → timer digits, KPI tiles, invoice totals;
  panel reveal → clock-out panel, invoice summary; modal open/close → dialogs; toasts → Sonner;
  success check → submit buttons + finished uploads; error shake → login + all `FormField`s + upload dropzone; checkbox check → invoice builder + password checklist;
  tabs sliding → client tabs + Hours month switcher; notification badge → sidebar counts; dropdown morph → avatar/row menus;
  skeleton → `loading.tsx`; accordion → invoice line items + Files FAQ; toggle → billable + email prefs;
  page side-by-side → auth flows + `.app-enter` route transitions.
- `prefers-reduced-motion`: every recipe has a fallback (opacity only / none). Marketing fade included.

## 9. Accessibility

- WCAG AA: gold on `#141416` passes; body copy ≥ `text-white/60`.
- Focus: `ring-2 ring-accent/60` (buttons `ring-ring`), sidebar items `focus-visible:ring-accent/50`.
- Touch targets 44px on mobile (`h-11` inputs, `h-10+` buttons; `icon-sm` is desktop-table only).
- Badges carry icon + text; charts have sr-only tables; dialogs trap focus (Radix); checkboxes/switches are Radix with `aria-label`s.

## 10. Transactional email (Resend + React Email)

- Single layout `lib/email/templates/BaseEmail.tsx`, copy in `lib/email/messages.ts`. Dark-only by design.
- Rules that keep it dark in every client (Gmail dark mode full-inverts dark emails — this is the reported bug class):
  - `<meta name="color-scheme" content="dark only">` + `supported-color-schemes`.
  - Gmail blend sandwich: `<Body className="body">` + `.gmail-blend-screen` / `.gmail-blend-difference` divs
    around all content, with the `u + .body` CSS rules (Gmail-only targeting). Harmless elsewhere.
  - Every structural background is BOTH a flat color (`bgcolor` attr + `background-color`) AND a solid-color
    `linear-gradient` `background-image` — Gmail preserves the gradient while inverting the flat color.
  - `[data-ogsc]` / `[data-ogsb]` + `@media (prefers-color-scheme: dark)` rules re-assert the palette via
    `.em-*` classes (`!important`) for Outlook apps / Outlook.com / Apple Mail.
  - Hex colors only; never pure `#000`/`#fff` (off-dark `#141416`, off-whites invert less where hacks don't reach).
  - Table-based layout, inline styles, clay bevel via borders (box-shadow where supported).
- No emojis in subjects, headings, or body copy. Preview route (dev only): `/api/dev/email-preview`.

## 11. Anti-pattern guardrails (no AI-slop look)

Check new UI against this list before shipping:
- No purple/blue gradients, no Inter/system fonts — gold ramp + JetBrains Mono are the brand.
- No emojis in UI copy or email. Arrows (`→`) and Lucide icons only.
- No lorem/placeholder copy, no "delve / game-changer / revolutionize / unlock / cutting-edge" marketing filler.
- No generic icon-title-description card grids with interchangeable copy — every card shows real data.
- Status never by color alone (icon + label). Motion from `transitions.css` tokens, not ad-hoc durations.
