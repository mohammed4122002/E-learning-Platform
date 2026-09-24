# بوابة التدريب — E-learning Platform

Arabic-first (RTL) training platform. **Next.js 16** (App Router, Server Components, Server Actions) ·
React 19 · TypeScript · Tailwind CSS 4 · **Supabase** (Postgres + RLS, Auth, Storage, pg_cron).

The UI is built from the project's Figma file, which is the single source of truth. Every screen reads
and writes real data through Supabase — there is no mock data.

## Getting started

```bash
cp .env.example .env.local   # fill in the Supabase URL and publishable key
npm install
npm run dev                  # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run fetch:covers` | Re-download the original course covers from Figma (needs `FIGMA_TOKEN`) |

### Environment

| Variable | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server | Publishable key; all access is enforced by RLS |
| `NEXT_PUBLIC_SITE_URL` | server | Origin used in auth e-mails and OpenGraph URLs |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Not used by the app today. Reserved for the payment webhook. Never prefix with `NEXT_PUBLIC_`. |

## What is implemented

The trainee workspace end to end, the trainer workspace (Waves 1 and 2), plus shared and public pages. The other
workspaces (provider, requester, studio, admin) are the next waves — see
[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

| Area | Routes |
| --- | --- |
| Auth | `/login`, `/register`, `/verify-email`, `/forgot-password` (`/verify`, `/new`), `/auth/confirm`, `/select-workspace` |
| Onboarding | `/onboarding`, `/onboarding/[step]` (1–6), `/onboarding/done` |
| Dashboard & queue | `/trainee`, `/trainee/queue` |
| Discovery | `/trainee/discover`, `/trainee/programs/[slug]`, `/trainee/programs/[slug]/courses`, `/trainee/compare` |
| Course page | `/courses/[slug]`, `/courses/[slug]/preview` (public, SEO + JSON-LD) |
| Checkout | `/checkout/[course-slug]` (review + discount), `/checkout/[enrollment]` (seat hold), `/checkout/[enrollment]/pay`, `/checkout/[enrollment]/done`, `/trainee/receipts/[id]` |
| My trainings | `/trainee/trainings`, `/trainee/trainings/[id]` (+ `session`, `check-in`, `withdraw`, `refund`, `calendar`), `/trainee/refunds/[id]`, `/trainee/disputes/new`, `/trainee/disputes/[id]`, `/trainee/waitlist`, `/trainee/waitlist/[id]` |
| Learning | `/trainee/learn/[enrollment]` (+ `journey`, `lessons/[lesson]`), `/trainee/learn/quiz/[quiz]`, `/trainee/assignments`, `/trainee/assignments/[id]`, `/trainee/learning-record` (+ `report`) |
| Certificates & ratings | `/trainee/certificates`, `/trainee/certificates/[id]` (+ `print`), `/trainee/certificates/external/new`, `/trainee/certificates/external/[id]`, `/trainee/ratings`, `/trainee/ratings/new` |
| Engagement & support | `/trainee/favorites`, `/trainee/following`, `/trainee/help`, `/trainee/help/[slug]`, `/trainee/inquiry`, `/trainee/report` |
| Profile | `/trainee/profile` (+ `edit`, `photo`, `experience`), `/trainee/verification`, `/u/[id]` (public profile) |
| Account | `/account`, `/account/security`, `/account/notifications`, `/account/privacy`, `/account/export` |
| Inbox | `/notifications`, `/messages`, `/messages/[id]`, `/messages/new` |
| Public | `/help`, `/help/[slug]`, `/terms`, `/verify`, `/verify/[code]` |
| Trainer · home | `/trainer`, `/trainer/onboarding/[step]`, `/trainer/queue`, `/trainer/journey` (+ `income`), `/trainer/profile` (+ `edit`, `portfolio`), `/trainer/calendar` (+ `new`), `/trainer/help` (+ `[slug]`) |
| Trainer · programs | `/trainer/programs`, `/new`, `/[id]` (+ `edit/[step]`, `curriculum`, `preview`, `declaration`, `review`, `visibility`, `withdraw`, `new-version`) |
| Trainer · courses | `/trainer/courses`, `/new`, `/[id]` (+ `setup/[step]`, `content`, `files`, `assignments`, `preview`, `dashboard`, `sales`, `content/publish`) |
| Trainer · running a course | `/trainer/courses/[id]/trainees`, `seats`, `postpone`, `cancel`, `attendance` (+ `[sessionId]`), `results` (+ `record`, `approve`), `assignments/[aId]/submissions`, `certificates` (+ `issue`, `program`), `ratings`; `/trainer/ratings` (+ `reply`, `review`) |
| Trainer · opportunities & bids | `/trainer/opportunities`, `/trainer/opportunities/[id]/bid`, `/trainer/bids`, `/trainer/bids/[id]/decision`, `/trainer/bids/[id]/negotiation` |
| Trainer · affiliations & contracts | `/trainer/affiliations` (+ `invitations/[id]`, `[id]/end`), `/trainer/contracts/new`, `/trainer/contracts/[id]` (+ `sign`, `document`), `/trainer/reports` (+ `[id]/appeal`) |
| Trainer · finance | `/trainer/finance` (+ `?tab=operations`, `export`), `/trainer/finance/settlements/[id]`, `/trainer/finance/bank`, `/trainer/finance/withdraw` |

Every dynamic route has `loading.tsx`, `error.tsx` (Arabic message + retry) and empty states.

## Project structure

```
src/app/                  routes (App Router). (auth), (workspace) and (print) are route groups
src/proxy.ts              session refresh + route protection (Next 16 "proxy", formerly middleware)
src/components/ui/        design-system components that mirror the Figma library
src/components/<area>/    feature components (checkout, learning, trainings, discover, …)
src/lib/data/             server-only data access (Supabase queries/RPCs, mapped to view types)
src/lib/actions/          shared Server Actions
src/lib/supabase/         browser/server clients and cookie options
src/lib/validation/       Zod schemas with Arabic messages
src/lib/errors.ts         database error codes → Arabic messages
src/lib/format.ts         Arabic digits, SAR prices, Gregorian dates in Asia/Riyadh
src/types/database.ts     generated from the live schema — do not edit by hand
supabase/migrations/      every schema change, applied in order
```

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — layers, conventions, business-rule map
- [DATABASE.md](DATABASE.md) — schema, RLS model, RPCs, pricing, jobs, seed data
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — waves and status
- [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) — decisions and credentials still needed (payment gateway, SMS, SMTP…)

## Payments

Card details never reach our server. Real card payments need a payment gateway (see OPEN_QUESTIONS #1).
Until one is connected, payment attempts fail safely with an Arabic message and the seat hold is kept.
For local testing only, `app_settings.payments_sandbox = true` enables a sandbox. In the sandbox, the card
`4000 0000 0000 0002` is declined and any other valid card number is accepted. Keep it `false` in production.
