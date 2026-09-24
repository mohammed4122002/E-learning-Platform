# Database

Supabase Postgres (project `ouzohkjnuwyxvfimxwxt`). Every schema change is a SQL file in
`supabase/migrations/` and was applied to the project with the same name, in order. Migrations are
additive: no table, row, user or bucket was dropped (the only removal is three `profiles`
columns that moved to the owner-only `account_settings` table before any data existed).

TypeScript types: `src/types/database.ts`, generated from the live schema
(`generate_typescript_types` → `python3 scripts/write-db-types.py <file>`). Never edit it by hand.

## Security model

- **RLS is enabled on every table.** Default is deny; policies live in `…100500_rls.sql` and next to
  later tables.
- **Helpers** (security definer, `search_path = ''`): `has_workspace(kind)`, `is_admin()`,
  `is_org_member(org)`, `is_enrolled(course)`, `manages_course(course)`.
- **Writes with business rules go through RPCs**, never direct inserts. An RPC checks the caller
  (`require_user()`), locks the rows it changes and raises `P0001` with a machine code
  (`hold_expired`, `course_full`, `already_enrolled`, …). `src/lib/errors.ts` maps codes to Arabic.
- **Function privileges** (`…100900_function_privileges.sql`): `EXECUTE` is revoked from `PUBLIC`
  and granted per role. Payment settlement (`settle_payment`) is `service_role` only;
  `sandbox_settle_payment` works only while `app_settings.payments_sandbox = true` (false in production).
- **Protected columns**: the `protect_profile_fields` trigger stops users from changing their own
  status, identity status or freeze flags. Trusted RPCs set the transaction-local `app.trusted_op`.
- **Storage** (`…100700_storage.sql`): public buckets `avatars`, `course-covers`; private
  `lesson-media`, `submissions`, `identity-documents`, `dispute-attachments`,
  `external-certificates`, `report-evidence`, `message-attachments`. Objects live under `<user-id>/…` (message attachments under the conversation id) and policies only allow the owner (plus
  course managers for submissions). Preview lessons are readable by anyone (`…115100`).
- The service-role key is never used by the web app.

## Tables by domain

| Domain | Tables |
| --- | --- |
| Identity | `profiles`, `account_settings`, `organizations`, `organization_members`, `user_workspaces` (≤ 4 per user) |
| Catalog | `categories`, `learning_fields`, `programs`, `program_versions` (immutable snapshot, BR-L1), `courses`, `course_modules`, `lessons`, `course_sessions` |
| Enrollment & money | `discount_codes`, `enrollments` (price lock BR-L3, `hold_expires_at` BR-L7, `vat_amount`), `payments` (unique `idempotency_key` BR-L12), `receipts` (`RC-` sequence), `waitlist_entries`, `refund_requests`, `disputes`, `dispute_attachments` |
| Learning | `lesson_progress`, `attendance`, `attendance_codes`, `quizzes`, `quiz_attempts`, `assignments`, `assignment_submissions`, `certificates` (12-hex public code), `external_certificates`, `course_ratings` |
| Engagement & support | `trainee_preferences`, `experiences`, `favorites`, `follows`, `inquiries`, `notifications`, `conversations`, `conversation_participants`, `messages`, `violation_reports`, `identity_verifications`, `help_articles`, `queue_dismissals`, `terms_acceptances` |
| Config | `app_settings` (VAT rate, sandbox flag, auth value panel) |
| Training requests & bids (TRR-BID) | `training_requests` (posted by requester organizations), `training_bids` (`OFR-` reference, original terms + `agreed_terms`, 7-day `contract_due_at` paused while negotiating), `bid_negotiations`, `bid_negotiation_rounds`; `conversations.bid_id`; private bucket `bid-attachments` |

## Main RPCs

| Area | Functions |
| --- | --- |
| Enrollment | `quote_enrollment`, `start_enrollment`, `create_payment`, `settle_payment`, `sandbox_settle_payment`, `withdraw`, `request_refund`, `open_dispute`, `add_dispute_attachment` |
| Waitlist | `join_waitlist`, `leave_waitlist`, `accept_waitlist_invite`, `invite_next_waitlisted` |
| Learning | `course_outline`, `course_progress`, `record_lesson_progress`, `get_quiz`, `submit_quiz`, `submit_assignment`, `check_in`, `issue_certificate`, `rate_course`, `verify_certificate` |
| Catalog | `course_seats_left`, `course_rating_breakdown`, `trainer_public_stats` |
| Money | `refund_quote`, `cancel_refund_request`, `withdraw_enrollment`, `withdraw_dispute`, `my_waitlist_positions` |
| Live & learning extras | `join_live_session`, `course_quizzes`, `quiz_attempt_review`, `submit_quiz_attempt`, `submit_assignment_file`, `certificate_conditions` |
| Discovery | `discover_courses`, `discover_facets`, `discover_suggest`, `course_public_facts` |
| Bids (trainer) | `trainer_opportunities`, `training_request_match`, `trainer_bids`, `trainer_bid_stats`, `bid_negotiation_history`, `save_training_bid`, `withdraw_training_bid`, `open_bid_negotiation`, `save_bid_negotiation`, `cancel_bid_negotiation`, `withdraw_bid_negotiation`, `respond_bid_counter`, `open_bid_conversation`, `bid_terms` |
| Bids (organization members) | `create_training_request`, `set_training_request_status`, `shortlist_training_bid`, `decide_training_bid`, `respond_bid_negotiation` |
| Account | `add_workspace`, `submit_identity_verification`, `submit_identity_documents`, `account_deletion_blockers`, `freeze_account`, `request_account_deletion`, `public_profile`, `start_conversation`, `withdraw_violation_report` |

## Pricing

VAT is 15 % and **exclusive** (Figma TG · Configuration `Tax/Inclusive = false`):
`subtotal = list_price − discount`, `vat = round(subtotal × rate, 2)`, `total = subtotal + vat`.
`quote_enrollment` is the single source for these numbers; the enrollment stores them at hold time.

## Jobs

`pg_cron` job `expire-stale-holds` runs every minute: expires unpaid holds, frees the seat and invites
the next person on the waitlist. `expire-training-bids` runs every 5 minutes: expires unanswered negotiation steps
(72 h, original terms return), accepted offers not contracted in time, and closes requests past their deadline.

## Seed data

`…101000_seed_catalog.sql` adds the catalog shown in Figma: one provider, three trainer accounts
(`@seed.invalid`, no usable password), 8 categories, 7 courses (one with 4 modules, 18 lessons and a
quiz) and the discount code `WELCOME10`. Ratings and learner counts start at zero — nothing is faked.
