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
| T7 | TRR-PRG-01 | «شهادات إتمام البرنامج» button (Figma links it to TRR-CRT-02, which works per course run) | Opens TRR-CRT-02 for the most recent non-draft course created from the trainer's programs; disabled with a one-line explanation when there is none. Confirm this is the intended target. |
| T8 | TRR-CAL-01 تقويمي (254:388 / 254:814) | Figma has a «يوم» tab but no day-view frame, and no frame for opening, editing or deleting an appointment. | Day view reuses the week grid for one day. Opening an appointment shows a dialog built from the existing Modal component. |
| T9 | TRR-HLP-01 / DSH-01 support links | There is no trainer support-ticket screen. | «تواصل مع الدعم» opens `/messages?f=support`; identity verification links to `/account`. |
| T10 | TRR-DSH-01 sidebar card | Figma always shows «مدرب معتمد» with a badge. | Shown when the platform has verified the trainer; otherwise the card shows «مدرب» without the badge. The eye count is real profile views (one per visitor per day). |
| T11 | TRR-JRN-02 حاسبة الدخل | The «عروض مقبولة» input depends on bids (Wave 2). | Input shown; it has no effect until bids exist. |
| T12 | TRR-RES-01 / TRR-CRT-01 | Figma copy on the results screen says certificates are issued automatically after approval; the flow in CRT-01 issues them as a separate step. | Copy adjusted to match the separate issuance step. Confirm which behaviour you want. |
| T13 | TRR-RTG-01 / TRR-RES-01 / ٩ التقييمات | «متوسط الاعتماد ٣ أيام», «ضمن أعلى ١٠٪» and the repeated-phrase analysis have no data source. | Hidden until the platform collects that data. |
| T14 | Shared avatar initials | `initialsOf` now skips the article «ال» (e.g. «سالم الحارثي» → «س ح») to match Figma. | Affects avatars in every workspace. |
| T15 | TRR-CRS-05 ٢ المحاور والمحتوى (334:12859) | Figma's content tab for in-person/live courses has no lesson editor. | The lesson editor is also shown there so lessons/quizzes can be authored for every mode. |
| T16 | TRR-CRS-05 grading-method card | Figma shows weights for attendance and a final exam; the database has no such weights. | Shows the real rules (80 % attendance, assignment weights, quiz pass mark). «رابط الانضمام قبل ساعة» and «حد الاحتساب ٣٠ دقيقة» rows hidden (not enforced). |
| T17 | TRR-CRS-01 bulk actions (327:11990) | Figma has no entry point into bulk-selection mode. | A link opens `?view=select`. |
| T18 | Inquiries («ردّ الآن») and trainer receipts | No screen for trainers answering pre-enrolment inquiries or printing a sale receipt. | «ردّ الآن» goes to the trainees tab; «نزّل الإيصال» prints the sale page. |
| T19 | Trainee side of scheduled courses | Trainee screens do not list lessons or course files for in-person/live courses. | Needs a trainee design for those. |
| T20 | TRR-PRG-01 / 02 meta rows | Figma lays out each «label: value» item left-to-right (value visually right of its label), which reads backwards in Arabic. | Items follow Figma's visual order across the row; inside an item the label precedes its value (proper RTL). |
| T21 | TRR-PRG-06 · غير مكتمل (447:24061) vs «غير مكتمل · بلا دورة أولى» (4207:652) | Two different layouts for the same state (an unpublished program never has a course). | Status page follows 447:24061; the visibility page follows 450:24600. Tell us if 4207:652 should replace 447:24061. |
| T22 | TRR-PRG-08 «إشعار فريق المراجعة» | There is no admin/reviewer account yet. | The step is real (`notify_program_reviewers` notifies every admin-workspace user) — today it notifies nobody. |
| T23 | TRR-CRS-03 standalone page (272:4534) | Its cards (seats, sensitive actions) live inside the «المتدربون» tab and `/seats`; the standalone layout is not built. | Confirm the merged layout or say if the standalone page is needed. |
| T24 | Several trainer frames (tabs, sequences, seat tiles, cancel-reason chips) | Figma lays them out left-to-right. | Shown in right-to-left reading order, consistent with the rest of the app. |
| T25 | TRR-CRS-03 seats frames | 462:33421 puts the number before «من ٢٠ مقعدًا», the other frames after it. | Follows the majority of frames. |
| T26 | TRR-CRS-04 postpone date fields | Figma shows Arabic-digit dates «١٠ / ٠٥ / ٢٠٢٦». | Uses the browser's date picker (Latin digits). A custom Arabic date picker is needed to match exactly. |
| T27 | TRR-ATT-02 QR panel | Adds «أو يكتب الرمز …» (not in Figma) for trainees without a camera. | Keep or remove? |
| T28 | Trainer frames drawn left-to-right (breadcrumbs, PRF-01 header and availability strip, PRF-03 «أعمالك» count chip, HLP «اقرأ الدليل» badge, HLP-02 «نعم/لا») | Several auto-layout rows in the trainer page are laid out LTR in Figma (e.g. the DS «Nav / Breadcrumb» puts the root on the left). Should they mirror for RTL? | Kept in RTL order (root/first item at the inline start), consistent with the trainee workspace. CAL-02 (303:9062) keeps Figma's physical order for «من/إلى» and the three appointment types. |
| T29 | TRR-ONB-01 wizard bar | Figma shows «الخطوة 1 من 5» with Latin digits; every other screen uses Arabic-Indic digits. | Arabic-Indic digits («الخطوة ١ من ٥»). |
| T30 | TRR-QUE-01 empty (464:36175) «هذا الأسبوع» | «متوسط ردّك ٦ ساعات» and «أسرع من ٨٢٪ من المدربين» have no data source. | Only «مهام أنجزتها» is shown. |
| T31 | Trainer sidebar collapse toggle (I256:877) | Figma shows a desktop collapse chevron; there is no collapsed-sidebar design. | The toggle closes the drawer below `lg` only. |
| T32 | TG icon names vs drawn glyphs (trainer courses) | Several TG icon instances are named after one Lucide icon but draw another (e.g. «icon · banknote»/«link»/«pause» draw an hourglass, «monitor-play» draws «tv», «layers» draws «puzzle», «play» draws «calendar-check», «message-square» draws «messages-square», «folder» draws «bookmark»). | The trainer-course screens now render the glyph Figma actually draws. Confirm whether the library names or the drawn glyphs are intended. |
