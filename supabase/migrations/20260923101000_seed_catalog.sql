-- Initial catalog content, taken from the Figma frames (TRN-DSH-01, TRN-DSC-01, TRN-CRS-06).
-- Catalog owners are platform-created trainer accounts with random, unusable passwords; they can be
-- handed over to the real trainers later (password reset) or replaced once the trainer workspace ships.

do $$
declare
  t_salem uuid := gen_random_uuid();
  t_noura uuid := gen_random_uuid();
  t_fahad uuid := gen_random_uuid();
  org_masar uuid;
  cat record;
  p uuid; v uuid; c uuid; m uuid;
  i int;
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    ('00000000-0000-0000-0000-000000000000', t_salem, 'authenticated', 'authenticated', 'trainer.salem@seed.invalid',
     extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"م. سالم بن أحمد الحارثي"}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', t_noura, 'authenticated', 'authenticated', 'trainer.noura@seed.invalid',
     extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"د. نورة العتيبي"}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', t_fahad, 'authenticated', 'authenticated', 'trainer.fahad@seed.invalid',
     extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"م. فهد القحطاني"}', now(), now());

  update public.profiles set headline = 'مدرب معتمد', city = 'الرياض' where id in (t_salem, t_noura, t_fahad);
  insert into public.user_workspaces (user_id, kind, is_default) values
    (t_salem, 'trainer', true), (t_noura, 'trainer', true), (t_fahad, 'trainer', true);

  insert into public.organizations (kind, name, slug, city, verification_status, created_by)
  values ('provider', 'معهد المسار للتدريب', 'al-masar-institute', 'الرياض', 'verified', t_fahad)
  returning id into org_masar;
  insert into public.organization_members (organization_id, user_id, role) values (org_masar, t_fahad, 'owner');

  insert into public.categories (slug, name, position) values
    ('business', 'إدارة أعمال', 1), ('leadership', 'قيادة', 2), ('programming', 'برمجة', 3),
    ('data', 'تحليل بيانات', 4), ('finance', 'المحاسبة والمالية', 5), ('design', 'تصميم', 6),
    ('hr', 'الموارد البشرية', 7), ('marketing', 'تسويق', 8);

  -- helper: one published program + v1 snapshot per course
  for cat in
    select * from (values
      ('project-management-basics', 'أساسيات إدارة المشاريع', 'business', 'in_person'::public.course_mode, org_masar, t_fahad,
       'continue-project-management', '{"top":-25.71,"left":0,"width":100,"height":125.68}', 0::numeric, 25, 12, 'beginner'::public.course_level,
       'منهج عملي لتخطيط المشاريع ومتابعتها من الفكرة حتى التسليم، بأدوات تستخدمها فورًا في عملك.'),
      ('business-administration-basics', 'أساسيات إدارة الأعمال', 'business', 'in_person'::public.course_mode, org_masar, t_fahad,
       'continue-business-administration', '{"top":-25.73,"left":0,"width":100,"height":125.68}', 450, 30, 10, 'beginner',
       'مدخل متكامل إلى وظائف المنشأة: التخطيط والتنظيم والتوجيه والرقابة، مع حالات من السوق المحلي.'),
      ('design-basics', 'أساسيات التصميم', 'design', 'live_remote'::public.course_mode, null::uuid, t_noura,
       'continue-design', '{"top":-25.85,"left":0,"width":100,"height":125.68}', 320, 40, 8, 'beginner',
       'مبادئ التكوين واللون والطباعة وبناء الهوية البصرية، في جلسات مباشرة عن بُعد مع تطبيقات أسبوعية.'),
      ('modern-web-development', 'أساسيات تطوير الويب الحديث', 'programming', 'recorded'::public.course_mode, null::uuid, t_noura,
       'recommended-web-development', '{"top":-22.64,"left":-0.11,"width":100,"height":125.68}', 240, null::int, 0, 'beginner',
       'ابنِ أول موقع تفاعلي لك باستخدام HTML وCSS وJavaScript الحديثة، خطوة بخطوة.'),
      ('effective-leadership', 'القيادة الإدارية الفعّالة', 'leadership', 'live_remote'::public.course_mode, null::uuid, t_salem,
       'recommended-effective-leadership', '{"top":-33.13,"left":-4.91,"width":109.73,"height":137.91}', 240, 35, 6, 'intermediate',
       'كيف تقود فريقك بوضوح: تفويض فعّال، اجتماعات منتجة، وتغذية راجعة تُحدث فرقًا.'),
      ('financial-leadership', 'القيادة الإدارية المالية', 'leadership', 'in_person'::public.course_mode, org_masar, t_salem,
       'recommended-financial-leadership', '{"top":-19.15,"left":0,"width":100,"height":125.68}', 240, 20, 6, 'intermediate',
       'اتخاذ القرار المالي للقادة غير الماليين: الموازنات، مؤشرات الأداء، وتقييم الاستثمارات.')
    ) as x(slug, title, cat_slug, mode, org, trainer, cover, crop, price, capacity, sessions, level, summary)
  loop
    insert into public.programs (slug, title, summary, category_id, level, owner_id, organization_id, status)
    values (cat.slug, cat.title, cat.summary, (select id from public.categories where slug = cat.cat_slug), cat.level,
            cat.trainer, cat.org, 'published')
    returning id into p;
    insert into public.program_versions (program_id, version, snapshot)
    values (p, 1, jsonb_build_object('title', cat.title, 'summary', cat.summary,
      'objectives', jsonb_build_array('فهم المفاهيم الأساسية وتطبيقها عمليًا', 'بناء أدوات عمل قابلة للاستخدام فورًا',
                                      'التعامل مع حالات واقعية من السوق', 'الحصول على شهادة إتمام قابلة للتحقق'),
      'audience', jsonb_build_array('الموظفون الراغبون في تطوير مهاراتهم', 'حديثو التخرج', 'رواد الأعمال'),
      'requirements', jsonb_build_array('لا تحتاج خلفية مسبقة')))
    returning id into v;
    insert into public.courses (slug, program_id, program_version_id, trainer_id, organization_id, title, summary, mode, level,
                                cover_path, cover_crop, city, venue, starts_at, ends_at, duration_hours, capacity, min_capacity,
                                price, status, requires_provider_approval, rating_avg, rating_count, learners_count)
    values (cat.slug, p, v, cat.trainer, cat.org, cat.title, cat.summary, cat.mode, cat.level,
            '/assets/images/' || cat.cover || '.jpg', cat.crop::jsonb,
            case when cat.mode = 'in_person' then 'الرياض' end,
            case when cat.mode = 'in_person' then 'مقر معهد المسار — حي العليا' end,
            case when cat.mode = 'recorded' then null else date_trunc('day', now()) + interval '14 days' + interval '17 hours' end,
            case when cat.mode = 'recorded' then null else date_trunc('day', now()) + interval '14 days' + (cat.sessions * interval '3 days') + interval '19 hours' end,
            18, cat.capacity, case when cat.capacity is null then null else 8 end,
            cat.price, 'open', cat.org is not null, 0, 0, 0)
    returning id into c;
    if cat.mode <> 'recorded' then
      for i in 1..cat.sessions loop
        insert into public.course_sessions (course_id, position, title, starts_at, ends_at, location)
        values (c, i, 'الجلسة ' || i,
                date_trunc('day', now()) + interval '14 days' + ((i - 1) * interval '3 days') + interval '17 hours',
                date_trunc('day', now()) + interval '14 days' + ((i - 1) * interval '3 days') + interval '19 hours',
                case when cat.mode = 'in_person' then 'مقر معهد المسار — حي العليا' else 'جلسة مباشرة عبر المنصة' end);
      end loop;
    end if;
  end loop;

  -- TRN-CRS-06 · مقدمة في المحاسبة الإدارية (recorded, full syllabus from the sale page).
  insert into public.programs (slug, title, summary, category_id, level, owner_id, status)
  values ('intro-managerial-accounting', 'مقدمة في المحاسبة الإدارية',
          'تعلّم كيف تقرأ القوائم المالية وتحوّلها إلى قرارات — بأمثلة من شركات حقيقية وتمارين تطبّقها فورًا.',
          (select id from public.categories where slug = 'finance'), 'beginner', t_salem, 'published')
  returning id into p;
  insert into public.program_versions (program_id, version, snapshot)
  values (p, 1, jsonb_build_object(
    'title', 'مقدمة في المحاسبة الإدارية',
    'objectives', jsonb_build_array('قراءة قائمة الدخل والميزانية خلال ١٥ دقيقة', 'حساب التكلفة الحقيقية لأي منتج أو خدمة',
                                    'بناء موازنة تشغيلية لقسمك من الصفر', 'تحويل الأرقام المالية إلى قرارات عملية'),
    'audience', jsonb_build_array('موظفون في أقسام غير مالية', 'رواد أعمال ومؤسسو شركات', 'طلاب إدارة أعمال'),
    'requirements', jsonb_build_array('لا تحتاج خلفية محاسبية', 'إلمام أساسي بالإكسل مفيد لا إلزامي'),
    'faq', jsonb_build_array(
      jsonb_build_object('q', 'متى أبدأ الدورة؟', 'a', 'فور إتمام الدفع — الوصول فوري ولا مواعيد ولا انتظار.'),
      jsonb_build_object('q', 'كم أملك من الوقت لإنهائها؟', 'a', 'وصولك دائم بلا انتهاء صلاحية. تشاهد بإيقاعك ومتى شئت.'),
      jsonb_build_object('q', 'هل أحصل على شهادة؟', 'a', 'نعم — بعد مشاهدة ١٠٠٪ من الدروس. الشهادة برابط تحقق دائم.'),
      jsonb_build_object('q', 'ماذا لو لم تناسبني؟', 'a', 'استرداد كامل خلال ١٤ يومًا من الشراء بلا أسئلة.'),
      jsonb_build_object('q', 'هل يضيف المدرب محتوى جديدًا؟', 'a', 'نعم — والمحتوى الجديد يصلك مجانًا ويُحدَّث في نسبة إكمالك.'))))
  returning id into v;
  insert into public.courses (slug, program_id, program_version_id, trainer_id, title, summary, mode, level, cover_path,
                              duration_hours, price, status, rating_avg, rating_count, learners_count)
  values ('intro-managerial-accounting', p, v, t_salem, 'مقدمة في المحاسبة الإدارية',
          'تعلّم كيف تقرأ القوائم المالية وتحوّلها إلى قرارات — بأمثلة من شركات حقيقية وتمارين تطبّقها فورًا.',
          'recorded', 'beginner', null, 6.3, 120, 'open', 0, 0, 0)
  returning id into c;

  insert into public.course_modules (course_id, position, title) values (c, 1, 'أساسيات المحاسبة الإدارية') returning id into m;
  insert into public.lessons (course_id, module_id, position, title, kind, duration_seconds, is_preview) values
    (c, m, 1, 'لماذا تحتاج المحاسبة الإدارية؟', 'video', 495, true),
    (c, m, 2, 'الفرق بين المحاسبة المالية والإدارية', 'video', 760, false),
    (c, m, 3, 'مصطلحات أساسية تحتاجها كل يوم', 'video', 1080, false),
    (c, m, 4, 'كيف تُبنى القرارات على الأرقام', 'video', 1320, false),
    (c, m, 5, 'ملخّص الوحدة الأولى', 'file', 0, false),
    (c, m, 6, 'اختبار الوحدة الأولى', 'quiz', 0, false);
  insert into public.course_modules (course_id, position, title) values (c, 2, 'القوائم المالية') returning id into m;
  insert into public.lessons (course_id, module_id, position, title, kind, duration_seconds) values
    (c, m, 1, 'قراءة قائمة الدخل', 'video', 1020), (c, m, 2, 'قراءة الميزانية العمومية', 'video', 1080),
    (c, m, 3, 'قائمة التدفقات النقدية', 'video', 960), (c, m, 4, 'النسب المالية الأساسية', 'video', 900),
    (c, m, 5, 'تمرين: حلّل قوائم شركة حقيقية', 'file', 840);
  insert into public.course_modules (course_id, position, title) values (c, 3, 'تحليل التكاليف') returning id into m;
  insert into public.lessons (course_id, module_id, position, title, kind, duration_seconds) values
    (c, m, 1, 'التكاليف الثابتة والمتغيرة', 'video', 1380), (c, m, 2, 'تحليل التعادل', 'video', 1500),
    (c, m, 3, 'التكلفة الحقيقية للمنتج', 'video', 1440), (c, m, 4, 'اختبار تحليل التكاليف', 'quiz', 1380);
  insert into public.course_modules (course_id, position, title) values (c, 4, 'الموازنات واتخاذ القرار') returning id into m;
  insert into public.lessons (course_id, module_id, position, title, kind, duration_seconds) values
    (c, m, 1, 'بناء موازنة تشغيلية', 'video', 2160), (c, m, 2, 'مقارنة الفعلي بالمخطط', 'video', 2040),
    (c, m, 3, 'قرارات الشراء أو التصنيع', 'video', 1980);

  insert into public.quizzes (course_id, lesson_id, title, pass_percent, questions)
  values (c, (select l.id from public.lessons l where l.course_id = c and l.title = 'اختبار الوحدة الأولى'),
          'اختبار الوحدة الأولى', 60, jsonb_build_array(
    jsonb_build_object('id', 'q1', 'text', 'ما الهدف الرئيسي للمحاسبة الإدارية؟', 'answer', '1',
      'options', jsonb_build_array('إعداد التقارير للجهات الخارجية', 'دعم قرارات الإدارة الداخلية', 'حساب الضرائب فقط', 'مراجعة الحسابات')),
    jsonb_build_object('id', 'q2', 'text', 'لمن تُعدّ تقارير المحاسبة المالية أساسًا؟', 'answer', '2',
      'options', jsonb_build_array('المدير المباشر فقط', 'فريق المبيعات', 'المستثمرين والجهات الخارجية', 'الموردين فقط')),
    jsonb_build_object('id', 'q3', 'text', 'أيّ مما يلي تكلفة ثابتة غالبًا؟', 'answer', '0',
      'options', jsonb_build_array('إيجار المكتب', 'المواد الخام', 'عمولات المبيعات', 'تكلفة الشحن لكل طلب')),
    jsonb_build_object('id', 'q4', 'text', 'تقارير المحاسبة الإدارية تكون عادةً:', 'answer', '1',
      'options', jsonb_build_array('ملزمة بمعايير دولية صارمة', 'مرنة وموجّهة للمستقبل', 'سنوية فقط', 'غير رقمية')),
    jsonb_build_object('id', 'q5', 'text', 'ما الذي يقيسه هامش المساهمة؟', 'answer', '3',
      'options', jsonb_build_array('إجمالي الأصول', 'صافي الربح بعد الضرائب', 'التدفق النقدي', 'الإيراد ناقص التكاليف المتغيرة')),
    jsonb_build_object('id', 'q6', 'text', 'الموازنة التشغيلية أداة لـ:', 'answer', '0',
      'options', jsonb_build_array('التخطيط والرقابة', 'تسجيل القيود اليومية', 'حساب الإهلاك فقط', 'إعداد الإقرار الضريبي')),
    jsonb_build_object('id', 'q7', 'text', 'نقطة التعادل هي حين:', 'answer', '2',
      'options', jsonb_build_array('تتضاعف الإيرادات', 'تنخفض التكاليف الثابتة', 'تتساوى الإيرادات مع التكاليف', 'يتوقف الإنتاج')),
    jsonb_build_object('id', 'q8', 'text', 'أيّ القرارات التالية تدعمه المحاسبة الإدارية مباشرة؟', 'answer', '1',
      'options', jsonb_build_array('اختيار شعار الشركة', 'الشراء أو التصنيع الداخلي', 'تحديد ساعات الدوام الرسمية', 'تصميم الموقع الإلكتروني'))));

  -- Web development syllabus (recorded course needs lessons to be completable).
  select id into c from public.courses where slug = 'modern-web-development';
  insert into public.course_modules (course_id, position, title) values (c, 1, 'أساسيات الويب') returning id into m;
  insert into public.lessons (course_id, module_id, position, title, kind, duration_seconds, is_preview) values
    (c, m, 1, 'كيف يعمل الويب؟', 'video', 720, true), (c, m, 2, 'هيكل صفحة HTML', 'video', 1260, false),
    (c, m, 3, 'التنسيق باستخدام CSS', 'video', 1500, false);
  insert into public.course_modules (course_id, position, title) values (c, 2, 'التفاعل مع JavaScript') returning id into m;
  insert into public.lessons (course_id, module_id, position, title, kind, duration_seconds) values
    (c, m, 1, 'المتغيرات والدوال', 'video', 1380), (c, m, 2, 'التعامل مع عناصر الصفحة', 'video', 1440),
    (c, m, 3, 'مشروع: قائمة مهام تفاعلية', 'video', 2100);

  insert into public.discount_codes (code, percent_off, max_uses, valid_until) values ('WELCOME10', 10, 1000, now() + interval '1 year');
end $$;
