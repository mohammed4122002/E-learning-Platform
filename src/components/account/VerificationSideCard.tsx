import { BadgeCheck, CircleAlert, Hourglass, OctagonX, ShieldQuestion } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { formatDate } from "@/lib/format";
import type { VerificationView } from "@/lib/data/profile";

const DOC = { national_id: "بطاقة هوية وطنية", iqama: "إقامة", passport: "جواز سفر" } as const;

/** GEN-ACC-01 · «حالة التوثيق» side card. */
export function VerificationSideCard({ verification }: { verification: VerificationView | null }) {
  const s = verification?.status ?? null;
  const map: Record<string, { box: string; text: string; icon: LucideIcon; title: string; caption: string }> = {
    verified: {
      box: "bg-state-success-bg",
      text: "text-state-success",
      icon: BadgeCheck,
      title: "هويتك موثّقة",
      caption: verification ? `منذ ${formatDate(verification.reviewedAt ?? verification.submittedAt)} · ${DOC[verification.documentType]}` : "",
    },
    pending: { box: "bg-state-warning-bg", text: "text-state-warning", icon: Hourglass, title: "قيد المراجعة", caption: "يراجع فريق التوثيق مستندك خلال ٢٤–٤٨ ساعة عمل." },
    needs_changes: { box: "bg-state-info-bg", text: "text-state-info", icon: CircleAlert, title: "يحتاج تعديلًا", caption: "أعد رفع صورة أوضح لإكمال التوثيق." },
    rejected: { box: "bg-state-error-bg", text: "text-state-error", icon: OctagonX, title: "رُفض الطلب", caption: "يمكنك تقديم طلب جديد بمستند مطابق." },
    none: { box: "bg-bg-page", text: "text-text-secondary", icon: ShieldQuestion, title: "هويتك غير موثّقة", caption: "خطوتان تستغرقان ٣ دقائق." },
  };
  const t = map[s ?? "none"];
  return (
    <section aria-labelledby="acc-ver-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
      <h2 id="acc-ver-title" className="type-h3 text-text-primary">
        حالة التوثيق
      </h2>
      <div className={`flex items-center gap-3 rounded-12 px-4 py-4 ${t.box}`}>
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${t.text}`}>
          <Glyph icon={t.icon} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className={`type-subtitle ${t.text}`}>{t.title}</p>
          <p className="type-caption text-text-muted">{t.caption}</p>
        </div>
      </div>
      <p className="type-caption text-text-secondary">التوثيق يتيح لك التسجيل في البرامج المعتمدة واستلام شهادات قابلة للتحقق. لا تُشارك مستنداتك مع أي جهة تدريبية.</p>
      <ButtonLink href="/trainee/verification" variant="outline" fullWidth>
        {s ? "اعرض تفاصيل التوثيق" : "وثّق هويتك"}
      </ButtonLink>
    </section>
  );
}
