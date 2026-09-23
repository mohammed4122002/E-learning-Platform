-- Certificates, ratings, favorites, follows & support (TRN-CRT-*, TRN-RTG-*, TRN-FAV-01, TRN-FLW-01, TRN-HLP-01,
-- TRN-INQ-01, TRN-RPT-01). Additive only: new columns, widened CHECK lists, one RPC, one private bucket, help content.

-- ── TRN-CRT-03 · external certificate fields shown in the Figma data card ───────────────────
alter table public.external_certificates
  add column if not exists expires_on date,
  add column if not exists serial_number text check (char_length(serial_number) <= 100),
  add column if not exists field text check (char_length(field) <= 120),
  add column if not exists updated_at timestamptz not null default now();

alter table public.external_certificates drop constraint if exists external_certificates_expiry_check;
alter table public.external_certificates
  add constraint external_certificates_expiry_check check (expires_on is null or expires_on >= issued_on);

drop trigger if exists external_certificates_touch on public.external_certificates;
create trigger external_certificates_touch before update on public.external_certificates
  for each row execute function public.touch_updated_at();

-- ── TRN-INQ-01 · topic chip «المتطلبات المسبقة» ──────────────────────────────────────────────
alter table public.inquiries drop constraint if exists inquiries_topic_check;
alter table public.inquiries add constraint inquiries_topic_check
  check (topic in ('content', 'prerequisites', 'schedule', 'price', 'certificate', 'other'));

-- ── TRN-RPT-01 · reasons from the Figma chips, withdrawal and optional evidence ──────────────
alter table public.violation_reports drop constraint if exists violation_reports_reason_check;
alter table public.violation_reports add constraint violation_reports_reason_check
  check (reason in ('misleading', 'inappropriate', 'fraud', 'harassment', 'copyright', 'other',
                    'false_accreditation', 'unprofessional', 'false_trainer_info', 'fake_reviews'));
alter table public.violation_reports drop constraint if exists violation_reports_status_check;
alter table public.violation_reports add constraint violation_reports_status_check
  check (status in ('open', 'reviewing', 'actioned', 'dismissed', 'withdrawn'));
alter table public.violation_reports
  add column if not exists evidence_path text,
  add column if not exists withdrawn_at timestamptz;

-- «اسحب البلاغ»: the reporter can withdraw a report while it is still open.
create or replace function public.withdraw_violation_report(p_report uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); r public.violation_reports;
begin
  select * into r from public.violation_reports where id = p_report and reporter_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if r.status <> 'open' then raise exception 'report_not_open' using errcode = 'P0001'; end if;
  update public.violation_reports set status = 'withdrawn', withdrawn_at = now() where id = r.id;
end $$;
revoke execute on function public.withdraw_violation_report(uuid) from public, anon, authenticated;
grant execute on function public.withdraw_violation_report(uuid) to authenticated;

-- Evidence files: private bucket, "<auth.uid()>/<uuid>-<file>".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-evidence', 'report-evidence', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "report evidence insert" on storage.objects;
create policy "report evidence insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'report-evidence' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "report evidence read" on storage.objects;
create policy "report evidence read" on storage.objects for select to authenticated
  using (bucket_id = 'report-evidence' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ── TRN-HLP-01 · help center content (copy from the Figma frame) ─────────────────────────────
alter table public.help_articles add column if not exists is_featured boolean not null default false;
create index if not exists help_articles_category_idx on public.help_articles (category, position);

insert into public.help_articles (slug, category, title, body, position, is_featured) values
-- الدفع والاسترداد (8)
('refund-arrival-time', 'payments', 'متى يصل مبلغ الاسترداد؟',
 'بعد اعتماد الطلب يُحوَّل خلال ٣ إلى ٧ أيام عمل حسب البنك المُصدِر لبطاقتك. المدة يحددها البنك لا المنصة.

تصلك رسالة وإشعار فور تحويل المبلغ، ويظهر الإيصال المعدّل في «ملف التدريب».', 1, true),
('refund-rejected-next-steps', 'payments', 'رُفض طلب استردادي، ماذا أفعل؟',
 'لك ٧ أيام لفتح نزاع مالي يراجعه مسؤول مستقل لم يشارك في القرار الأول، ويُجمَّد المبلغ حتى القرار.

افتح النزاع من صفحة العملية في «ملف التدريب» وأرفق ما يدعم طلبك (لقطات شاشة، إيصالات).', 2, true),
('payment-methods', 'payments', 'ما وسائل الدفع المتاحة؟',
 'نقبل بطاقات مدى وفيزا وماستركارد وApple Pay. تتم المعالجة عبر بوابة دفع آمنة ولا نحتفظ ببيانات بطاقتك.', 3, false),
('vat-on-invoices', 'payments', 'هل الأسعار تشمل ضريبة القيمة المضافة؟',
 'الأسعار المعروضة على بطاقات الدورات لا تشمل ضريبة القيمة المضافة (١٥٪). تظهر الضريبة منفصلة في ملخص الطلب وفي الإيصال.', 4, false),
('double-charge', 'payments', 'خُصم المبلغ مرتين، ماذا أفعل؟',
 'كل محاولة دفع لها رقم فريد، فلا يُحتسب الدفع مرتين لنفس الطلب. إن ظهر خصم مكرر في كشف حسابك فهو غالبًا حجز مؤقت يلغيه البنك خلال أيام.

إن استمر أكثر من ٧ أيام افتح نزاعًا ماليًا من صفحة العملية.', 5, false),
('refund-policy', 'payments', 'ما سياسة الاسترداد؟',
 'يمكنك طلب الاسترداد قبل بدء الدورة كاملًا، وبعد بدئها وفق الشرائح المعلنة في صفحة البرنامج. طلبات الاسترداد بعد صدور الشهادة تحتاج موافقة الإدارة، وقد تُسحب الشهادة عند قبولها.', 6, false),
('receipts', 'payments', 'أين أجد إيصال الدفع؟',
 'كل عملية دفع ناجحة تصدر لها فاتورة تلقائيًا تجدها في «ملف التدريب» ضمن تفاصيل التسجيل، ويمكنك تنزيلها أو طباعتها.', 7, false),
('employer-funding', 'payments', 'كيف أسجّل على حساب جهة عملي؟',
 'اختر «مموّلة من جهة العمل» عند التسجيل، وسيُصدر الإيصال باسمك مع الإشارة إلى نوع التمويل.', 8, false),
-- التسجيل والمقاعد (6)
('join-waitlist', 'enrollment', 'كيف أنضم لقائمة الانتظار؟',
 'من صفحة دورات البرنامج، الدورة المكتملة تعرض زر «انضم لقائمة الانتظار». لا يُخصم مبلغ إلا بعد قبولك للمقعد.

عند توفّر مقعد يصلك إشعار ولديك مهلة محددة لقبوله قبل انتقاله للتالي.', 1, true),
('change-course-instead-of-withdraw', 'enrollment', 'هل يمكنني تغيير دورتي بدل الانسحاب؟',
 'نعم. من صفحة الانسحاب اختر «اعرض الدورات البديلة» — النقل بلا خصم إن توفّرت مقاعد.', 2, true),
('seat-hold', 'enrollment', 'كم يبقى المقعد محجوزًا أثناء الدفع؟',
 'نحجز لك المقعد ١٥ دقيقة من بدء التسجيل. إن لم يكتمل الدفع خلالها يُحرَّر المقعد ويمكنك البدء من جديد.', 3, false),
('provider-approval', 'enrollment', 'ماذا يعني «بانتظار الجهة»؟',
 'بعض البرامج تتطلب موافقة الجهة التدريبية على التسجيل. يصلك إشعار فور صدور القرار، ولا يُخصم أي مبلغ قبل الموافقة.', 4, false),
('withdraw-enrollment', 'enrollment', 'كيف أنسحب من دورة؟',
 'من «ملف التدريب» افتح الدورة واختر «الانسحاب». يُعرض لك المبلغ المسترد قبل التأكيد وفق شرائح الاسترداد.', 5, false),
('pre-enrollment-inquiry', 'enrollment', 'كيف أسأل عن برنامج قبل التسجيل؟',
 'من صفحة البرنامج اختر «استفسر قبل التسجيل». يصل سؤالك للجهة أو المدرب مباشرة ويظهر الرد في صفحة استفساراتك. السؤال لا يحجز مقعدًا.', 6, false),
-- الشهادات والتحقق (5)
('certificate-not-issued', 'certificates', 'لماذا لم تصدر شهادتي بعد؟',
 'الشهادة تُصدر آليًا فور استيفاء شروطها الأربعة. افتح صفحة الشهادة لترى أي شرط ما زال ناقصًا.', 1, true),
('verify-certificate', 'certificates', 'كيف يتحقق صاحب العمل من شهادتي؟',
 'لكل شهادة رقم مرجعي ورابط تحقق عام دائم يعمل دون تسجيل دخول. انسخه من صفحة الشهادة وشاركه مع أي جهة.', 2, false),
('certificate-issuer', 'certificates', 'باسم من تصدر الشهادة؟',
 'شهادات برامج الجهات التدريبية تصدر باسم الجهة مع اسم المدرب. شهادات المدربين المستقلين تصدر باسم المدرب عبر بوابة التدريب.', 3, false),
('download-certificate', 'certificates', 'كيف أنزّل شهادتي بصيغة PDF؟',
 'من صفحة الشهادة اختر «نزّل الشهادة PDF» ثم احفظها من نافذة الطباعة كملف PDF بالحجم A4 أفقي.', 4, false),
('external-certificates', 'certificates', 'هل يمكنني إضافة شهادة من خارج المنصة؟',
 'نعم. من «الشهادات» اختر «أضف شهادة خارجية» وارفع ملفها. تظهر في ملفك موسومة «شهادة خارجية» مع حالة توثيقها.', 5, false),
-- الدورات المسجَّلة (7)
('recorded-progress', 'recorded', 'كيف تُحتسب نسبة إكمالي؟',
 'كل درس يُحتسب مكتملًا عند مشاهدة ٩٠٪ من مدته. النسبة = الدروس المكتملة ÷ كل الدروس المنشورة.', 1, false),
('recorded-new-content', 'recorded', 'لماذا انخفضت نسبة إكمالي؟',
 'أضاف المدرب دروسًا جديدة إلى الدورة، فأُعيد احتساب النسبة. المحتوى الجديد يصلك مجانًا، وشهادتك الصادرة لا تتأثر.', 2, false),
('recorded-access', 'recorded', 'كم تبقى الدورة المسجَّلة متاحة لي؟',
 'الوصول دائم بلا انتهاء صلاحية ما لم يُسحب بسبب استرداد.', 3, false),
('recorded-quizzes', 'recorded', 'هل في الدورات المسجَّلة اختبارات؟',
 'بعض الدورات تتضمن اختبارات قصيرة داخل الدروس. نتيجتها تظهر فورًا ويمكنك إعادة المحاولة وفق إعدادات الدورة.', 4, false),
('recorded-playback', 'recorded', 'الفيديو لا يعمل، ماذا أفعل؟',
 'تأكد من اتصالك بالإنترنت وحدّث الصفحة. إن استمرت المشكلة جرّب متصفحًا آخر أو افتح تذكرة دعم مع اسم الدرس.', 5, false),
('recorded-questions', 'recorded', 'كيف أسأل المدرب عن درس؟',
 'من صفحة الدرس اختر «راسل المدرب». يصلك الرد في «الرسائل».', 6, false),
('recorded-certificate', 'recorded', 'متى أحصل على شهادة دورة مسجَّلة؟',
 'فور مشاهدة ١٠٠٪ من الدروس واجتياز الاختبارات إن وُجدت. تصدر آليًا بلا طلب.', 7, false),
-- الدورات الحضورية (4)
('attendance-qr', 'in_person', 'كيف أسجّل حضوري في القاعة؟',
 'امسح رمز الحضور المعروض في القاعة من «ملف التدريب» ← «تسجيل الحضور». الرمز صالح لمدة قصيرة ويتجدّد.', 1, false),
('missed-session', 'in_person', 'فاتتني جلسة، ماذا أفعل؟',
 'راسل الجهة أو المدرب من صفحة الدورة. نسبة الحضور شرط لإصدار الشهادة في معظم الدورات الحضورية.', 2, false),
('venue-location', 'in_person', 'أين أجد موقع القاعة؟',
 'الموقع والعنوان يظهران في صفحة الدورة وفي تفاصيل كل جلسة ضمن «ملف التدريب».', 3, false),
('course-cancelled', 'in_person', 'ماذا يحدث إن أُلغيت الدورة؟',
 'يصلك إشعار فوري ويُسترد المبلغ كاملًا تلقائيًا، أو يمكنك النقل إلى دورة بديلة إن توفّرت.', 4, false),
-- الحساب والتوثيق (6)
('identity-verification', 'account', 'لماذا أوثّق هويتي؟',
 'التوثيق يفتح البرامج المعتمدة التي تشترط هوية موثّقة. مستنداتك لا تُشارك مع أي جهة تدريبية.', 1, false),
('change-password', 'account', 'كيف أغيّر كلمة المرور؟',
 'من «الحساب» ← «الأمان» اختر «تغيير كلمة المرور». إن نسيتها استخدم «نسيت كلمة المرور؟» في صفحة الدخول.', 2, false),
('notification-settings', 'account', 'كيف أتحكم في الإشعارات؟',
 'من «الحساب» ← «الإشعارات» اختر ما يصلك بالبريد وداخل المنصة.', 3, false),
('multiple-workspaces', 'account', 'هل يمكنني امتلاك أكثر من مساحة عمل؟',
 'نعم، حتى أربع مساحات (متدرب، مدرب، جهة تدريبية…) بحساب واحد، وتنتقل بينها من قائمة الحساب.', 4, false),
('delete-account', 'account', 'كيف أحذف حسابي؟',
 'من «الحساب» ← «حذف الحساب». لا يمكن الحذف وأنت مسجّل في دورة جارية أو لديك طلب استرداد أو نزاع مفتوح.', 5, false),
('report-violation', 'account', 'كيف أبلّغ عن مخالفة؟',
 'من صفحة البرنامج أو المدرب أو الجهة اختر «الإبلاغ عن مخالفة». البلاغ سرّي ويراجعه فريق الامتثال خلال ٤٨ ساعة عمل.', 6, false)
on conflict (slug) do nothing;
