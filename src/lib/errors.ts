/**
 * Maps machine error codes raised by the database RPCs (P0001 MESSAGE) and Supabase Auth to
 * user-facing Arabic copy. Unknown errors never leak raw messages to the UI.
 */
const MESSAGES: Record<string, string> = {
  // generic
  not_authenticated: "انتهت جلستك. سجّل دخولك مرة أخرى للمتابعة.",
  forbidden: "لا تملك صلاحية تنفيذ هذا الإجراء.",
  not_found: "لم نعثر على العنصر المطلوب، ربما حُذف أو لم يعد متاحًا.",
  invalid_input: "تحقّق من البيانات المُدخلة ثم أعد المحاولة.",
  invalid_state: "لا يمكن تنفيذ هذا الإجراء في الحالة الحالية.",
  network: "تعذّر الاتصال بالخادم. تحقّق من اتصالك وأعد المحاولة.",
  // workspaces
  workspace_limit: "يمكنك امتلاك أربع مساحات كحد أقصى.",
  organization_name_required: "أدخل اسم المنشأة (حرفان على الأقل).",
  // enrollment & payment
  course_unavailable: "التسجيل في هذه الدورة غير متاح حاليًا.",
  already_enrolled: "أنت مسجّل في هذه الدورة مسبقًا.",
  course_full: "اكتملت المقاعد في هذه الدورة. يمكنك الانضمام إلى قائمة الانتظار.",
  invalid_discount_code: "رمز الخصم غير صالح أو منتهي الصلاحية.",
  hold_expired: "انتهت مهلة حجز المقعد (١٥ دقيقة). ابدأ التسجيل من جديد.",
  payment_in_progress: "لديك عملية دفع قيد التنفيذ لهذا الطلب. انتظر نتيجتها قبل المحاولة مجددًا.",
  payments_unavailable: "بوابة الدفع غير مفعّلة بعد. تواصل مع الدعم لإتمام التسجيل.",
  // waitlist
  seats_available: "ما زالت هناك مقاعد متاحة — يمكنك التسجيل مباشرة.",
  already_waitlisted: "أنت في قائمة الانتظار لهذه الدورة مسبقًا.",
  invite_expired: "انتهت مهلة قبول المقعد، وانتقلت الدعوة إلى التالي في القائمة.",
  // refunds & disputes
  nothing_to_refund: "لا يوجد مبلغ مدفوع قابل للاسترداد لهذا التسجيل.",
  refund_already_requested: "لديك طلب استرداد قيد المراجعة لهذا التسجيل.",
  dispute_already_open: "يوجد نزاع مفتوح لهذه العملية بالفعل.",
  too_many_files: "يمكن إرفاق خمسة ملفات كحد أقصى.",
  // learning
  not_enrolled: "هذا المحتوى متاح للمسجّلين في الدورة فقط.",
  deadline_passed: "انقضى موعد تسليم هذا الواجب.",
  invalid_code: "رمز الحضور غير صحيح. امسح الرمز المعروض في القاعة مرة أخرى.",
  code_expired: "انتهت صلاحية رمز الحضور. اطلب من المدرب عرض رمز جديد.",
  not_eligible: "يمكنك تقييم الدورة بعد بدء حضورها.",
  // account
  verification_exists: "لديك طلب توثيق قيد المراجعة أو حساب موثّق بالفعل.",
  account_has_commitments: "لا يمكن حذف الحساب وأنت مسجّل في دورة جارية أو لديك طلب استرداد أو نزاع مفتوح.",
  price_locked: "السعر مقفل بعد أول تسجيل مدفوع.",
  // auth
  invalid_credentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  email_not_confirmed: "أكّد بريدك الإلكتروني أولًا — أرسلنا لك رمز التحقق.",
  user_already_exists: "يوجد حساب مسجّل بهذا البريد. سجّل الدخول بدلًا من ذلك.",
  email_exists: "يوجد حساب مسجّل بهذا البريد. سجّل الدخول بدلًا من ذلك.",
  weak_password: "كلمة المرور ضعيفة. استخدم ٨ أحرف على الأقل تجمع حروفًا وأرقامًا.",
  over_email_send_rate_limit: "أرسلنا رسائل كثيرة خلال وقت قصير. انتظر دقيقة ثم أعد المحاولة.",
  over_request_rate_limit: "محاولات كثيرة خلال وقت قصير. انتظر قليلًا ثم أعد المحاولة.",
  otp_expired: "انتهت صلاحية الرمز أو أنه غير صحيح. اطلب رمزًا جديدًا.",
  same_password: "كلمة المرور الجديدة يجب أن تختلف عن الحالية.",
  // learning experience (quizzes & assignments)
  attempts_exhausted: "استنفدت عدد المحاولات المتاحة. تواصل مع المدرب إن احتجت محاولة إضافية.",
  already_passed: "اجتزت هذا الاختبار مسبقًا — لا حاجة لمحاولة جديدة.",
  already_accepted: "اعتُمد هذا الواجب مسبقًا، ولا يمكن تسليم نسخة جديدة.",
  // certificates, ratings & support (TRN-CRT / RTG / RPT)
  already_rated: "قيّمت هذه الدورة مسبقًا. التقييم يُرسل مرة واحدة ولا يمكن تعديله.",
  rating_closed: "انتهت مهلة التقييم (٣٠ يومًا بعد انتهاء الدورة).",
  report_not_open: "لا يمكن سحب البلاغ بعد بدء مراجعته.",
  upload_failed: "تعذّر رفع الملف. تحقّق من نوعه وحجمه ومن اتصالك ثم أعد المحاولة.",
  // trainings, refunds, disputes, live sessions (TRN-MYE / TRN-RFD / TRN-DSP)
  refund_not_eligible: "لا يستحق هذا التسجيل استردادًا وفق شرائح الاسترداد المعلنة.",
  withdraw_first: "انسحب من الدورة أولًا — يُحسب مبلغ الاسترداد من تاريخ انسحابك.",
  already_refunded: "اعتُمد استرداد هذا التسجيل مسبقًا.",
  session_not_live: "لم يبدأ المدرب الجلسة بعد. ستتمكن من الدخول فور بدئها.",
  meeting_unavailable: "تعذّر الاتصال بالجلسة لأن رابطها غير متاح بعد. أعد المحاولة بعد قليل.",
  session_closed: "انتهت هذه الجلسة أو أُلغيت ولم يعد الدخول إليها متاحًا.",
  // trainer programs (TRR-PRG / TRR-DEC)
  program_locked: "البرنامج مقفل للتعديل الآن — أثناء المراجعة أو بعد النشر. اسحب الطلب أو أنشئ نسخة جديدة لتعديله.",
  program_incomplete: "أكمل الحقول الإلزامية قبل الإرسال: الغلاف والوصف والتصنيف والساعات والأهداف والمحتوى والسعر.",
  declaration_required: "راجع كل بند في الإقرار وأشّر عليه قبل الإرسال.",
  review_already_decided: "صدر قرار المراجعة قبل سحب الطلب — لم يعد السحب ممكنًا.",
  // trainer workspace (TRR-PRF / TRR-CAL)
  qualification_locked: "هذا المؤهل متحقَّق منه من المنصة ولا يمكن تعديله أو حذفه.",
  calendar_conflict: "يتعارض هذا الموعد مع جلسة من دوراتك. اختر وقتًا آخر أو انقل الجلسة أولًا.",
  invalid_time_range: "وقت الانتهاء يجب أن يكون بعد وقت البداية.",
  event_too_long: "لا يمكن أن يتجاوز الموعد ٦٠ يومًا — قسّمه إلى مواعيد أقصر.",
  // trainer course operations (TRR-CRS-03/04/11, TRR-ATT, TRR-RES, TRR-CRT, TRR-RTG)
  capacity_below_enrolled: "لا يمكن النزول تحت عدد المسجّلين حاليًا — لا يُلغى تسجيل أحد لتقليل المقاعد.",
  waitlist_empty: "لا أحد في قائمة الانتظار الآن.",
  no_free_seats: "لا مقاعد شاغرة الآن — زد عدد المقاعد أو أخرج متدربًا لم يدفع أولًا.",
  course_already_started: "بدأت الدورة بالفعل، فلا يمكن تأجيلها. يمكنك تعديل مواعيد الجلسات القادمة بدلًا من ذلك.",
  invalid_dates: "تحقّق من التواريخ: البداية بعد اليوم والنهاية بعد آخر جلسة.",
  session_not_started: "لم تبدأ هذه الجلسة بعد — يُفتح الرصد عند بدايتها.",
  attendance_locked: "أُقفل رصد هذه الجلسة بعد مرور ٤٨ ساعة على انتهائها. اطلب فتح الرصد من الدعم.",
  reason_required: "هذه الجلسة معتمدة — اكتب سبب التعديل قبل الحفظ.",
  attendance_incomplete: "حدّد حالة كل متدرب قبل اعتماد الحضور.",
  unlock_already_requested: "أرسلت طلب فتح لهذه الجلسة مسبقًا، وهو قيد المراجعة.",
  results_locked: "اعتُمدت نتائج هذه الدورة نهائيًا ولا يمكن تعديلها إلا بطلب من الإدارة.",
  invalid_score: "الدرجة خارج المدى المسموح لهذا المعيار.",
  results_blocked: "لا يمكن اعتماد النتائج قبل إغلاق الشروط الناقصة.",
  results_missing: "احسب النتائج أولًا ثم اعتمدها.",
  results_not_approved: "لا تُصدر الشهادات قبل اعتماد نتائج الدورة.",
  certificate_not_eligible: "هذا المتدرب غير مستحق للشهادة حسب نتيجته المعتمدة.",
  no_eligible_trainees: "لا يوجد متدربون مستحقون لشهادة البرنامج بعد.",
  reply_final: "أرسلت ردك على هذا التقييم مسبقًا، والرد نهائي لا يُعدّل.",
  reply_too_short: "اكتب ردًا من ١٠ أحرف على الأقل.",
  review_already_requested: "طلبت مراجعة هذا التقييم مسبقًا، والطلب قيد المراجعة.",
  recently_requested: "أرسلت طلب تقييم للمتدربين خلال آخر ٣ أيام. انتظر قليلًا قبل التذكير مجددًا.",
  nobody_to_notify: "لا يوجد من يصله هذا الإشعار الآن.",
  // trainer courses (TRR-CRS-01…09)
  program_not_published: "لا يمكن إنشاء دورة إلا من برنامج منشور ومعتمد.",
  publish_incomplete: "أكمل الشروط الناقصة قبل نشر الدورة.",
  already_published: "هذه الدورة منشورة بالفعل.",
  ack_required: "أشّر على الإقرار أولًا ليُفعَّل النشر.",
  mode_locked: "لا يمكن تغيير نمط التقديم بعد نشر الدورة.",
  field_locked: "لا يمكن تعديل هذا الحقل بعد نشر الدورة — استخدم التأجيل أو أنشئ دورة جديدة.",
  session_locked: "لا يمكن تعديل جلسة بدأت أو انتهت أو أُلغيت.",
  module_locked: "المحاور موروثة من البرنامج ولا تُعدَّل في الدورة.",
  content_in_use: "لا يمكن حذف درس بدأه المتدربون — تقدّمهم وشهاداتهم مرتبطة به.",
  invalid_quiz: "أكمل كل سؤال: نص السؤال وخياران على الأقل وحدّد الإجابة الصحيحة.",
  lessons_without_material: "بعض الدروس بلا مادة — ارفع الفيديو أو الملف أو اكتب النص أولًا.",
  sales_paused: "البيع موقوف مؤقتًا لهذه الدورة.",
  waitlist_disabled: "قائمة الانتظار غير مفعّلة لهذه الدورة.",
  // trainer affiliations, contracts and content reports (TRR-AFL / TRR-CTR / TRR-RPT)
  invitation_expired: "انتهت مهلة هذه الدعوة ولم يعد بالإمكان قبولها أو رفضها.",
  invitation_not_pending: "سبق الرد على هذه الدعوة أو سحبتها الجهة.",
  invitation_pending: "توجد دعوة ارتباط قائمة لهذا المدرب بانتظار رده.",
  already_affiliated: "أنت مرتبط بهذه الجهة بالفعل.",
  exclusive_conflict: "لا يمكن الجمع بين ارتباط حصري وارتباطات أخرى. أنهِ الارتباط الحالي أولًا أو تفاوض على شرط الحصرية.",
  affiliation_not_active: "هذا الارتباط ليس نشطًا — أُنهي أو يسري إنهاؤه.",
  affiliation_not_ending: "لا يوجد إشعار إنهاء منك يمكن التراجع عنه لهذا الارتباط.",
  end_reason_required: "اختر سبب الإنهاء.",
  end_ack_required: "أشّر على الإقرار أولًا ليُفعَّل الإنهاء.",
  not_provider: "الارتباط متاح للجهات التدريبية فقط.",
  not_a_trainer: "هذا الحساب لا يملك مساحة مدرب.",
  contract_exists: "يوجد عقد قائم لهذا المصدر بالفعل.",
  contract_locked: "لا يمكن تعديل هذا العقد في حالته الحالية.",
  contract_not_draft: "أُرسل هذا العقد مسبقًا.",
  contract_not_sent: "لم تُرسل الجهة هذا العقد للتوقيع بعد.",
  contract_version_locked: "نسخة العقد المرسلة لا تُعدَّل — تُنشأ نسخة جديدة بدلًا منها.",
  contract_version_changed: "أرسلت الجهة نسخة أحدث من العقد. راجعها قبل التوقيع.",
  contract_expired: "انتهت مهلة توقيع هذا العقد.",
  contract_already_signed: "وقّعت هذا العقد مسبقًا.",
  contract_not_signed_by_trainer: "العقد بانتظار توقيع المدرب أولًا.",
  consent_required: "أشّر على إقرار المراجعة قبل التوقيع.",
  signature_name_required: "اكتب اسمك الكامل للتوقيع.",
  signature_name_mismatch: "اكتب اسمك الكامل كما يظهر في ملفك تمامًا.",
  signature_immutable: "التوقيع المسجَّل لا يُعدَّل ولا يُحذف.",
  termination_reason_required: "اكتب سبب إنهاء العقد (٥ أحرف على الأقل).",
  bids_unavailable: "العروض غير متاحة بعد — لا يمكن إنشاء عقد من عرض الآن.",
  bid_not_accepted: "لا يُنشأ العقد إلا من عرض قبلته الجهة.",
  report_closed: "أُغلق هذا البلاغ أو صدر فيه قرار — لم يعد الرد متاحًا.",
  already_responded: "أرسلت ردك على هذا البلاغ مسبقًا.",
  response_too_short: "اشرح موقفك بتفصيل أكثر (٢٠ حرفًا على الأقل).",
  no_decision: "لم يصدر قرار في هذا البلاغ بعد.",
  nothing_to_appeal: "أُغلق البلاغ لصالحك — لا يوجد ما تتظلّم عليه.",
  decision_accepted: "قبلت هذا القرار مسبقًا، فلا يمكن التظلّم عليه.",
  appeal_exists: "قدّمت تظلّمًا على هذا القرار مسبقًا — المراجعة واحدة فقط.",
  appeal_window_closed: "انتهت مهلة التظلّم (٧ أيام من صدور القرار).",
  appeal_ack_required: "أشّر على الإقرار بأن قرار المراجعة نهائي قبل الإرسال.",
  basis_required: "اختر أساس تظلّمك.",
  appeal_too_short: "اشرح دليلك بتفصيل أكثر (٢٠ حرفًا على الأقل).",
  appeal_decided: "صدر قرار في هذا التظلّم بالفعل.",
  same_reviewer: "يراجع التظلّم مسؤول لم يشارك في القرار الأول.",
};

export const GENERIC_ERROR = "حدث خطأ غير متوقع. أعد المحاولة، وإن تكرر تواصل مع الدعم.";

type ErrorLike = { code?: string | null; message?: string | null } | null | undefined;

/** Arabic message for a Supabase/PostgREST/Auth error. */
export function toArabicError(error: ErrorLike): string {
  if (!error) return GENERIC_ERROR;
  const key = (error.code && MESSAGES[error.code] ? error.code : error.message) ?? "";
  return MESSAGES[key] ?? GENERIC_ERROR;
}

export function errorCode(error: ErrorLike): string | null {
  if (!error) return null;
  if (error.code && MESSAGES[error.code]) return error.code;
  return error.message && MESSAGES[error.message] ? error.message : null;
}
