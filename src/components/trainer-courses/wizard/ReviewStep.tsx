"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import { Award, Banknote, BookOpen, CalendarDays, CircleAlert, CircleCheck, Eye, Layers, MapPin, MonitorPlay, RefreshCw, Users, Video } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { Glyph } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { formatNumber, toArabicDigits } from "@/lib/format";
import { BLOCKERS } from "@/lib/trainer-courses";
import { publishCourse, setSalesPaused } from "@/app/(trainer)/trainer/courses/actions";
import { useWizard } from "./WizardShell";

/* TRR-CRS-02 · ٥ المراجعة والنشر: شروط ناقصة (396:17293) · جاهزة (396:17657) · منشورة (396:17986) · ساعات التدريب (4227:690). */

const SUMMARY_ICONS = { mode: MonitorPlay, program: BookOpen, content: Layers, schedule: CalendarDays, preview: Eye, venue: MapPin, stream: Video, price: Banknote, certificate: Award, refund: RefreshCw } satisfies Record<string, LucideIcon>;
export type SummaryRow = { icon: keyof typeof SUMMARY_ICONS; label: string; value: string; missing?: boolean };

const COUNT_WORDS = ["", "شرط واحد يمنع", "شرطان يمنعان", "ثلاثة شروط تمنع", "أربعة شروط تمنع", "خمسة شروط تمنع", "ستة شروط تمنع"];
const BLOCKER_ICONS: Record<string, LucideIcon> = { no_preview: Eye, lessons_without_material: Video, empty_modules: Layers, price_missing: Banknote };

export function SummaryCard({ rows, previewHref }: { rows: SummaryRow[]; previewHref: string }) {
  return (
    <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
      <div className="flex items-center gap-3">
        <h2 className="min-w-[12rem] flex-1 type-h2 text-text-primary">ملخّص الدورة</h2>
        <Link href={previewHref} className="rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
          عاين كما يراها المتدرب
        </Link>
      </div>
      <dl className="flex flex-col gap-[18px]">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-wrap items-center gap-3.5 rounded-16 bg-bg-page px-[18px] py-[15px]">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-secondary">
              <Glyph icon={SUMMARY_ICONS[r.icon]} size={20} />
            </span>
            <dt className="min-w-0 flex-1 type-body-lg text-text-secondary">{r.label}</dt>
            <dd className={`type-subtitle ${r.missing ? "text-state-error" : "text-text-primary"}`}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ReviewStep({
  courseId,
  status,
  blockers,
  rows,
  published,
  side,
}: {
  courseId: string;
  status: "draft" | "open" | "in_progress" | "completed" | "cancelled";
  blockers: { code: string; detail: string | null }[];
  rows: SummaryRow[];
  published: { title: string; url: string; slug: string; views: number; sales: number; revenue: number; paused: boolean; manageHref: string } | null;
  side?: React.ReactNode;
}) {
  const { flush } = useWizard();
  const router = useRouter();
  const toast = useToast();
  const [ack, setAck] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isDraft = status === "draft";
  const blocked = blockers.length > 0;

  const publishCard = isDraft ? (
    <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-[26px] shadow-card">
      <h2 className="type-h2 text-text-primary">النشر</h2>
      <p className="type-body text-text-secondary">
        {blocked ? `لا يمكن النشر قبل إكمال ${blockers.length === 1 ? "الشرط الناقص" : "الشروط الناقصة"}.` : "بعد النشر تصبح الدورة متاحة للشراء فورًا، ويظهر رابط صفحة البيع."}
      </p>
      {!blocked && (
        <Checkbox checked={ack} onChange={(e) => setAck(e.target.checked)}>
          أقرّ بأن المحتوى من إنتاجي وأتحمّل مسؤوليته
        </Checkbox>
      )}
      <Button
        size="l"
        fullWidth
        disabled={blocked || !ack}
        loading={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            await flush();
            const res = await publishCourse(courseId, ack);
            if (!res.ok) return setError(res.error);
            toast("success", "نُشرت الدورة وأصبحت متاحة للشراء.");
            router.refresh();
          })
        }
      >
        انشر الدورة
      </Button>
      <Button
        size="l"
        fullWidth
        variant="outline"
        onClick={async () => {
          if (await flush()) router.push("/trainer/courses");
        }}
      >
        احفظ كمسودة
      </Button>
      <Link href={`/trainer/courses/${courseId}/setup/pricing`} className="flex h-14 items-center justify-center rounded-12 type-body-lg text-text-brand hover:bg-bg-brand-tint focus-ring">
        السابق · التسعير
      </Link>
      {(blocked || !ack) && <p className="type-caption text-state-error">{blocked ? "أكمل الشروط ليُفعَّل زر النشر." : "أشّر على الإقرار ليُفعَّل زر النشر."}</p>}
      {error && (
        <p role="alert" className="type-caption text-state-error">
          {error}
        </p>
      )}
    </section>
  ) : (
    <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-[26px] shadow-card">
      <h2 className="type-h2 text-text-primary">الدورة منشورة</h2>
      <p className="type-body text-text-secondary">
        {published?.paused ? "البيع موقوف مؤقتًا — المشترون الحاليون يحتفظون بوصولهم." : "يمكنك إيقاف البيع مؤقتًا — المشترون الحاليون يحتفظون بوصولهم."}
      </p>
      <ButtonLink href={published?.manageHref ?? `/trainer/courses/${courseId}`} size="l" fullWidth>
        أدر الدورة
      </ButtonLink>
      <Button
        size="l"
        fullWidth
        variant="outline"
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await setSalesPaused(courseId, !published?.paused);
            if (!res.ok) return toast("error", res.error);
            toast("success", published?.paused ? "استُؤنف البيع." : "أُوقف البيع مؤقتًا.");
            router.refresh();
          })
        }
      >
        {published?.paused ? "استأنف البيع" : "أوقف البيع مؤقتًا"}
      </Button>
    </section>
  );

  return (
    <div className="flex flex-col gap-[26px] lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-[26px]">
        {isDraft && blocked && (
          <section className="flex flex-col gap-[18px] rounded-22 border-[3px] border-state-error bg-state-error-bg px-5 pt-[26px] pb-7 sm:px-7">
            <div className="flex items-center gap-3.5">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-16 bg-bg-surface text-state-error">
                <Glyph icon={CircleAlert} size={20} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <h2 className="type-h2 text-state-error">{COUNT_WORDS[Math.min(blockers.length, 6)]} النشر</h2>
                <p className="type-body-lg text-text-secondary">أكملها ثم عُد — كل بند يأخذك مباشرة لمكانه.</p>
              </div>
            </div>
            {blockers.map((b) => {
              const meta = BLOCKERS[b.code] ?? { title: b.code, description: "", action: "راجع", step: "review" };
              return (
                <div key={b.code} className="flex flex-col gap-3.5 rounded-16 bg-bg-surface px-5 pt-[18px] pb-5 sm:flex-row sm:items-center">
                  <span className="hidden size-12 shrink-0 items-center justify-center rounded-12 bg-state-error-bg text-state-error sm:flex">
                    <Glyph icon={BLOCKER_ICONS[b.code] ?? CircleAlert} size={20} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="type-title text-state-error">{meta.title}</p>
                    <p className="type-body text-text-muted">{b.detail ?? meta.description}</p>
                  </div>
                  <ButtonLink href={`/trainer/courses/${courseId}/setup/${meta.step === "content" ? "schedule" : meta.step}`}>{meta.action}</ButtonLink>
                </div>
              );
            })}
          </section>
        )}
        {!isDraft && published && (
          <section className="flex flex-col gap-[18px] rounded-22 border-[3px] border-state-success bg-state-success-bg px-5 pt-7 pb-[30px] sm:px-7">
            <div className="flex items-center gap-4">
              <span className="flex size-[68px] shrink-0 items-center justify-center rounded-16 bg-bg-surface text-state-success">
                <Glyph icon={CircleCheck} size={32} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">دورتك منشورة 🎉</h2>
                <p className="type-body-lg text-text-secondary">«{published.title}» متاحة الآن للشراء. أول عملية بيع تظهر في رصيدك بعد ١٤ يومًا من الشراء.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3.5 rounded-16 bg-bg-surface px-5 py-[18px]">
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <p className="type-caption text-text-muted">رابط صفحة البيع</p>
                <p dir="ltr" className="truncate text-end font-mono text-[14px] text-text-brand">
                  {published.url.replace(/^https?:\/\//, "")}
                </p>
              </div>
              <Button
                variant="outline"
                className="w-[120px]"
                onClick={() => {
                  void navigator.clipboard?.writeText(published.url).then(() => toast("success", "نُسخ الرابط."));
                }}
              >
                انسخ الرابط
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Banknote, value: formatNumber(Math.round(published.revenue * 100) / 100), label: "ر.س إيراد" },
                { icon: Users, value: toArabicDigits(published.sales), label: "عملية بيع" },
                { icon: Eye, value: formatNumber(published.views), label: "مشاهدة الصفحة" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-2 rounded-16 bg-bg-surface pt-[22px] pb-6 text-center">
                  <span className="flex size-11 items-center justify-center rounded-12 bg-bg-page text-text-brand">
                    <Glyph icon={s.icon} size={20} />
                  </span>
                  <p className="type-h2 text-text-primary">{s.value}</p>
                  <p className="type-caption text-text-muted">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3.5">
              <ButtonLink href={published.manageHref} size="l">
                أدر الدورة
              </ButtonLink>
              <Button
                size="l"
                variant="ghost"
                onClick={() => {
                  if (navigator.share) void navigator.share({ title: published.title, url: published.url }).catch(() => {});
                  else void navigator.clipboard?.writeText(published.url).then(() => toast("success", "نُسخ الرابط للمشاركة."));
                }}
              >
                شارك الدورة
              </Button>
              <ButtonLink href={`/courses/${published.slug}`} size="l" variant="outline" target="_blank">
                اعرض صفحة البيع
              </ButtonLink>
            </div>
          </section>
        )}
        <SummaryCard rows={rows} previewHref={`/trainer/courses/${courseId}/preview`} />
      </div>
      <aside className="flex w-full shrink-0 flex-col gap-[22px] lg:w-[400px]">
        {!isDraft && publishCard}
        {side}
        {isDraft && publishCard}
      </aside>
    </div>
  );
}
