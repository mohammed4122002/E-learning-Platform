-- TRR-HLP-01/02 · مركز المساعدة للمدرب. Additive: audience + reading time + call-to-action columns on help_articles,
-- a per-user "هل أفادك هذا الدليل؟" table, and the trainer guides from the Figma frames (468:35979, 468:36359).
-- Body format: lead paragraph, then numbered steps as "## title\ntext" blocks separated by blank lines.

alter table public.help_articles add column if not exists audience text not null default 'trainee'
  check (audience in ('trainee', 'trainer'));
alter table public.help_articles add column if not exists read_minutes integer check (read_minutes between 1 and 60);
alter table public.help_articles add column if not exists cta_label text;
alter table public.help_articles add column if not exists cta_href text check (cta_href is null or cta_href like '/%');
create index if not exists help_articles_audience_idx on public.help_articles (audience, category, position);

create table public.help_article_feedback (
  article_id uuid not null references public.help_articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  helpful boolean not null,
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);
create index help_article_feedback_user_idx on public.help_article_feedback (user_id);
alter table public.help_article_feedback enable row level security;
create policy help_feedback_read_own on public.help_article_feedback for select to authenticated
  using (user_id = (select auth.uid()));
create policy help_feedback_insert_own on public.help_article_feedback for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy help_feedback_update_own on public.help_article_feedback for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

insert into public.help_articles (slug, category, title, body, position, is_featured, audience, read_minutes, cta_label, cta_href) values
-- البرامج
('trainer-successful-program', 'trainer_programs', 'دليل إنشاء برنامج ناجح',
 'البرنامج الجيد يُعتمد من أول مراجعة ويُشترى أكثر. هذه خمس نقاط تصنع الفرق.

## ابدأ من النتيجة لا من المحتوى
اسأل: ما الذي سيقدر المتدرب على فعله بعد البرنامج؟ اكتب الإجابة كفعل ونتيجة ومدة — «بناء مصفوفة مخاطر خلال ٤٥ دقيقة» لا «فهم إدارة المخاطر».

## ثلاثة أهداف تكفي
البرامج ذات ٣-٤ أهداف تُعتمد أسرع وتُقيَّم أعلى. الأهداف الكثيرة تُشتّت المتدرب وتصعّب قياس نجاحك.

## اربط كل محور بهدف
المراجع يفحص هذا أولًا: هل كل محور يخدم هدفًا معلنًا؟ المحور الذي لا يخدم هدفًا يُطلب حذفه أو تُطلب إضافة هدف له.

## الغلاف ليس تفصيليًا
البرنامج بلا غلاف يحصل على نقرات أقل بكثير. اختر صورة تعكس المجال لا صورة عامة — ولا ترفع صورًا لا تملك حقوقها.

## عاين قبل الإرسال
افتح «عاين كما يراه المتدرب» واقرأ الصفحة بعينه. أغلب التعديلات المطلوبة تُكتشف في هذه الخطوة قبل أن يراها المراجع.',
 1, true, 'trainer', 5, 'ابدأ برنامجًا الآن', '/trainer/programs'),
('trainer-measurable-objective', 'trainer_programs', 'كيف تكتب هدفًا قابلًا للقياس؟',
 'الهدف القابل للقياس يخبر المتدرب والمراجع بما سيتغيّر فعلًا بعد البرنامج.

## ابدأ بفعل يمكن ملاحظته
«يُعدّ» و«يحلّل» و«يبني» أفعال تُرى نتيجتها. تجنّب «يفهم» و«يتعرّف» لأنها لا تُقاس.

## أضف شرط الأداء
حدّد الأداة أو الموقف: «باستخدام نموذج المخاطر المرفق» أو «في حالة عملية من قطاع المتدرب».

## أضف معيار النجاح
مدة أو دقة أو عدد: «خلال ٤٥ دقيقة» أو «دون أخطاء في التصنيف». المعيار هو ما يجعل الهدف قابلًا للتحقق.',
 2, false, 'trainer', 3, null, null),
('trainer-program-vs-course', 'trainer_programs', 'ما الفرق بين البرنامج والدورة؟',
 'البرنامج هو المحتوى المعتمد. الدورة تنفيذ مجدول له بتاريخ ومكان ومقاعد.

## البرنامج يُعتمد مرة واحدة
تكتب الوصف والأهداف والمحاور والسعر المقترح، وتراجعه المنصة خلال ٣ أيام عمل. بعد الاعتماد يُحفظ كنسخة لا تتغيّر.

## الدورة تُنشأ من برنامج معتمد
لكل دورة تاريخ ونمط (حضوري أو مباشر أو مسجَّل) وعدد مقاعد. يمكنك تنفيذ البرنامج نفسه في دورات كثيرة دون مراجعة جديدة.',
 3, false, 'trainer', 2, null, null),
('trainer-program-returned', 'trainer_programs', 'لماذا رُدّ برنامجي للتعديل؟',
 'الردّ للتعديل ليس رفضًا — هو قائمة ملاحظات محدّدة تُعالجها ثم تعيد الإرسال.

## اقرأ السبب المصنَّف
يصلك الردّ مع سبب مصنَّف والحقل المعني: الأهداف أو المحاور أو الغلاف أو السعر.

## أكثر الأسباب شيوعًا
أهداف غير قابلة للقياس، محور لا يخدم أي هدف، صورة غلاف لا تملك حقوقها، أو وصف يعد بنتائج لا يقدّمها البرنامج.

## أعد الإرسال
عدّل الحقول المذكورة فقط ثم أرسل. المراجعة الثانية أسرع لأنها تفحص الملاحظات السابقة.',
 4, false, 'trainer', 4, null, null),
-- الدورات والجدولة
('trainer-scheduling-courses', 'trainer_courses', 'دليل جدولة الدورات',
 'الجدولة الجيدة تملأ المقاعد وتجنّبك التعارضات.

## ابدأ من تقويمك
أضف مواعيدك الشخصية وإجازاتك أولًا — المنصة تمنع إنشاء جلسة في وقت محجوز.

## اختر موعدًا يناسب جمهورك
الدورات المسائية ونهاية الأسبوع أنسب للموظفين، والصباحية أنسب لطلبات الجهات.

## اترك هامشًا بين الجلسات
ساعة على الأقل بين جلستين تمنع التأخير وتتيح لك رصد الحضور في وقته.',
 1, true, 'trainer', 6, 'افتح تقويمي', '/trainer/calendar'),
('trainer-choose-mode', 'trainer_courses', 'متى أختار حضوري أو مباشر أو مسجَّل؟',
 'النمط يحدّد جمهورك ودخلك وجهدك في كل دورة.

## حضوري
للمهارات العملية والورش التفاعلية وطلبات الجهات. دخل أعلى لكل دورة ومقاعد محدودة.

## مباشر عن بُعد
للمتدربين في مدن مختلفة. جلسات حيّة بلا تكلفة قاعة.

## مسجَّل
للمحتوى الثابت الذي لا يتغيّر كثيرًا. تنتجه خارج المنصة وتبيعه دون حضورك.',
 2, false, 'trainer', 4, null, null),
('trainer-upload-recorded-video', 'trainer_courses', 'كيف أرفع فيديو للدورة المسجَّلة؟',
 'المنصة لا توفّر أدوات تصوير أو تحرير — تنتج الفيديو خارجها ثم ترفعه للمراجعة والبيع.

## جهّز الملفات
فيديو واضح الصوت بصيغة MP4، ودرس لكل فكرة رئيسية.

## ارفع من صفحة الدورة
أضف الدروس بالترتيب، وارفع لكل درس ملفه ومدته.

## أرسل للمراجعة
تُراجع الدورة قبل النشر للتأكد من الجودة وحقوق المحتوى.',
 3, false, 'trainer', 3, null, null),
('trainer-attendance-rules', 'trainer_courses', 'قواعد رصد الحضور ومهلة الـ٤٨ ساعة',
 'الحضور أساس إصدار الشهادات، لذلك له مهلة محدّدة.

## ارصد بعد كل جلسة
اعرض رمز الحضور في القاعة أو سجّل الحضور يدويًا من صفحة الجلسة.

## المهلة ٤٨ ساعة
بعد انتهاء الجلسة بـ٤٨ ساعة يُقفل الرصد تلقائيًا، ويظهر لك البند في «بانتظار إجرائي» قبل ذلك.

## التعديل بعد القفل
يتطلب طلبًا لفريق الدعم مع السبب.',
 4, false, 'trainer', 3, null, null),
-- الفرص والعروض
('trainer-winning-offer', 'trainer_opportunities', 'كيف تكتب عرضًا يُقبل؟',
 'الجهات تقارن عروضًا كثيرة — العرض الواضح والمحدّد يتقدّم.

## ابدأ بفهم الطلب
أعد صياغة احتياج الجهة في سطرين قبل أي شيء آخر.

## اربط العرض بملفك
أشر إلى أعمال مشابهة من معرض أعمالك وتقييماتك في المجال نفسه.

## سعر واضح وجدول محدّد
حدّد السعر الإجمالي والمدة والتواريخ المقترحة من تقويمك المتاح.',
 1, true, 'trainer', 5, null, null),
('trainer-negotiate-terms', 'trainer_opportunities', 'متى أتفاوض على الشروط؟',
 'التفاوض مقبول ما دام قبل قبول العرض.

## قبل الإرسال
اسأل الجهة عن أي بند غير واضح في الطلب عبر المحادثات.

## بعد ردّ الجهة
إن طلبت الجهة تعديلًا، عدّل العرض نفسه بدل إرسال عرض جديد.',
 2, false, 'trainer', 4, null, null),
('trainer-what-do-i-need', 'trainer_opportunities', 'ما الذي يلزمني كله لأبدأ؟',
 'تسع مراحل تفصلك عن أول إيراد، وأول ثلاث منها تستغرق عشر دقائق.

## التوثيق والملف
وثّق هويتك وأكمل ملفك المهني ومؤهلاتك.

## البرنامج ثم الدورة
أنشئ برنامجك الأول وانتظر اعتماده، ثم جدول أول دورة منه.

## المتدربون والإيرادات
بعد نشر الدورة تستقبل التسجيلات، وتظهر أرباحك في رصيدك.',
 3, false, 'trainer', 6, 'اعرض مسار الاعتماد', '/trainer/journey'),
-- المالي والتسوية
('trainer-when-paid', 'trainer_finance', 'متى يصلني المال ولماذا يتأخر؟',
 'أرباح كل دورة تمرّ بمرحلتين قبل أن تصبح قابلة للسحب.

## معلّق
من لحظة الدفع حتى انتهاء الدورة وانقضاء مهلة استرداد المتدربين.

## متاح للسحب
بعد انقضاء المهلة يُضاف المبلغ صافيًا بعد العمولة إلى رصيدك المتاح.

## أسباب التأخير
بيانات تحويل غير مكتملة، أو نزاع مفتوح على إحدى الدفعات.',
 1, true, 'trainer', 4, null, null),
('trainer-platform-commission', 'trainer_finance', 'كيف تُحتسب عمولة المنصة؟',
 'العمولة نسبة من سعر الدورة قبل ضريبة القيمة المضافة.

## النسبة الحالية
١٠٪ — قيمة تشغيلية مؤقتة وفق إعدادات المنصة.

## مثال
دورة بسعر ١٬٠٠٠ ر.س: تُخصم ١٠٠ ر.س عمولة، ويصلك ٩٠٠ ر.س.',
 2, false, 'trainer', 2, null, null),
('trainer-refund-impact', 'trainer_finance', 'ماذا يحدث عند استرداد متدرب؟',
 'الاسترداد يتم وفق شرائح معلنة للمتدرب قبل التسجيل.

## قبل بدء الدورة
يُسترد المبلغ وفق الشريحة، ويُخصم من رصيدك المعلّق.

## بعد إصدار الشهادة
لا يُقبل الاسترداد إلا بقرار من إدارة المنصة.',
 3, false, 'trainer', 3, null, null),
-- الملف والاعتماد
('trainer-portfolio-what-counts', 'trainer_profile', 'ما الذي يصلح كعمل في معرضك؟',
 'المعرض يعرض أعمالًا حقيقية نفّذتها أو أعددتها.

## يصلح
ورشة أو دورة نفّذتها، مادة تدريبية أعددتها، برنامج بنيته لجهة.

## لا يصلح
مواد لا تملك حقوقها، أو صور متدربين دون إذنهم.',
 1, false, 'trainer', 3, 'افتح معرض أعمالي', '/trainer/profile/portfolio'),
('trainer-org-affiliation', 'trainer_profile', 'كيف يعمل الارتباط بجهة تدريبية؟',
 'الارتباط يسمح لك بتنفيذ دورات باسم جهة تدريبية معتمدة.

## الدعوة
تصلك دعوة من الجهة في «بانتظار إجرائي» ولك أن تقبلها أو ترفضها.

## بعد القبول
تظهر الجهة في ملفك العام كإشارة ثقة، وتُنشأ دوراتها بإشرافها.',
 2, false, 'trainer', 4, null, null),
('trainer-raise-rating', 'trainer_profile', 'كيف أرفع تقييمي العام؟',
 'التقييم العام متوسط تقييمات المتدربين لأدائك كمدرب.

## ردّ على التقييمات
الردّ المهذّب على التقييم المنخفض يرفع ثقة القرّاء.

## حسّن ما يُذكر كثيرًا
راجع التعليقات المتكررة وعدّل برنامجك في الإصدار التالي.',
 3, false, 'trainer', 3, null, null)
on conflict (slug) do nothing;

revoke all on table public.help_article_feedback from anon;
