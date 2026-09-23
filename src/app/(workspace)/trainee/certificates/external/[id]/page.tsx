import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, Building2, CircleCheck, CircleX, Clock, FileCheck, FilePen, Hourglass, Lock, ScanSearch, Trash2, Upload } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Navigation";
import { Glyph } from "@/components/ui/Icon";
import { IconPill, IconRow, Notice, StatusHero, StepRow } from "@/components/ui/InfoBlocks";
import { SectionCard } from "@/components/ui/PageHeading";
import { ExternalCertificateForm } from "@/components/certificates/ExternalCertificateForm";
import { DeleteExternalButton } from "@/components/certificates/DeleteExternalButton";
import { EXTERNAL_STATUS } from "@/components/certificates/CertificateCard";
import { requireTrainee } from "@/lib/auth";
import { externalFileUrl, getExternalCertificate, type ExternalCertificate } from "@/lib/data/certificates";
import { formatDate, formatDayMonth, formatTime } from "@/lib/format";

export const metadata: Metadata = { title: "حالة توثيق الشهادة الخارجية" };

function DataRow({ label, children, valueClass }: { label: string; children: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex w-full flex-col gap-1 rounded-[10px] border border-border-default bg-bg-page px-4 py-[13px] sm:flex-row sm:items-center sm:gap-2.5">
      <dt className="shrink-0 text-[13.5px] leading-normal text-text-secondary sm:w-32">{label}</dt>
      <dd className={`min-w-0 text-[15px] leading-normal font-bold break-words ${valueClass ?? "text-text-primary"}`}>{children}</dd>
    </div>
  );
}

const HERO: Record<ExternalCertificate["status"], { tone: "warning" | "success" | "error"; icon: LucideIcon; title: string; body: string }> = {
  pending: { tone: "warning", icon: Hourglass, title: "قيد المراجعة", body: "استلمنا شهادتك ويراجعها فريق التوثيق. لا إجراء مطلوب منك الآن." },
  needs_changes: { tone: "warning", icon: FilePen, title: "تحتاج تصحيحًا", body: "راجع ملاحظة فريق التوثيق، ثم عدّل البيانات أو أعد رفع الملف وأرسل الطلب مجددًا." },
  verified: { tone: "success", icon: BadgeCheck, title: "موثّقة", body: "تحقّق فريق التوثيق من الشهادة لدى الجهة المصدرة. تظهر في ملفك بشارة «شهادة خارجية · موثّقة»." },
  rejected: { tone: "error", icon: CircleX, title: "مرفوضة", body: "لم نتمكّن من التحقق من هذه الشهادة لدى الجهة المصدرة. يمكنك تقديم طلب جديد ببيانات أو ملف مختلف." },
};

/** TRN-CRT-03 · شهادة خارجية — Figma 4146:306 (قيد المراجعة) · 4146:657 (تحتاج تعديلات) · 4146:973 (موثّقة) · 4146:1300 (مرفوضة). */
export default async function ExternalCertificatePage({ params, searchParams }: PageProps<"/trainee/certificates/external/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await requireTrainee(`/trainee/certificates/external/${id}`);
  const c = await getExternalCertificate(user.id, id);
  if (!c) notFound();

  const editable = c.status === "pending" || c.status === "needs_changes";
  const status = EXTERNAL_STATUS[c.status];

  if (sp.edit === "1" && editable) {
    return (
      <>
        <TopBar title="شهادة خارجية" subtitle="تعديل البيانات" />
        <PageBody className="gap-6">
          <Breadcrumb items={[{ label: "الشهادات", href: "/trainee/certificates" }, { label: c.title, href: `/trainee/certificates/external/${c.id}` }, { label: "تعديل" }]} />
          {c.status === "needs_changes" && c.reviewerNote ? (
            <Notice tone="warning" title="الشهادة تحتاج تصحيحًا">
              <p>ملاحظة فريق المراجعة: {c.reviewerNote}</p>
            </Notice>
          ) : (
            <Notice tone="info" title="عدّل بيانات الشهادة">
              <p>تُعاد الشهادة إلى قائمة المراجعة بعد حفظ التعديلات.</p>
            </Notice>
          )}
          <ExternalCertificateForm
            userId={user.id}
            cancelHref={`/trainee/certificates/external/${c.id}`}
            initial={{
              id: c.id,
              title: c.title,
              issuer: c.issuer,
              issuedOn: c.issuedOn,
              expiresOn: c.expiresOn ?? "",
              serialNumber: c.serialNumber ?? "",
              credentialUrl: c.credentialUrl ?? "",
              field: c.field ?? "",
              filePath: c.filePath ?? "",
              fileName: c.fileName,
            }}
          />
        </PageBody>
      </>
    );
  }

  const fileUrl = await externalFileUrl(c.filePath);
  const hero = HERO[c.status];
  const decided = c.status === "verified" || c.status === "rejected";

  return (
    <>
      <TopBar title="حالة التوثيق" subtitle={status.label} />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "الشهادات", href: "/trainee/certificates" }, { label: c.title }]} />

        {c.status === "pending" &&
          (sp.sent === "1" ? (
            <Notice tone="success" title="أُرسلت شهادتك للمراجعة">
              <p>استلمنا الشهادة وسيراجعها فريق التوثيق خلال ٢٤–٤٨ ساعة عمل. يصلك إشعار فور صدور القرار.</p>
            </Notice>
          ) : (
            <Notice tone="info" title="الشهادة قيد المراجعة">
              <p>استلمنا شهادتك ويراجعها فريق المراجعة. لا إجراء مطلوب منك الآن.</p>
            </Notice>
          ))}
        {c.status === "needs_changes" && (
          <Notice tone="warning" title="الشهادة تحتاج تصحيحًا">
            <p>ملاحظة فريق المراجعة: {c.reviewerNote ?? "راجع بيانات الشهادة وملفها."}</p>
            <p>عدّل البيانات أو أعد رفع نسخة أوضح ثم أرسل الطلب مجددًا.</p>
          </Notice>
        )}
        {c.status === "verified" && (
          <Notice tone="success" title="تم توثيق الشهادة الخارجية">
            <p>ظهرت في ملفك المهني بشارة «شهادة خارجية · موثّقة».</p>
          </Notice>
        )}
        {c.status === "rejected" && (
          <Notice tone="error" title="تعذّر توثيق الشهادة">
            <p>{c.reviewerNote ?? "لم نتمكّن من التحقق من هذه الشهادة لدى الجهة المصدرة."}</p>
            <p>يمكنك تقديم طلب جديد ببيانات أو ملف مختلف.</p>
          </Notice>
        )}

        <section aria-labelledby="ext-data-title" className="flex w-full flex-col gap-2.5 rounded-[14px] border-2 border-state-info bg-bg-surface p-4 sm:p-6">
          <div className="flex w-full items-center gap-2.5 pb-1">
            <h2 id="ext-data-title" className="text-[19px] leading-normal font-bold text-text-primary">
              بيانات الشهادة
            </h2>
            <span className="rounded-full bg-state-info-bg px-[13px] py-[5px] text-[12.5px] leading-normal font-bold text-state-info">شهادة خارجية</span>
          </div>
          <dl className="flex flex-col gap-2.5">
            <DataRow label="اسم الشهادة">{c.title}</DataRow>
            <DataRow label="الجهة المصدرة">{c.issuer}</DataRow>
            <DataRow label="تاريخ الإصدار">{formatDate(c.issuedOn)}</DataRow>
            {c.expiresOn && <DataRow label="تاريخ الانتهاء">{formatDate(c.expiresOn)}</DataRow>}
            {c.serialNumber && (
              <DataRow label="الرقم التسلسلي">
                <span dir="ltr">{c.serialNumber}</span>
              </DataRow>
            )}
            {c.credentialUrl && (
              <DataRow label="رابط التحقق">
                <a href={c.credentialUrl} target="_blank" rel="noopener noreferrer" dir="ltr" className="text-text-brand hover:underline focus-ring">
                  {c.credentialUrl.replace(/^https?:\/\//, "")}
                </a>
              </DataRow>
            )}
            {c.field && <DataRow label="المجال">{c.field}</DataRow>}
            <DataRow label="ملف الشهادة" valueClass={fileUrl ? "text-text-brand" : "text-text-secondary"}>
              {fileUrl ? (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="hover:underline focus-ring" dir="auto">
                  {c.fileName ?? "عرض الملف"}
                </a>
              ) : (
                "لم يُرفع بعد"
              )}
            </DataRow>
            <DataRow label="حالة التوثيق" valueClass={status.tone === "success" ? "text-state-success" : status.tone === "error" ? "text-state-error" : "text-state-warning"}>
              {status.label}
            </DataRow>
            {c.status === "verified" && (
              <DataRow label="الصادر عنها" valueClass="text-state-info">
                جهة خارجية — ليست بوابة التدريب
              </DataRow>
            )}
            <DataRow label="رقم الطلب">
              <span dir="ltr" className="font-mono">
                {c.reference}
              </span>
            </DataRow>
          </dl>
        </section>

        <div className="flex w-full flex-wrap items-center gap-3">
          {c.status === "pending" && (
            <>
              <ButtonLink href={`/trainee/certificates/external/${c.id}?edit=1`}>عدّل البيانات</ButtonLink>
              <DeleteExternalButton id={c.id} title={c.title} />
            </>
          )}
          {c.status === "needs_changes" && (
            <>
              <ButtonLink href={`/trainee/certificates/external/${c.id}?edit=1`}>تعديل وإعادة الإرسال</ButtonLink>
              <ButtonLink href="/trainee/help" variant="secondary">
                تواصل مع الدعم
              </ButtonLink>
              <DeleteExternalButton id={c.id} title={c.title} />
            </>
          )}
          {c.status === "verified" && <ButtonLink href="/trainee/trainings">اعرض في ملفي</ButtonLink>}
          {c.status === "rejected" && (
            <>
              <ButtonLink href="/trainee/certificates/external/new">قدّم طلبًا جديدًا</ButtonLink>
              <ButtonLink href="/trainee/help" variant="secondary">
                تواصل مع الدعم
              </ButtonLink>
              <DeleteExternalButton id={c.id} title={c.title} />
            </>
          )}
        </div>

        <StatusHero
          tone={hero.tone}
          icon={hero.icon}
          title={hero.title}
          eyebrow={
            <>
              <IconPill icon={hero.icon} tone={hero.tone === "success" ? "surface-success" : hero.tone === "error" ? "surface-warning" : "surface-warning"}>
                {status.label}
              </IconPill>
              <span dir="ltr" className="font-mono text-[14px] leading-[1.5] text-text-muted">
                {c.reference}
              </span>
            </>
          }
          footer={
            <p className={`flex items-center gap-2 type-subtitle ${hero.tone === "success" ? "text-state-success" : hero.tone === "error" ? "text-state-error" : "text-state-warning"}`}>
              <Glyph icon={Clock} size={16} />
              {decided ? `صدر القرار في ${formatDate(c.updatedAt)}` : "متوقع خلال ٢٤ إلى ٤٨ ساعة عمل"}
            </p>
          }
        >
          {hero.body}
        </StatusHero>

        <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
          <SectionCard title="مسار طلبك" titleId="timeline-title" className="flex-1">
            <ol className="flex flex-col gap-4">
              <StepRow disc={40} state="done" icon={Upload} title="رفع الشهادة" description={`${formatDayMonth(c.createdAt)} · ${formatTime(c.createdAt)}`} />
              <StepRow
                disc={40}
                state={c.status === "pending" ? "current" : c.status === "needs_changes" ? "alert" : "done"}
                icon={c.status === "needs_changes" ? FilePen : decided ? CircleCheck : ScanSearch}
                title="مراجعة فريق التوثيق"
                description={c.status === "needs_changes" ? `طُلب تصحيح · ${formatDayMonth(c.updatedAt)}` : "٢٤–٤٨ ساعة عمل"}
              />
              <StepRow
                disc={40}
                state={c.status === "verified" ? "done" : c.status === "rejected" ? "alert" : "todo"}
                icon={c.status === "rejected" ? CircleX : FileCheck}
                title="القرار"
                description={c.status === "verified" ? `وُثّقت · ${formatDayMonth(c.updatedAt)}` : c.status === "rejected" ? `رُفضت · ${formatDayMonth(c.updatedAt)}` : "يصلك إشعار فور صدوره"}
              />
              <StepRow
                disc={40}
                state={c.status === "verified" ? "done" : "todo"}
                icon={BadgeCheck}
                title="الظهور في ملفك"
                description="تظهر «شهادة خارجية · موثّقة» في ملف التدريب"
              />
            </ol>
          </SectionCard>

          <aside aria-label="عن ملفك" className="flex w-full shrink-0 flex-col gap-5 lg:w-[380px]">
            <SectionCard title="ماذا يحدث لملف شهادتك؟" titleId="privacy-title">
              <ul className="flex flex-col gap-4">
                <IconRow tone="success" titleSize="small" icon={Lock} title="محفوظ في مساحة خاصة" description="لا يطّلع عليه إلا فريق التوثيق المختص." />
                <IconRow tone="success" titleSize="small" icon={Building2} title="لا يُشارك مع أي جهة تدريبية" description="الجهات ترى الشهادة وحالتها فقط — لا ترى الملف." />
                <IconRow tone="success" titleSize="small" icon={Trash2} title="تحذفه متى شئت" description="ما لم تُوثَّق الشهادة، احذف الطلب ليُحذف الملف نهائيًا." />
              </ul>
            </SectionCard>
            {!decided && (
              <SectionCard title="أثناء الانتظار" titleId="waiting-title">
                <p className="type-body text-text-secondary">يمكنك استخدام المنصة والتعلّم بشكل طبيعي. التوثيق لا يعطّل شيئًا في حسابك.</p>
                <ButtonLink href="/trainee/trainings" variant="outline" fullWidth>
                  تابع التعلّم
                </ButtonLink>
              </SectionCard>
            )}
            <Link href="/trainee/help" className="flex h-12 items-center justify-center rounded-12 type-button text-text-brand hover:underline focus-ring">
              تواصل مع الدعم
            </Link>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
