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
