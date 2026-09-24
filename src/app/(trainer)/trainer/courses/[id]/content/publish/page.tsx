import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { BellRing, CircleAlert, CircleCheckBig, FileText, Hourglass, ListChecks, Plus, ShieldCheck, Users, Video } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { PublishNewContentCard } from "@/components/trainer-courses/content/PublishNewContent";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { requireTrainer } from "@/lib/auth";
import { getRecordedDashboard } from "@/lib/data/trainer-course-page";
import { getCourseHeader, getTrainerContent, type TrainerLesson } from "@/lib/data/trainer-courses";
import { formatClock, formatDuration, formatPercent, pluralAr, toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "نشر المحتوى الجديد", description: "راجع أثر الإضافة على المشترين الحاليين قبل النشر" };

const KIND: Record<TrainerLesson["kind"], { icon: LucideIcon; label: string }> = {
  video: { icon: Video, label: "فيديو" },
  text: { icon: FileText, label: "نص" },
  file: { icon: FileText, label: "ملف" },
  quiz: { icon: ListChecks, label: "اختبار" },
};
const MODULE_ORDINAL = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"];

const TONE_BG: Record<string, string> = { "text-state-warning": "bg-state-warning-bg", "text-state-success": "bg-state-success-bg", "text-state-info": "bg-state-info-bg" };

function ImpactRow({ icon, title, text, tone }: { icon: LucideIcon; title: string; text: string; tone: string }) {
  return (
    <div className="flex items-start gap-3.5 rounded-16 bg-bg-surface px-4 pt-4 pb-5 sm:px-5">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-12 ${TONE_BG[tone] ?? ""} ${tone}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={`type-title ${tone}`}>{title}</p>
        <p className="type-body text-text-secondary">{text}</p>
      </div>
    </div>
  );
}

/** TRR-CRS-08 · تنبيه نشر محتوى جديد (409:34874) — BR-L10: new lessons re-base completion, never revoke certificates. */
export default async function PublishNewContentPage({ params }: PageProps<"/trainer/courses/[id]/content/publish">) {
  const { id } = await params;
  await requireTrainer(`/trainer/courses/${id}/content/publish`);
  const course = await getCourseHeader(id);
  if (!course) notFound();
  if (course.status === "draft") redirect(`/trainer/courses/${id}/setup/schedule`);
  const [content, dash] = await Promise.all([getTrainerContent(id), getRecordedDashboard(id)]);

  const drafts = content.lessons.filter((l) => !l.publishedAt);
  const ready = drafts.filter((l) => l.hasMaterial);
  const notReady = drafts.filter((l) => !l.hasMaterial);
  const moduleIndex = new Map(content.modules.map((m, i) => [m.id, i]));
  const where = (l: TrainerLesson) => `الوحدة ${MODULE_ORDINAL[moduleIndex.get(l.moduleId) ?? 0] ?? toArabicDigits((moduleIndex.get(l.moduleId) ?? 0) + 1)}`;
  const seconds = ready.reduce((s, l) => s + l.durationSeconds, 0);

  const total = dash.lessons;
  const after = total + ready.length;
  const learners = dash.learners;
  const finished = learners.filter((l) => total > 0 && l.done >= total);
  const inProgress = learners.filter((l) => !(total > 0 && l.done >= total));
  const certified = finished.filter((l) => l.certified).length;
  const sample = inProgress.slice().sort((a, b) => b.done - a.done)[0] ?? null;
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
  const modulesWithNew = [...new Set(ready.map((l) => where(l)))];
  const addedLabel = pluralAr(ready.length, ["درس جديد", "درسان جديدان", "دروس جديدة", "درسًا جديدًا"]);

  return (
    <>
      <TopBar title="إدارة المحتوى" subtitle={course.title} />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: course.title, href: `/trainer/courses/${id}/dashboard` }, { label: "المحتوى" }]} />
        <div className="flex flex-col gap-2">
          <h1 className="type-display text-[32px] sm:text-[40px]">نشر المحتوى الجديد</h1>
          <p className="type-body-lg text-text-secondary">راجع أثر الإضافة على المشترين الحاليين قبل النشر.</p>
        </div>
        {ready.length === 0 ? (
          <section className="flex flex-col items-center gap-3 rounded-22 bg-bg-brand-tint px-5 py-10 text-center">
            <p className="type-h3 text-text-primary">لا محتوى جديد جاهز للنشر</p>
            <p className="type-body text-text-secondary">
              {notReady.length ? `${pluralAr(notReady.length, ["درس مسودة", "درسان مسودة", "دروس مسودة", "درسًا مسودة"])} بلا مادة بعد — أكمل موادها أولًا.` : "كل دروس الدورة منشورة."}
            </p>
          </section>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <section className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
                <h2 className="type-h3 text-text-primary">ما سيراه المتدرب</h2>
                <div className="flex flex-col gap-4 rounded-16 border-[1.5px] border-state-info bg-state-info-bg p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <p className="type-title text-state-info">أضاف المدرب محتوى جديدًا</p>
                      <p className="type-body text-text-secondary">
                        {addedLabel} في {modulesWithNew.join(" و")} — {ready.length === 1 ? "متاح" : "متاحة"} لك مجانًا. نسبة إكمالك أُعيد حسابها لتشمل المحتوى الجديد.
                      </p>
                    </div>
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-info">
                      <Glyph icon={Plus} size={20} />
                    </span>
                  </div>
                  {sample && (
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <p className="flex flex-col gap-1 rounded-12 bg-bg-surface px-2 py-3 type-caption text-text-muted">
                        صارت
                        <span className="type-subtitle text-state-info">
                          {toArabicDigits(sample.done)} من {toArabicDigits(after)} · {formatPercent(pct(sample.done, after))}
                        </span>
                      </p>
                      <p className="flex flex-col gap-1 rounded-12 bg-bg-surface px-2 py-3 type-caption text-text-muted">
                        أُضيف
                        <span className="type-subtitle text-state-info">{addedLabel}</span>
                      </p>
                      <p className="flex flex-col gap-1 rounded-12 bg-bg-surface px-2 py-3 type-caption text-text-muted">
                        كانت
                        <span className="type-subtitle text-text-secondary">
                          {toArabicDigits(sample.done)} من {toArabicDigits(total)} · {formatPercent(pct(sample.done, total))}
                        </span>
                      </p>
                    </div>
                  )}
                  <p className="type-caption text-text-muted">النسبة تعكس ما ينبغي تعلّمه فعلًا — لا تنقص من جهدك السابق.</p>
                  <span aria-hidden className="flex h-12 items-center justify-center rounded-12 bg-action-primary type-button text-text-on-brand">
                    اعرض المحتوى الجديد
                  </span>
                </div>
              </section>
              <PublishNewContentCard courseId={id} lessonIds={ready.map((l) => l.id)} affected={inProgress.length} />
            </div>
            <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-[530px]">
              <section className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="min-w-[12rem] flex-1 type-h2 text-text-primary">جاهز للنشر</h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-state-success-bg px-3 py-1.5 type-small text-state-success">
                    <Glyph icon={CircleCheckBig} size={16} />
                    {pluralAr(ready.length, ["درس واحد", "درسان", "دروس", "درسًا"])}
                    {seconds > 0 && ` · ${formatDuration(seconds)}`}
                  </span>
                </div>
                {ready.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 rounded-16 bg-bg-page px-4 py-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="type-title text-text-primary">{l.title}</p>
                      <p className="type-caption text-text-muted">
                        {where(l)} · {KIND[l.kind].label}
                        {l.kind === "video" && l.durationSeconds > 0 && ` · ${formatClock(l.durationSeconds)}`}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-state-success-bg px-2.5 py-1 type-caption text-state-success">
                      جاهز
                      <Glyph icon={CircleCheckBig} size={16} />
                    </span>
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-state-error-bg text-state-error">
                      <Glyph icon={KIND[l.kind].icon} size={20} />
                    </span>
                  </div>
                ))}
              </section>
              <section className="flex flex-col gap-4 rounded-22 border-2 border-state-warning bg-state-warning-bg p-5 sm:p-7">
                <div className="flex items-start gap-3.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h2 className="type-h2 text-state-warning">الأثر على {pluralAr(learners.length, ["مشترٍ واحد", "مشتريين", "مشترين", "مشتريًا"])}</h2>
                    <p className="type-body text-text-secondary">النشر يُعيد حساب نسب الإكمال ويُشعر الجميع. الشهادات الصادرة محفوظة ولا تُمس.</p>
                  </div>
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-secondary">
                    <Glyph icon={Users} size={20} />
                  </span>
                </div>
                <ImpactRow
                  icon={CircleAlert}
                  tone="text-state-warning"
                  title={`${pluralAr(inProgress.length, ["متدرب واحد لم يُكمل", "متدربان لم يُكملا", "لم يُكملوا", "لم يُكملوا"])} الدورة`}
                  text={
                    sample
                      ? `نسبهم تُعاد لتشمل ${ready.length === 1 ? "الدرس الجديد" : "الدروس الجديدة"}. مثال: من كان ${toArabicDigits(sample.done)} من ${toArabicDigits(total)} (${formatPercent(pct(sample.done, total))}) يصبح ${toArabicDigits(sample.done)} من ${toArabicDigits(after)} (${formatPercent(pct(sample.done, after))}).`
                      : "لا متدربين في منتصف الدورة الآن."
                  }
                />
                <ImpactRow
                  icon={ShieldCheck}
                  tone="text-state-success"
                  title={`${pluralAr(finished.length, ["متدرب واحد أكمل", "متدربان أكملا", "أكملوا", "أكملوا"])}${certified ? " وحصلوا على شهاداتهم" : ""}`}
                  text="شهاداتهم محفوظة بتاريخ إصدارها ولا يُعاد احتسابها. يصلهم إشعار بالمحتوى الجديد فقط."
                />
                <ImpactRow icon={BellRing} tone="text-state-info" title="إشعار للجميع" text="«أضاف المدرب محتوى جديدًا» — في المنصة والبريد." />
                <p className="flex items-start gap-3 rounded-16 bg-bg-surface px-4 py-4 type-body text-state-warning">
                  <Glyph icon={Hourglass} size={20} className="mt-1" />
                  <span className="flex-1">هذه قاعدة ثابتة في المنصة — نسبة الإكمال تعكس ما ينبغي تعلّمه. والشهادة الصادرة حق مكتسب لا يُسحب.</span>
                </p>
              </section>
            </aside>
          </div>
        )}
      </PageBody>
    </>
  );
}
