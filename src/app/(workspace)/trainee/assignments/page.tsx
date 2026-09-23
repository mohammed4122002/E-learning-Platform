import type { Metadata } from "next";
import Link from "next/link";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Data";
import { ButtonLink } from "@/components/ui/Button";
import { requireTrainee } from "@/lib/auth";
import { ASSIGNMENT_STATE, listAssignments, type AssignmentView } from "@/lib/data/assignments";
import { formatDayMonth, pluralAr, toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "الواجبات", description: "واجباتك العملية في كل دوراتك — متطلباتها ومواعيدها وحالة تسليمها." };

function meta(a: AssignmentView): string {
  const parts = [a.course.title];
  if (a.state === "accepted" && a.latest?.score !== null && a.latest?.score !== undefined) parts.push(`الدرجة ${toArabicDigits(a.latest.score)} من ${toArabicDigits(a.maxScore)}`);
  else if (a.dueAt) parts.push(a.pastDue ? `انتهى الموعد ${formatDayMonth(a.dueAt)}` : `الموعد ${formatDayMonth(a.dueAt)}`);
  if (a.latest?.fileName && a.state === "submitted") parts.push(`ملف ${a.acceptedFormats}`);
  return parts.join(" · ");
}

/** TRN-LRN-07 · الواجبات — Figma 4143:2 (النتائج) · 4143:685 (فارغة). */
export default async function AssignmentsPage() {
  const user = await requireTrainee("/trainee/assignments");
  const assignments = await listAssignments(user.id);
  const courses = new Set(assignments.map((a) => a.course.id)).size;
  const first = assignments[0];

  return (
    <>
      <TopBar title="الواجبات" subtitle="كل واجباتك العملية في مكان واحد" />
      <PageBody className="gap-6">
        {assignments.length === 0 ? (
          <>
            <section aria-labelledby="empty-title" className="flex flex-col gap-2 rounded-16 border-[1.5px] border-border-default bg-bg-brand-tint px-6 py-[22px]">
              <h2 id="empty-title" className="text-[22px] leading-[1.3] font-bold text-text-primary">
                لا توجد واجبات بعد
              </h2>
              <p className="type-small text-text-secondary">ستظهر واجباتك هنا فور إسنادها من المدرب.</p>
              <p className="type-small text-text-secondary">تابع دوراتك النشطة من ملف التدريب.</p>
            </section>
            <div className="flex justify-start">
              <ButtonLink href="/trainee/trainings">عد إلى ملف التدريب</ButtonLink>
            </div>
          </>
        ) : (
          <>
            <section aria-labelledby="notice-title" className="flex flex-col gap-2 rounded-16 border-[1.5px] border-action-primary bg-bg-brand-tint px-6 py-[22px]">
              <h2 id="notice-title" className="text-[22px] leading-[1.3] font-bold text-text-brand">
                واجباتك
              </h2>
              <p className="type-small text-text-secondary">
                {pluralAr(assignments.length, ["واجب واحد", "واجبان", "واجبات", "واجبًا"])} عبر {pluralAr(courses, ["دورة واحدة", "دورتين", "دورات", "دورة"])}. افتح أي واجب لعرض متطلباته وتسليمه.
              </p>
            </section>

            <section aria-labelledby="list-title" className="flex flex-col gap-3 rounded-16 border border-border-default bg-bg-card p-6">
              <h2 id="list-title" className="type-title text-text-primary">
                كل الواجبات
              </h2>
              <ul className="flex flex-col gap-3">
                {assignments.map((a) => {
                  const s = ASSIGNMENT_STATE[a.state];
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/trainee/assignments/${a.id}`}
                        className="flex flex-col gap-1.5 rounded-12 border border-border-default bg-bg-surface px-[18px] py-4 transition-shadow hover:shadow-card focus-ring"
                      >
                        <span className="flex flex-wrap items-center gap-2.5">
                          <span className="text-[17px] leading-[1.4] font-bold text-text-primary">{a.title}</span>
                          <Badge tone={s.tone} className="px-[13px]">
                            {s.label}
                          </Badge>
                        </span>
                        <span className="type-caption text-text-secondary">{meta(a)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>

            <div className="flex flex-wrap justify-start gap-3">
              <ButtonLink href="/trainee/trainings" variant="secondary">
                عد إلى ملف التدريب
              </ButtonLink>
              {first && <ButtonLink href={`/trainee/assignments/${first.id}`}>افتح الواجب</ButtonLink>}
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}
