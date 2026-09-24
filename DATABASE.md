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
| Training requests & bids (TRR-BID) | `training_requests` (posted by requester organizations), `training_bids` (`OFR-` reference, original terms + `agreed_terms`, 7-day `contract_due_at` paused while negotiating), `bid_negotiations`, `bid_negotiation_rounds`; `conversations.bid_id`; private bucket `bid-attachments` |
| Trainer finance | `trainer_ledger_entries` (frozen sale / refund / chargeback rows, written by triggers), `trainer_bank_accounts` (owner-only; full IBAN not selectable through the API), `trainer_withdrawals`, `saudi_banks` |
| Config | `app_settings` (VAT rate, sandbox flag, auth value panel, commission, withdrawal minimum/fee, refund processing fee) |

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
| Trainer finance | `trainer_ledger`, `trainer_balance`, `trainer_stats`, `submit_bank_account`, `cancel_bank_account_change`, `request_withdrawal`, `cancel_withdrawal`; admin only: `admin_review_bank_account`, `admin_update_withdrawal` |
| Account | `add_workspace`, `submit_identity_verification`, `submit_identity_documents`, `account_deletion_blockers`, `freeze_account`, `request_account_deletion`, `public_profile`, `start_conversation`, `withdraw_violation_report` |

## Pricing

VAT is 15 % and **exclusive** (Figma TG · Configuration `Tax/Inclusive = false`):
`subtotal = list_price − discount`, `vat = round(subtotal × rate, 2)`, `total = subtotal + vat`.
`quote_enrollment` is the single source for these numbers; the enrollment stores them at hold time.

## Trainer money (TRR-FIN, `…141000_trainer_finance.sql`)

- **Ledger**: `payments` → `succeeded` inserts a `sale` row (gross = price paid − VAT, commission =
  `platform_commission_percent()` frozen on the row). An approved `refund_requests` row inserts a `refund` row (refunded
  share, commission returned pro rata, plus `refund_processing_fee_percent` when a trainee left a scheduled course
  before it started). A payment marked `refunded` without an approved request inserts a `chargeback`.
- **Release**: scheduled courses 7 days after the (completed) course ends; recorded courses 14 days after each purchase.
  A refund before release nets out inside its sale's settlement. Settlement = release month (Asia/Riyadh), `STL-YYYY-MMDD`.
- **Balance** (`trainer_balance_for`): available = released net − completed withdrawals; the same function feeds
  `trainer_stats()` (dashboard «رصيدك») and `/trainer/finance`.
- **Withdrawals**: `request_withdrawal(amount)` needs a verified account submitted ≥ 48 h ago, no pending account change,
  no request in flight, amount ≥ `withdrawal_min_amount` and ≤ available; fee `withdrawal_fee_amount`.
  **There is no payout provider** — the finance team transfers manually and then, signed in with an admin workspace, calls
  `admin_update_withdrawal(id, 'processing' | 'completed' | 'failed', reason, transfer_ref)` (e.g. from the SQL editor
  with the admin's JWT, or a future admin screen). Only `completed` reduces the balance; `failed` requires a reason.
- **Bank accounts**: `submit_bank_account(iban, bank_code, document_path)` validates the Saudi IBAN (mod-97), the bank code,
  and the IBAN certificate in the private `bank-documents` bucket; the holder is the profile name. The trainer can cancel
  within 48 h; an admin verifies with `admin_review_bank_account(id, approve, note)`.

## Jobs

`pg_cron` job `expire-stale-holds` runs every minute: expires unpaid holds, frees the seat and invites
the next person on the waitlist. `expire-training-bids` runs every 5 minutes: expires unanswered negotiation steps
(72 h, original terms return), accepted offers not contracted in time, and closes requests past their deadline.

## Seed data

`…101000_seed_catalog.sql` adds the catalog shown in Figma: one provider, three trainer accounts
(`@seed.invalid`, no usable password), 8 categories, 7 courses (one with 4 modules, 18 lessons and a
quiz) and the discount code `WELCOME10`. Ratings and learner counts start at zero — nothing is faked.

## Trainer affiliations, contracts and content reports (TRR-AFL / TRR-CTR / TRR-RPT)

Migrations `20260924142000…142500`. RLS: the trainer reads their own rows, organization members read their
organization's rows, admins read all; every write goes through a security-definer RPC.

| Table | Purpose |
| --- | --- |
| `affiliation_invitations` | Organization → trainer invitation: commission %, scope, exclusivity, term, notice days, execution scope, `expires_at`, status `pending/accepted/declined/expired/withdrawn` (one pending per pair). |
| `trainer_affiliations` | Accepted invitation: status `active → ending → ended`, `started_at`, `end_requested_at`, `end_effective_at` (notice period), `ended_by`/`ended_by_party`, `end_reason`, `end_message`. One live affiliation per pair. Trigger `courses_affiliation_guard`: no new course for the trainer under an organization whose affiliation is ending/ended; running courses are untouched. |
| `trainer_contracts` | `CTR-YYYY-NNNNNN`, `source_type affiliation/bid` + `source_id` (no FK to bids), status `draft/sent/signed_by_trainer/active/terminated/expired`, `sign_deadline`. Trainers never see drafts. |
| `trainer_contract_versions` | Immutable terms JSON per version once `sent_at` is set; `document_hash` = SHA-256 of `terms::text` (`contract_hash`). |
| `trainer_contract_signatures` | Insert-only click-to-sign record: party, signer, typed name, consent text, `document_hash`, SHA-256 of IP and user agent, `signed_at`. No third-party e-sign provider. |
| `violation_reports` (+ `report_number`, target `program`) | Existing reports; the trainer reads them only through `my_content_reports()` (no reporter identity). |
| `report_responses` · `report_decisions` · `report_appeals` | Trainer reply (+ evidence), compliance decision (`appeal_deadline` = 7 days), one appeal per decision reviewed by a different admin. |

RPCs — trainer: `accept_affiliation_invitation`, `decline_affiliation_invitation`, `end_affiliation`, `cancel_affiliation_end`,
`start_org_conversation`, `sign_contract`, `start_bid_contract`, `respond_to_report`, `submit_report_appeal`,
`accept_report_decision`; organization (owner/admin): `org_send_affiliation_invitation`, `org_withdraw_affiliation_invitation`,
`org_end_affiliation`, `org_create_affiliation_contract`, `org_revise_contract`, `org_send_contract`, `org_countersign_contract`,
`org_terminate_contract`; admin: `admin_decide_report`, `admin_decide_appeal`; read models: `my_affiliation_stats`,
`organization_public_stats`, `my_content_reports`. Jobs: `affiliations-housekeeping`, `contracts-housekeeping` (every 15 min).

Contract terms JSON (`trainer_contract_versions.terms`): `scope`, `value` (number) or `value_label`, `original_value`, `currency`,
`duration` or `days`/`hours`, `dates` or `starts_on`/`ends_on`, `terms_source`, `negotiation_log`, `platform_commission_percent`,
`hero {badge, summary}`, `items [{key?, label, negotiable, original?, agreed?, note?}]` (values: text, number for `price`,
`[start, end]` ISO dates for `dates`), `history [{actor trainer|organization, kind proposal|counter|accept, text, at}]`.
