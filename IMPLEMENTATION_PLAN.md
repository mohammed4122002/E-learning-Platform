# Implementation plan

Figma is the single source of truth. The work is split into waves by workspace; each wave ships
real screens backed by the database (no mock data), with loading, empty and error states.

## Wave 1 — Foundation ✅

- Supabase schema for every domain in the Figma flows, RLS on all tables, business-rule RPCs,
  storage buckets, pg_cron hold expiry, search indexes, function privileges.
- Supabase Auth with `@supabase/ssr`: register (email code), login (remember me), forgot / verify /
  new password, logout, `proxy.ts` route protection, workspace selection.
- Design tokens (light + dark) from the TG · Semantic variables; UI kit matching the Figma
  components (Button, Field, Choice, Feedback, Data, Modal, Toast, Navigation, Rating, Stepper…).
- App shell: sidebar, top bar with notifications, account menu, mobile drawer.

## Wave 2 — Trainee workspace

| Area | Screens | Status |
| --- | --- | --- |
| Dashboard | TRN-DSH-01 | ✅ |
| Onboarding | 6 steps + done | ✅ |
| Course sale page + preview | TRN-CRS-06 | ✅ |
| Checkout | TRN-ENR-01/02 review + discount, 03 payment, 04 confirmation, 05 hold summary, 07 receipt | ✅ |
| Trainings & money | list, details, withdraw, refund, dispute, waitlist | agent |
| Learning | player, quiz, assignments, attendance, learning record | agent |
| Engagement | certificates, ratings, favorites, following, help centre | agent |
| Account | profile, settings, notifications, messages, identity verification, terms | agent |
| Discovery | search, program pages, compare | agent |

## Wave 3 — Other workspaces (not started)

Trainer, training provider, studio, requester and admin workspaces. The schema already has the
tables and policies they need (course management, sessions, attendance codes, approvals, refunds,
disputes, identity review). Their screens are the next waves.

## Quality gates per screen

1. Data from the database through `src/lib/data/*` (server-only) and Server Actions.
2. Loading (`loading.tsx` / skeletons), empty and error states.
3. Arabic validation messages; RPC errors mapped in `src/lib/errors.ts`.
4. Responsive at 320 / 375 / 768 / 1024 / 1440, RTL, keyboard focus.
5. Visual check against the Figma frame.
6. `npm run lint` and `npm run build` pass.
