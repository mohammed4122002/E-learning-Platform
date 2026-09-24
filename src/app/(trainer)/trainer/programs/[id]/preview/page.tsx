import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Eye, TriangleAlert } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { SelfCheck } from "@/components/trainer-programs/SelfCheck";
import { ContentCard, ObjectivesCard, PreviewCard, ProgramHero } from "@/components/trainer-programs/PreviewBlocks";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { requireTrainer } from "@/lib/auth";
import { getTrainerProgram } from "@/lib/data/trainer-programs";
import { MISSING_FIELDS, isEditable } from "@/lib/trainer-programs";

export const metadata: Metadata = { title: "معاينة البرنامج" };

/** TRR-PRG-03 · معاينة البرنامج قبل النشر (298:8553 · no first course 4207:2 · first course added 4207:360). */
export default async function ProgramPreviewPage({ params }: PageProps<"/trainer/programs/[id]/preview">) {
  const { id } = await params;
  const user = await requireTrainer(`/trainer/programs/${id}/preview`);
  const p = await getTrainerProgram(id, user.id);
  if (!p) notFound();
  const editable = isEditable(p.phase);
  const hasCourse = p.courses.published > 0;
  const firstMissing = p.missing[0] ? MISSING_FIELDS[p.missing[0]] : null;
  const editorHref = `/trainer/programs/${p.id}/edit/${firstMissing?.step ?? "basics"}`;
  const declarationHref = `/trainer/programs/${p.id}/declaration`;

  return (
    <>
      <TopBar title="معاينة البرنامج" subtitle="كما سيراه المتدرب" />
      <PageBody className="!gap-6">
        <Breadcrumb items={[{ label: "برامجي", href: "/trainer/programs" }, { label: p.title, href: `/trainer/programs/${p.id}` }, { label: "معاينة" }]} />

        <section className={`flex flex-col gap-2 rounded-16 border-2 px-6 py-5 ${hasCourse ? "border-state-success bg-state-success-bg" : "border-state-error bg-state-error-bg"}`}>
          <p className={`type-title ${hasCourse ? "text-state-success" : "text-state-error"}`}>أول دورة تدريبية</p>
          <p className={`type-subtitle ${hasCourse ? "text-state-success" : "text-state-error"}`}>{hasCourse ? "تمت الإضافة · دورة واحدة على الأقل" : "لم تُضف بعد"}</p>
          <p className="type-caption text-text-secondary">
            {hasCourse ? "البرنامج جاهز للإرسال للاعتماد." : "الدورة ليست شرطًا للاعتماد — يمكنك الإرسال الآن. لكن البرنامج لن يُنشر للمتدربين قبل نشر دورة واحدة على الأقل."}
          </p>
          <p className="type-caption text-text-secondary">ملفات المحتوى وحدها لا تُعد دورة تدريبية. أنشئ دورة وحدد نمط تقديمها وإعداداتها.</p>
          {!hasCourse && (
            <ButtonLink href={`/trainer/courses/new?program=${p.id}`} size="s" className="mt-1 self-start">
              أضف أول دورة
            </ButtonLink>
          )}
        </section>

        <section className="flex flex-col gap-[18px] rounded-16 border-2 border-dashed border-state-info bg-state-info-bg px-6 py-5 md:flex-row md:items-center">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-info">
            <Glyph icon={Eye} size={20} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="type-h3 text-state-info">وضع المعاينة — لم يُنشر بعد</p>
            <p className="type-body-lg text-text-secondary">هذا بالضبط ما سيراه المتدرب في صفحة البرنامج. راجعه بعينه: هل الوصف يطابق ما ستقدّمه فعلًا؟</p>
          </div>
          {editable && (
            <div className="flex shrink-0 gap-3">
              <ButtonLink href={declarationHref}>أكمل للإقرار</ButtonLink>
              <ButtonLink href={editorHref} variant="outline">
                عُد للمحرّر
              </ButtonLink>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <ProgramHero
              p={p}
              cta={
                <Button size="l" disabled={!hasCourse} className="w-full sm:w-[280px]" aria-describedby="register-note">
                  سجّل في هذا البرنامج
                </Button>
              }
            />
            <p id="register-note" className="sr-only">
              الزر معطّل في المعاينة — يعمل بعد النشر
            </p>
            <ObjectivesCard p={p} />
            <ContentCard p={p} />
          </div>

          <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
            {editable && p.missing.length > 0 && (
              <PreviewCard title="ما ينقص قبل الإرسال للاعتماد" className="!border-2 !border-state-error">
                <ul className="flex flex-col gap-2.5">
                  {p.missing.map((m) => (
                    <li key={m}>
                      <Link href={`/trainer/programs/${p.id}/edit/${MISSING_FIELDS[m].step}`} className="flex items-center gap-3 rounded-12 bg-state-error-bg px-3.5 py-3 focus-ring">
                        <Glyph icon={TriangleAlert} size={16} className="text-state-error" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="type-small text-state-error">{MISSING_FIELDS[m].label}</span>
                          <span className="type-caption text-text-muted">الخطوة {["", "١", "٢", "٣", "٤"][MISSING_FIELDS[m].stepNo]}</span>
                        </span>
                        <Glyph icon={ChevronLeft} size={16} className="text-text-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </PreviewCard>
            )}
            <PreviewCard title="راجع بعين المتدرب">
              <p className="type-body text-text-muted">اسأل نفسك هذه الأسئلة قبل الإقرار:</p>
              <SelfCheck
                items={["هل الوصف يطابق ما ستقدّمه فعلًا؟", "هل الأهداف قابلة للقياس؟", "هل المدة تكفي للمحتوى؟", "هل السعر منطقي مقارنة بالمنافسين؟", "هل المتطلبات المسبقة واضحة؟"]}
              />
            </PreviewCard>
            <PreviewCard title="أشيع سبب للبلاغات">
              <p className="flex items-start gap-3 rounded-16 bg-state-warning-bg px-4 pt-3.5 pb-4 type-body-lg text-state-warning">
                <Glyph icon={TriangleAlert} size={20} className="mt-1.5" />
                الفجوة بين الوصف والتنفيذ. إن ذكرت أداة أو تطبيقًا عمليًا هنا فالمتدرب سينتظره — والبلاغ يأتي إن لم يجده.
              </p>
            </PreviewCard>
            {editable && (
              <PreviewCard title="الخطوة التالية">
                <p className="type-body text-text-secondary">بعد المعاينة تنتقل لشاشة الإقرار — وهي التي تُسجّل مسؤوليتك برقم نسخة وختم زمني.</p>
                <ButtonLink href={declarationHref} size="l" fullWidth>
                  أكمل للإقرار
                </ButtonLink>
                <ButtonLink href={editorHref} variant="outline" size="l" fullWidth>
                  عُد للمحرّر وعدّل
                </ButtonLink>
              </PreviewCard>
            )}
          </aside>
        </div>
      </PageBody>
    </>
  );
}
