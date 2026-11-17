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

## 2. App surfaces (admin / portal / auth) — flat, 2026-11 redesign

The app shells dropped claymorphism for a flat Linear/Vercel/Stripe-style system. **Separation comes from
lightness steps and 1px hairlines, never shadows.** Claymorphism (`.clay*`, gold gradients) is now
**marketing-site only** (`app/(site)/`, `components/*.tsx`).

| Token | Value | Use |
|---|---|---|
| `sunken` / `sidebar` | `#0f0f11` | Sidebar, behind the inset content panel |
| `background` | `#141416` | Content panel / page |
| `surface` | `#18181b` | Panels, tables, stat strip, cards |
| `surface-2` | `#1d1d20` | Hover on a surface |
| `surface-3` | `#232327` | Pressed/selected |
| `popover` | `#1a1a1d` | Dialogs, menus, tooltips, toasts |
| `line` / `line-strong` | white 7% / 12% | Hairline borders / outline buttons |
| `fg-2` / `fg-3` | `#a0a0a8` / `#6c6c74` | Secondary / tertiary text |
| `accent-strong` | `#f7dc97` | Primary button hover |

- **Radius:** `--radius` 0.5rem → `rounded-md` 6px controls/badges, `rounded-lg` 8px panels/tables, `rounded-xl` 12px dialogs. Nothing above 12px in the app.
- **Shadow:** only overlays (`0 16px 48px rgba(0,0,0,.5)`). Backdrops `black/60`, no blur.
- **Brushed gold:** every solid gold surface uses the `gold-brushed` utility (globals.css): brushed-metal gradient +
  fine grain + a soft glare, all as background layers (works with variants, e.g. `data-[state=checked]:gold-brushed`).
  The glare follows the pointer via the shared `<GoldLight />` (mounted in `AppShell` and the auth layout), which eases
  `--gx/--gy/--gnear/--ga` per on-screen element (offset measured against the element's own size, so sweeping across a button
  sweeps the light) and sleeps when idle. No timed sweep. Touch = static; reduced motion = tracks instantly, no easing.
  Gold buttons also get `gold-ring`: a subtle reflective 1px metal rim (one soft conic highlight that turns to face the
  pointer via `--ga`). The rim angle eases slower than the glare, along the shortest arc, and holds its heading while the
  pointer is near the element's centre, so sweeping across never flips it. Easing is time-based (same feel at any refresh rate).
  `Progress` is gold by default; pass `indicatorClassName` (e.g. `bg-danger`) to replace the fill. Tiny status dots stay flat `bg-accent`.
- **Gold is for:** the one primary action per view, focus rings, checked controls, progress fills, the running-timer dot, the main chart series, dropzone drag-over. **Not** for nav active state, headings, icons, borders, tabs, hovers, or table links.
- **Type:** 13px body, 12px meta/labels (sentence case, `fg-2`), page title 20px/600, section title 14px/600, stat values 24px/500 tabular. No uppercase-tracked eyebrows.

## 3. Components

- **Button** (`components/ui/button.tsx`): app variants `default` (flat gold, one per view), `outline`, `secondary`,
  `ghost`, `destructive`, `link`; sizes `default h-9`, `sm h-8`, `lg h-10`, `icon`, `icon-sm`. Marketing-only variants
  `brand` (old gold-gradient pill), `goldOutline`, `iconOutline` keep the clay look and original sizing via compound variants.
- **App page building blocks** (`components/shared/`): `PageHeader` (title + `meta` " · " line + `back` link + actions;
  replaces the old auto-breadcrumb), `PageTabs` (detail-page underline tabs with counts), `SlidingTabs` (small segmented
  filter), `StatStrip`/`Stat` (one container split by hairlines — never a grid of KPI cards), `SectionHeader`/`SectionLink`,
  `PropertyList`/`Property`/`RailSection` (Linear-style right rail, no card chrome), `AttentionList` ("Needs attention" /
  "To do" rows: dot + sentence + action; one line "All caught up." when empty), `EmptyState` (one line, optional action, no illustration).
  Admin `ProjectsList` = project rows; portal `ProjectCard` = flat card.
- **Inputs** (`components/shared/FormField.tsx` + skinned `ui/select`, `DatePicker`, `TimePicker`): 36px (`h-9`),
  `rounded-md`, `border-white/[0.08]` (`/[0.14]` hover), `bg-white/[0.03]`, focus `border-accent/50` + 3px `ring-accent/15`.
  All form selects use the shared `FieldSelect`/`FieldSelectItem` (`shared/FieldSelect.tsx`, Radix `ui/select`
  + popover) — never native `<select>`, whose OS chrome breaks the theme. Item highlight is white/10 + gold text.
- **Dark-OS guardrail:** the app is dark-only and `dark:` Tailwind variants key off the OS setting, so stock
  shadcn `dark:`/`slate-*` classes were purged from `ui/*` (select, tooltip, sheet, tabs, alert-dialog,
  input-otp, scroll-area). Never add `dark:` or `slate-*` classes — this codebase has no light theme.
  Labels: 12px sentence case `text-fg-2`. Errors: danger border + shake + `role="alert"` message.
  Date inputs add `[color-scheme:dark]`. `NativeSelect` has a custom chevron, options on `bg-popover`.
- **Tabs:** marketing `ui/tabs` active = gold gradient. App: `PageTabs` (underline, white) for sections; `SlidingTabs` for filters — hairline well, flat white/8% chip gliding between segments, white label.
- **Nav:** marketing active link `text-accent border-b-2`. App sidebar (inset variant, 240px, groups Work/Billing): 32px items, active = white text on white/7%, counts as tertiary numbers (gold dot only when collapsed).
- **Topbar:** 48px, hairline bottom border, sidebar trigger + right slot (TimerBar in admin, client name in portal). The auto-breadcrumb was removed (it could only show "Details" for IDs); `PageHeader.back` carries real names.
- **Dialogs/Sheets/Dropdowns/Popover/Command/Avatar/Skeleton/Progress/Separator/Table/Tooltip/InputOTP/Sonner/Sidebar/ScrollArea/AlertDialog/Label:** shadcn, skinned to brand (cards get `clay`, focus rings accent).
- **Badge** (`ui/badge`): 20px, `rounded-md`. `StatusBadge`/`statusBadgeFor` = neutral chip + 6px tone dot + label (never colour alone); `danger` also tints. Admin project status uses `PROJECT_STATUS_ADMIN` ("Client review").
- **Card** (`ui/card`): flat `rounded-lg border-line bg-surface`; `CardHeader` 48px hairline row, `CardContent` `p-4`. Never nest cards; prefer bare sections + `SectionHeader` and right rails over card stacks.
- **Switch** (`ui/switch`, Radix): gold gradient when on; composed with `Label` (+ description `<p>`) at call sites.
- **Checkbox** (`ui/checkbox`, Radix): gold checked state, keeps the `t-check` draw animation; `checked="indeterminate"` for select-all headers; `disabled` for readonly indicators (password checklist).
- **Calendar** (`ui/calendar`, react-day-picker) + shared `DatePicker` (`shared/DatePicker.tsx`: popover + calendar for `yyyy-MM-dd` string state, optional `max`). Used for milestone due dates, project start/due, manual entry start/end dates.
- **TimePicker** (`shared/TimePicker.tsx`): shadcn has no time primitive, so it's the same popover trigger as `DatePicker`
  (clock icon, 12-hour label) opening hour / minute / AM-PM columns; selected cell uses the calendar's gold gradient.
  `HH:mm` string state, 5-minute `step` by default (off-step values stay listed). Replaces native `type="time"`.
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
  - Site review toolbar (`review-toolbar/`, bundled to `public/review/toolbar.js`) — runs on *client sites* inside a
    shadow root, so it can't use Tailwind; `review-toolbar/styles.css` hand-mirrors the tokens (clay shadow, gold
    gradient pins/buttons, `#1b1b1f` cards, JetBrains Mono). Keep it in sync when brand tokens change. Install
    snippet + checklist live in Admin → Settings → "Site review toolbar".
- **Tables:** the table is the page (bordered `surface` container, no extra card). 36px header (12px `fg-3`, sentence case), 44px rows, `line` dividers, no zebra, whole row clickable, row actions on hover, `tabular-nums`, right-aligned money.

---

## 4. Motion (marketing)

- Route change: `app/(site)/template.tsx` 0.75s fade. Stagger patterns: Socials, GitHub grid.
- `app-enter` keyframe (routes in app shells): 250ms slide-up 8px + blur, `both` fill.

## 5. App density (portal/admin/auth)

- Base text 13px; headings via `PageHeader` (never marketing `.h1`).
- 4px spacing grid; content `max-w-[1200px]` inside an inset panel (8px gutter, hairline border); sidebar 240px, collapsible to icons.
- Topbar: sidebar trigger + divider + breadcrumb + right-aligned `topbar` slot (TimerBar in admin).
- Layout: page header → stat strip → sections (`SectionHeader`), 32px between sections; detail pages = main column + ~280px right rail.

## 6. Semantic status colors

Desaturated and amber-free so nothing competes with the gold brand. Colour lives on a 6px dot; the chip stays neutral.

| Meaning | Token | Use |
|---|---|---|
| Info / in progress | blue `#7aa2f7` (`info`) | Project/milestone in progress |
| Due / attention | gold dot (`accent`) | Open invoice, awaiting review, new request |
| Warning | orange `#ef8a5a` (`warning`) | Budget ≥80%, "fair" password, toast warnings |
| Success | green `#5fb98d` (`success`) | Paid, completed, milestone done |
| Danger | red `#e5686b` (`danger`/`destructive`) | Overdue, failed payment, errors (chip also tinted) |
| Neutral | `fg-3` dot | Draft, planned, void, archived |
Status maps live in `lib/status.ts` (`*_STATUS` + `serviceLabel`); render via `statusBadgeFor`.
Chart slots: `--color-chart-1 #d9b45f` (billable, gold), `--color-chart-2 #4b4b53` (no-charge, neutral gray).

## 7. Data display

- Tables as §3. Stats: `StatStrip` cells with `AnimatedNumber`; colour a value only when it signals something (overdue = danger).
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
- No gradients, glows, inset/puffy shadows, or glassmorphism in the app shells (gold gradient = marketing only). No Inter/system fonts — JetBrains Mono is the brand.
- No icon-in-coloured-circle decorations, no cards inside cards, no pill-shaped containers, nothing rounder than 12px.
- One gold element per region. No uppercase-tracked eyebrows. No helper copy that explains the obvious.
- No emojis in UI copy or email. Arrows (`→`) and Lucide icons only.
- No lorem/placeholder copy, no "delve / game-changer / revolutionize / unlock / cutting-edge" marketing filler.
- No generic icon-title-description card grids with interchangeable copy — every card shows real data.
- Status never by color alone (icon + label). Motion from `transitions.css` tokens, not ad-hoc durations.
