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
