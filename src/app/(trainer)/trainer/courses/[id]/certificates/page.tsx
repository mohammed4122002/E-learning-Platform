import type { Metadata } from "next";
import { CircleAlert, CircleCheck, CircleX, Download, Landmark, Lock, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { PreviewCard, RuleList } from "@/components/trainer-ops/Certificates";
import { ConditionRow, MiniPill, OpsCard } from "@/components/trainer-ops/parts";
import { requireTrainer } from "@/lib/auth";
import { getCertificatesView } from "@/lib/data/trainer-certificates";
import { getManagedCourse } from "@/lib/data/trainer-course";
import { pluralAr, toArabicDigits } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/trainer/courses/[id]/certificates">): Promise<Metadata> {
  const { id } = await props.params;
  const course = await getManagedCourse(id);
  return { title: `الشهادات · ${course.title}` };
}

const n = toArabicDigits;

/** TRR-CRS-05 · ٨ الشهادات (438:20662): locked until the results are approved, then the entry to TRR-CRT-01/02. */
export default async function CertificatesTab(props: PageProps<"/trainer/courses/[id]/certificates">) {
  const { id } = await props.params;
  await requireTrainer(`/trainer/courses/${id}/certificates`);
  const course = await getManagedCourse(id);
  const v = await getCertificatesView(course);
  const base = `/trainer/courses/${course.id}`;
  const total = v.eligible.length + v.ineligible.length;
  const allIssued = v.approved && v.eligible.length > 0 && v.pendingIssue.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {v.approved ? (
        <section className="flex flex-col items-start gap-4 rounded-22 border-2 border-state-success bg-state-success-bg px-5 py-6 sm:flex-row sm:items-center sm:gap-6 sm:px-7">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-16 bg-bg-surface text-state-success">
            <Glyph icon={CircleCheck} size={24} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2 className="type-h2 text-text-primary">{allIssued ? `صدرت ${pluralAr(v.issued.length, ["شهادة واحدة", "شهادتان", "شهادات", "شهادة"])}` : "النتائج معتمدة – الشهادات جاهزة للإصدار"}</h2>
            <p className="type-body text-text-secondary">كل شهادة تُصدر برقم مرجعي ورابط تحقق عام دائم، وتظهر فورًا في ملف المتدرب.</p>
          </div>
          <ButtonLink href={`${base}/certificates/issue`} size="l" className="w-full sm:w-auto">
            {allIssued ? "اعرض الشهادات الصادرة" : "اذهب للإصدار"}
          </ButtonLink>
        </section>
      ) : (
        <section className="flex flex-col items-start gap-4 rounded-22 bg-bg-disabled px-5 py-6 sm:flex-row sm:gap-6 sm:px-7">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-16 bg-bg-surface text-text-secondary">
            <Glyph icon={Lock} size={24} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
            <h2 className="type-h2 text-text-secondary">الشهادات مقفلة حتى اعتماد النتائج</h2>
            <p className="type-body text-text-secondary">لا تُصدر شهادة قبل اعتماد نتائج الدورة — لأن الشهادة تحمل الدرجة وتقبل التحقق العام. اذهب لتبويب النتائج لإكمال الشروط.</p>
            <ButtonLink href={`${base}/results`} variant="outline" size="m" className="bg-bg-surface">
              اذهب للنتائج
            </ButtonLink>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-[26px]">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <PreviewCard course={course} sampleName={v.eligible[0]?.name ?? course.trainerName} titleSize="h2" />
          <OpsCard
            title="من سيحصل عليها؟"
            titleId="who-title"
            titleSize="h2"
            aside={
              total > 0 ? (
                <MiniPill icon={CircleCheck} tone="success" onTint={false}>
                  {`${n(v.eligible.length)} من ${n(total)}`}
                </MiniPill>
              ) : undefined
            }
          >
            {total === 0 ? (
              <p className="rounded-16 bg-bg-page px-5 py-6 text-center type-body text-text-muted">لا متدربين مسجّلين في الدورة بعد.</p>
            ) : (
              <ul className="flex flex-col gap-5">
                {v.eligible.length > 0 && (
                  <ConditionRow
                    tone="success"
                    titleTone
                    captionTone="secondary"
                    icon={CircleCheck}
                    title={pluralAr(v.eligible.length, ["ناجح واحد", "ناجحان", "ناجحين", "ناجحًا"])}
                    caption={
                      v.approved
                        ? v.issued.length
                          ? `صدرت ${pluralAr(v.issued.length, ["شهادة واحدة", "شهادتان", "شهادات", "شهادة"])}${v.pendingIssue.length ? ` · ${n(v.pendingIssue.length)} بانتظار الإصدار` : ""}`
                          : "شهاداتهم جاهزة للإصدار"
                        : "تصدر شهاداتهم بعد الاعتماد"
                    }
                  />
                )}
                {v.ineligible.map((t) => (
                  <ConditionRow
                    key={t.enrollmentId}
                    tone={t.outcome === "below_attendance" ? "warning" : "error"}
                    titleTone
                    captionTone="secondary"
                    icon={t.outcome === "below_attendance" ? CircleAlert : CircleX}
                    title={t.name}
                    caption={t.reason}
                  />
                ))}
              </ul>
            )}
          </OpsCard>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
          <OpsCard title="الإصدار" titleId="issue-title">
            <p className="type-body text-text-secondary">يبدأ بعد اعتماد النتائج. يمكنك أيضًا إصدارها يدويًا لمتدرب واحد</p>
            <ButtonLink href={`${base}/certificates/issue`} size="l" fullWidth disabled={!v.approved || v.pendingIssue.length === 0}>
              أصدر لكل الناجحين
            </ButtonLink>
            <ButtonLink href={`${base}/certificates/issue?all=1#eligible-title`} variant="secondary" size="l" fullWidth disabled={!v.approved || v.eligible.length === 0}>
              أصدر لمتدرب واحد
            </ButtonLink>
            {!v.approved && <p className="type-caption text-text-muted">يُفعّلان بعد اعتماد النتائج.</p>}
            {v.approved && course.programId && (
              <ButtonLink href={`${base}/certificates/program`} variant="outline" size="l" fullWidth>
                شهادات إتمام البرنامج
              </ButtonLink>
            )}
          </OpsCard>
          <RuleList
            large
            title="عن الشهادة"
            titleId="about-title"
            items={[
              { icon: ShieldCheck, tone: "success", text: "رابط تحقق عام دائم" },
              { icon: Landmark, text: `باسم ${course.organizationName ?? "المنصة"} واسمك` },
              { icon: Download, text: "يحمّلها المتدرب PDF" },
              { icon: CircleAlert, tone: "warning", text: "تُسحب عند استرداد بعد الإصدار" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
