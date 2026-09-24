# Open questions

Decisions the product owner has to make, or credentials only they can supply. Each item says what
the app does today, so nothing is silently faked.

| # | Topic | Needed | Current behaviour |
| --- | --- | --- | --- |
| 1 | **Payment gateway** | Provider choice (e.g. Moyasar, HyperPay, Tap) + merchant keys, plus a webhook endpoint that runs `settle_payment` with the service role on the server. | `src/lib/payments.ts` has one provider: the sandbox, which only works while `app_settings.payments_sandbox = true`. It is **false** in the database, so real payments fail with a clear Arabic message and no seat is lost. Card data never reaches our server. |
| 2 | **Bank transfer** | Should it exist? The 15-minute hold (BR-L7) is too short to confirm a transfer. | Shown disabled with an explanation, as in Figma. |
| 3 | **SMS provider** for phone OTP / 2FA | Twilio / Unifonic etc. configured in Supabase Auth. | Email codes are used for sign-up and recovery; phone is stored but not verified. |
| 4 | **Custom SMTP** for auth mail | Sender domain + SMTP credentials in Supabase Auth. | Supabase's default mailer (low rate limit, not for production). |
| 5 | **Email templates** | The "Confirm signup" and "Reset password" templates must include `{{ .Token }}` so the 6-digit code screens work. | Link confirmation also works through `/auth/confirm`. |
| 6 | **AI assistant** | LLM provider, data scope and cost limits. | The dashboard card offers suggested questions that link to real pages; there is no model behind it. |
| 7 | **Other workspaces** (trainer, provider, studio, requester, admin) | Scope of the next waves. | The picker shows them as "coming soon"; only the trainee workspace is enabled (`src/lib/workspaces.ts`). Admin review for refunds, disputes, identity checks and reports is done in the database for now. |
| 8 | **Seed trainers and course content** | Real trainer accounts, course media and covers. | The seeded catalog mirrors Figma. Lesson videos are not uploaded yet, so the player shows its "media not available" state. |
| 9 | **Legal copy** | Final terms, privacy and refund policy text. | Pages exist with the text from Figma. |
| 10 | **Certificates** | Official template and signing authority. | Certificates are issued by the database (`issue_certificate`) with a public verification code. |
| 11 | **Leaked password protection** | Turn on in Supabase Dashboard → Authentication → Passwords (checks HaveIBeenPwned). Needs a paid plan. | Our own rules still require 8+ characters with upper, lower and a digit. |
| 12 | **Support tickets** | A ticketing system (own table or Zendesk/Freshdesk). | "افتح تذكرة دعم" opens the inquiry form; "تذاكري" lists the user's inquiries and reports. |
| 13 | **Provider replies to reviews, provider announcements, per-course alerts** | Product decision; they belong to the provider/trainer workspaces. | Not shown. |
| 14 | **Two-factor auth, device list, activity log** | Supabase MFA setup; a session list needs the service role. | "End all other sessions" works; the rest is labelled as not available yet. |
| 15 | **Permanent account deletion** | A server job with the service role to purge data after the grace period. | Deletion request freezes the account and records `deletion_requested_at` (BR-S3 blockers enforced). |
| 16 | **Blended mode, trainer years of experience, birth date / nationality** | Fields do not exist in the schema yet. | Not shown. |
| 17 | **Certificate code format** | Figma shows `CRT-YYYY-NNNNN`; the database issues a 12-hex code. | 12-hex code; the verify page also accepts a `CRT-` prefix and dashes. |
| 18 | **Test data** | Deleting it was blocked by this session's permission settings; needs the owner to allow it or run the cleanup in the SQL editor. | QA accounts `qa.trainee@`, `qa.discover*@`, `qa.certs@`, `qa.trainings@`, `qa.profile@`, `qa.learning@bawaba-qa.dev` (plus two QA-only completed courses) and their rows exist in the database; `qa-discover-*` programs are visible in discovery. |

## Trainer workspace — design decisions needed

| # | Screen (Figma) | Question | Current behaviour |
| --- | --- | --- | --- |
| T1 | Workspace switcher (none in Figma) | How does a user with both trainee and trainer workspaces switch between them? | No UI. `/select-workspace?add=1` (PUB-CTX-01) adds a workspace; switching is by URL (`/trainee`, `/trainer`). |
| T2 | TRR-PRG-02 ٤ التسعير (314:11489) | Figma says prices are «شامل الضريبة», but TG · Configuration has `Tax/Inclusive = false` (VAT added on top at checkout). Which is right? | Shows «غير شامل الضريبة» to match what checkout actually charges. |
| T3 | TRR-PRG-02 ٤ التسعير | Figma shows refund tiers 100/75/50 %. The platform's refund rule (`refund_quote`) is 100 % at 7+ days, 50 % at 3–6 days, recorded courses within 14 days. | Shows the real rule. Tell us which tiers to use and the rule will be changed in the database, not only in the UI. |
| T4 | TRR-PRG-04 مسودة بالمساعد الذكي (310:10907) and the AI cards on PRG-01/PRG-02 | Needs an LLM provider (see #6). | Not built; AI entry points hidden. |
| T5 | TRR-PRG-07 curriculum | Figma has no control to add a lesson/assignment inside an existing unit, no audience «+ أضف فئة» chip, and no unit picker when dropping files. | Small controls were added in the existing design system so the data can be edited. Please confirm or provide the design. |
| T6 | TRR-PRG-02 ١ الغلاف | «اقتصّ وعدّل الإطار» (crop) | Not built yet. |
| T7 | TRR-PRG-01 | «شهادات إتمام البرنامج» button | Not built yet (program certificates are part of the course-operations screens). |
