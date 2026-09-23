# Architecture — بوابة التدريب

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres 17, Auth, Storage, pg_cron).
Arabic, RTL-first (`<html lang="ar" dir="rtl">`). Figma file `xJo3iXyJRn6ZyxdT7rKuNP` is the source of truth for UI.

## Layers

```
Browser ──► proxy.ts (session refresh + coarse auth redirects)
        ──► Server Components (pages/layouts)  ──► src/lib/data/*  (read: typed Supabase queries, RLS applies)
        ──► Server Actions (src/**/actions.ts)  ──► Postgres RPCs (write: business rules, SECURITY DEFINER)
                                               └─► direct table writes only for owner-scoped rows (RLS-checked)
        ──► Client Components only where interaction needs it (forms, popovers, player, uploads)
```

- **Reads** happen in Server Components through `src/lib/data/<area>.ts` (`import "server-only"`). Each module returns
  view models (`src/types/views.ts` or local types) — components never see raw rows.
- **Writes** go through Server Actions (`"use server"`), validated with Zod (`src/lib/validation/*`) and executed
  as the signed-in user. Anything with a business rule (enrollment, payment, withdrawal, waitlist, refunds, quizzes,
  progress, certificates, conversations) is a Postgres function in `supabase/migrations/*_rpc.sql` and is called via
  `supabase.rpc(...)`. The database is the single place those rules are enforced.
- **Errors**: RPCs raise `P0001` with a machine code in the message (e.g. `course_full`). `src/lib/errors.ts` maps codes
  to Arabic copy; raw errors never reach the UI.
- **Auth**: Supabase Auth (email + password, email OTP/links). `src/proxy.ts` refreshes the session cookie and redirects
  anonymous users away from protected prefixes. `requireUser()` / `requireTrainee()` (`src/lib/auth.ts`) are the
  authoritative checks at the top of pages; RLS is the last line of defence.
- **Authorization**: workspaces (`user_workspaces`: trainee, trainer, provider, studio, requester, admin) + organization
  membership. RLS helpers: `is_admin()`, `is_org_member(org)`, `manages_course(course)`, `is_enrolled(course)`,
  `is_conversation_member(conv)`.
- **Secrets**: only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` are used by
  the app. `SUPABASE_SERVICE_ROLE_KEY` is only for the future payment webhook (server-only, never imported in client code).

## Folders

```
src/
  app/
    (auth)/            login, register, verify-email, forgot-password/* + actions.ts   (PUB-AUT-*)
    (workspace)/       signed-in shell (sidebar + top bar) — layout.tsx loads user + counts
      trainee/…        trainee workspace (TRN-*)
      notifications/   GEN-NOT-01 · messages/ GEN-MSG-* · account/ GEN-ACC-01
    courses/[slug]     public course sale page (TRN-CRS-06), SEO metadata
    checkout/…         enrollment + payment (TRN-ENR-*)
    verify/…           public certificate verification (PUB-VRF-*)
    select-workspace/  PUB-CTX-01 · onboarding/ TRN-ONB-*
    auth/confirm       e-mail link handler
  components/
    ui/                design-system primitives (Figma DS page 54:2)
    layout/            AppShell, Sidebar, TopBar, AccountMenu, nav
    course/            CourseCard, CourseCover, ModeBadge, SourceChip
    auth/ dashboard/ … feature components
  lib/
    supabase/          server.ts (per-request, RLS) · client.ts (browser, uploads only) · cookies.ts
    data/              server-only read models per area
    actions/           shared server actions (notifications…)
    validation/        Zod schemas with Arabic messages
    auth.ts env.ts errors.ts format.ts labels.ts storage.ts
  types/database.ts    generated from Supabase (do not edit by hand)
  types/views.ts       view models shared across screens
supabase/migrations/   ordered SQL migrations (applied to the project in this order)
```

## UI conventions (Figma → code)

- Tokens are CSS variables in `src/app/globals.css` (`TG · Semantic` Light/Dark). Use token classes only:
  `bg-bg-page`, `bg-bg-surface`, `text-text-primary|secondary|muted|brand`, `border-border-default|divider`,
  `bg-action-primary`, `text-state-success` … Never hard-code hex values in components.
- Type styles: `type-display (48/700) · type-h2 (26/700) · type-h3 (20/500) · type-title (19/700) · type-h4 (18/500) ·
  type-body-lg (18) · type-body (17) · type-subtitle (16/500) · type-button · type-small (15) · type-caption (14)`.
- Radii `rounded-8|12|16|22`, shadows `shadow-card`, `shadow-float`, `shadow-hero`.
- Icons: the Figma icon library is Lucide. Use `<Glyph icon={X} size={16|20|24|32} />` from `components/ui/Icon`
  (absolute stroke 1.25/1.4/1.5/1.75 per the Figma variables); colour with `text-*` classes.
- Primitives: `Button`/`ButtonLink` (variant primary|accent|secondary|outline|ghost|text|danger, size s|m|l, loading),
  `Input`, `PasswordInput`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Toggle`, `Alert`, `EmptyState`, `Spinner`,
  `Skeleton`, `Modal`, `useToast()`, `Badge`, `Avatar`, `Progress`, `Card`, `Tabs`, `Breadcrumb`, `Pagination`,
  `RatingStars`, `Countdown`, `SectionHeader`.
- Every workspace page renders `<TopBar title subtitle />` then `<PageBody>…</PageBody>`.
- RTL: use logical utilities (`ps-/pe-/ms-/me-/start-/end-`, `text-start`); "next" chevrons point left (`ChevronLeft`).
- Numbers/dates: always through `src/lib/format.ts` (Arabic-Indic digits, Gregorian months, Asia/Riyadh, «ر.س»).
- Dynamic pages provide `loading.tsx` (Skeleton/Spinner), an empty state (`EmptyState`) and `error.tsx`.
- Forms: `useActionState` + server action returning `FormState` (`status`, `message`, `fieldErrors`, `values`);
  inline field errors, an `Alert` for form-level errors, `loading` on the submit button, success = redirect or toast.
- Every state-changing button explains its outcome (BR-U2) — helper text or a confirmation `Modal`.

## Business rules → where they live

| Rule | Enforcement |
|---|---|
| BR-L1 program version frozen per course | `program_versions` (immutable trigger) + `courses.program_version_id` guard |
| BR-L3 price locked after first paid enrollment | `guard_course_price` trigger, `settle_payment` sets `price_locked_at` |
| BR-L7 15-minute seat hold | `start_enrollment` (row lock), `course_seats_taken`, `expire_stale_holds` (pg_cron every minute) |
| BR-L9 refund after certificate needs admin | `request_refund` sets `requires_admin` |
| BR-L10/L11 progress = watched lessons, recomputed on new content | `record_lesson_progress`, `course_progress` |
| BR-L12 no double charge + receipt per payment | `payments.idempotency_key` unique, one in-flight payment per enrollment, `receipts` |
| BR-R1 messages to provider team for provider courses | `start_conversation` |
| BR-R2 certificate issued in provider's name | `certificates.issuer_organization_id`, `issue_certificate` |
| BR-R3 split rating axes | `course_ratings` (content/trainer/organization) |
| BR-S3 account deletion blocked by commitments | `account_deletion_blockers`, `freeze_account` |
| BR-U3 purchase survives sign-up | checkout routes pass `next=/checkout/...` through register/verify |
| VAT 15% exclusive (Figma TG · Configuration) | `quote_enrollment`, `enrollments.vat_amount`, receipts |
