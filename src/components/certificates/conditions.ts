import type { LucideIcon } from "lucide-react";
import { CalendarCheck, ClipboardCheck, ListChecks, MonitorPlay } from "lucide-react";
import { formatDayMonth, formatSessionTime, pluralAr, toArabicDigits } from "@/lib/format";
import type { CertificateCondition } from "@/lib/data/certificates";

/** Copy for a certificate condition row (TRN-CRT-02 «الشروط المستوفاة» / «شروط إصدار الشهادة»). */
export function conditionCopy(c: CertificateCondition): { title: string; detail: string; icon: LucideIcon } {
  const d = toArabicDigits(c.done);
  const t = toArabicDigits(c.total);
  switch (c.key) {
    case "lessons": {
      const last = typeof c.info.last_completed_at === "string" ? c.info.last_completed_at : null;
      const left = c.total - c.done;
      return {
        title: "مشاهدة ١٠٠٪ من الدروس",
        detail: c.met
          ? `${d} من ${t}${last ? ` · آخرها ${formatDayMonth(last)}` : ""}`
          : `أكملت ${d} من ${t} ${c.total > 10 ? "درسًا" : "دروس"} · يتبقى ${pluralAr(left, ["درس واحد", "درسان", "دروس", "درسًا"])}`,
        icon: MonitorPlay,
      };
    }
    case "quizzes": {
      const avg = typeof c.info.avg_score === "number" ? c.info.avg_score : 0;
      const next = (c.info.next ?? null) as { title?: string; question_count?: number; time_limit_minutes?: number | null; pass_percent?: number; attempts?: number } | null;
      if (c.met) return { title: "اجتياز الاختبارات", detail: `${d} من ${t}${avg ? ` · متوسط ${toArabicDigits(avg)}٪` : ""}`, icon: ListChecks };
      const parts = [
        next?.attempts ? `${pluralAr(next.attempts, ["محاولة واحدة", "محاولتان", "محاولات", "محاولة"])} دون اجتياز` : "لم يبدأ بعد",
        next?.question_count ? pluralAr(next.question_count, ["سؤال واحد", "سؤالان", "أسئلة", "سؤالًا"]) : null,
        next?.time_limit_minutes ? `${toArabicDigits(next.time_limit_minutes)} دقيقة` : null,
        next?.pass_percent !== undefined ? `النجاح ${toArabicDigits(next.pass_percent)}٪` : null,
      ].filter(Boolean);
      return { title: next?.title ? `اجتياز ${next.title}` : "اجتياز الاختبارات", detail: parts.join(" · "), icon: ListChecks };
    }
    case "assignments": {
      const best = typeof c.info.best_score === "number" ? c.info.best_score : null;
      const max = typeof c.info.max_score === "number" ? c.info.max_score : null;
      return {
        title: "تسليم الواجب العملي",
        detail: c.met
          ? `${d} من ${t}${best !== null && max ? ` · الدرجة ${toArabicDigits(best)} من ${toArabicDigits(max)}` : ""}`
          : `قُبل ${d} من ${t} · يتبقى ${pluralAr(c.total - c.done, ["واجب واحد", "واجبان", "واجبات", "واجبًا"])}`,
        icon: ClipboardCheck,
      };
    }
    case "attendance": {
      const required = typeof c.info.required === "number" ? c.info.required : c.total;
      const next = typeof c.info.next_session_at === "string" ? c.info.next_session_at : null;
      return {
        title: "حضور الجلسات",
        detail: c.met
          ? `${d} من ${t} جلسة · الحد الأدنى ${toArabicDigits(required)}`
          : `حضرت ${d} من ${t} · المطلوب ${toArabicDigits(required)}${next ? ` · القادمة ${formatSessionTime(next)}` : ""}`,
        icon: CalendarCheck,
      };
    }
  }
}

export function remainingLabel(pendingCount: number): string {
  return pendingCount === 1 ? "شرط واحد متبقٍ" : pendingCount === 2 ? "شرطان متبقيان" : `${toArabicDigits(pendingCount)} شروط متبقية`;
}
