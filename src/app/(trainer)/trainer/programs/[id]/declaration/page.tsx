import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  BookOpen,
  ChevronLeft,
  CircleCheck,
  FileText,
  Hourglass,
  Lock,
  MapPin,
  Percent,
  Puzzle,
  RefreshCcw,
  ShieldCheck,
  Tag,
  Target,
  Upload,
  Users,
} from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { DeclarationForm } from "@/components/trainer-programs/DeclarationForm";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { requireTrainer } from "@/lib/auth";
import { getTrainerProgram, type ProgramDetail, type RequestView } from "@/lib/data/trainer-programs";
import { formatDate, formatDayMonth, formatPrice, formatRelative, pluralAr } from "@/lib/format";
import { MISSING_FIELDS, filesWord, formatBytes, hoursWord, isEditable, lessonsWord, shortHash, versionLabel, versionLabelAr } from "@/lib/trainer-programs";

export const metadata: Metadata = { title: "الإقرار قبل النشر" };

const MODE_WORD = { in_person: "حضوري", live_remote: "عن بُعد مباشر", recorded: "مسجَّل", blended: "مدمج" } as const;

const timeFmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "Asia/Riyadh" });

function RecordRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <dt className="min-w-0 flex-1 type-caption text-text-muted">{label}</dt>
      <dd dir={mono ? "ltr" : undefined} className={mono ? "font-mono text-[14px] text-text-primary" : "text-[16px] leading-[1.5] text-text-primary"}>
        {value}
      </dd>
    </div>
  );
}

function SummaryRow({ icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone?: string }) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-12 bg-bg-page px-4 py-[13px]">
      <span className="flex min-w-0 flex-1 items-center gap-2.5 type-body text-text-secondary">
        <Glyph icon={icon} size={20} className="text-text-muted" />
        {label}
      </span>
      <span className={`text-[16px] leading-[1.5] ${tone ?? "text-text-primary"}`}>{value}</span>
    </li>
  );
}

const REQUEST_PILL: Record<RequestView["status"], { label: string; tone: string }> = {
  under_review: { label: "قيد المراجعة", tone: "text-state-warning" },
  approved: { label: "اعتُمدت", tone: "text-state-success" },
  needs_changes: { label: "رُدّت لتعديل", tone: "text-state-error" },
  rejected: { label: "رُفضت", tone: "text-state-error" },
  withdrawn: { label: "سُحبت", tone: "text-text-muted" },
};

function summary(p: ProgramDetail, version: string) {
  const mode = p.courses.mode ? MODE_WORD[p.courses.mode] : null;
  return (
    <section className="flex w-full flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="min-w-0 flex-1 type-h3 text-text-primary">ما الذي سيُنشر بالضبط؟</h2>
        <Link href={`/trainer/programs/${p.id}/preview`} className="rounded-8 text-[16px] leading-[1.5] text-text-brand hover:underline focus-ring">
          عاين كما يراه المتدرب
        </Link>
      </div>
      <p className="type-caption text-text-muted">هذه لقطة نهائية من محتوى النسخة {version}. أي تعديل بعد الإرسال يتطلب سحب الطلب وإنشاء نسخة جديدة.</p>
      <ul className="flex flex-col gap-3">
        <SummaryRow icon={BookOpen} label="اسم البرنامج" value={p.title} />
        <SummaryRow icon={FileText} label="الوصف" value={`${pluralAr((p.summary ?? "").length, ["حرف واحد", "حرفان", "أحرف", "حرفًا"])} · محدَّث ${formatRelative(p.updatedAt)}`} />
        <SummaryRow icon={Target} label="الأهداف التعليمية" value={p.objectives.length ? pluralAr(p.objectives.length, ["هدف واحد", "هدفان", "أهداف", "هدفًا"]) : "لا أهداف بعد"} tone={p.objectives.length ? "text-state-success" : "text-state-error"} />
        <SummaryRow icon={Tag} label="التصنيف والمهارات" value={`${p.category?.name ?? "بلا تصنيف"} · ${pluralAr(p.skills.length, ["مهارة واحدة موسومة", "مهارتان موسومتان", "مهارات موسومة", "مهارة موسومة"]) || "٠ مهارات"}`} />
        <SummaryRow icon={Users} label="الجمهور المستهدف" value={`${pluralAr(p.audience.length, ["فئة واحدة", "فئتان", "فئات", "فئة"]) || "٠ فئات"} · ${p.prerequisites ? "متطلب مسبق محدد" : "بلا متطلب مسبق"}`} />
        <SummaryRow
          icon={Puzzle}
          label="المحتوى"
          value={[pluralAr(p.units.length, ["فصل واحد", "فصلان", "فصول", "فصلًا"]) || "٠ فصول", p.hours ? hoursWord(p.hours) : null, lessonsWord(p.totals.lessons)].filter(Boolean).join(" · ")}
        />
        <SummaryRow icon={Upload} label="المواد المرفوعة" value={`${filesWord(p.totals.files)} · ${formatBytes(p.totals.bytes)} · أُنتجت خارج المنصة`} tone="text-state-info" />
        <SummaryRow icon={MapPin} label="نمط التقديم" value={mode ?? "يُحدَّد عند إنشاء كل دورة"} />
        <SummaryRow icon={Percent} label="السعر" value={p.price === null ? "لم يُحدَّد" : `${formatPrice(p.price)} للمتدرب · غير شامل الضريبة`} tone={p.price === null ? "text-state-error" : "text-state-success"} />
        <SummaryRow icon={RefreshCcw} label="سياسة الاسترداد" value="السياسة الموحّدة للمنصة — غير قابلة للتعديل" tone="text-state-warning" />
      </ul>
    </section>
  );
}

function history(p: ProgramDetail, draftVersion: string | null) {
  return (
    <section className="flex w-full flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-6 shadow-card">
      <h2 className="type-h3 text-text-primary">سجل النسخ</h2>
      <ul className="flex flex-col gap-3">
        {draftVersion && (
          <li className="flex flex-col gap-0.5 rounded-12 bg-bg-page px-3 py-[11px]">
            <span className="flex items-center gap-2">
              <span dir="ltr" className="type-caption text-text-primary">
                {draftVersion}
              </span>
              <span className="rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-state-warning">مسودة جاهزة</span>
            </span>
            <span className="type-caption text-text-muted">{formatRelative(p.updatedAt)} · آخر تعديل</span>
          </li>
        )}
        {p.requests.map((r) => (
          <li key={r.id} className="flex flex-col gap-0.5 rounded-12 bg-bg-page px-3 py-[11px]">
            <span className="flex items-center gap-2">
              <span dir="ltr" className="type-caption text-text-primary">
                {versionLabel(r.revision)}
              </span>
              <span className={`rounded-full bg-bg-surface px-2.5 py-[5px] type-caption ${REQUEST_PILL[r.status].tone}`}>{REQUEST_PILL[r.status].label}</span>
            </span>
            <span className="type-caption text-text-muted">
              {formatDayMonth(r.submittedAt)}
              {r.status === "needs_changes" && r.findings[0] ? ` · ${r.findings[0].label}` : r.reason ? ` · ${r.reason}` : r.revision === 1 ? " · النسخة الأولى" : ""}
            </span>
          </li>
        ))}
        {!draftVersion && p.requests.length === 0 && <li className="type-small text-text-muted">لا نسخ مرسلة بعد.</li>}
      </ul>
    </section>
  );
}

/** TRR-DEC-01 · الإقرار قبل النشر (268:3104). After submission the same page shows the stored record. */
export default async function DeclarationPage({ params }: PageProps<"/trainer/programs/[id]/declaration">) {
  const { id } = await params;
  const user = await requireTrainer(`/trainer/programs/${id}/declaration`);
  const p = await getTrainerProgram(id, user.id);
  if (!p) notFound();
  const editable = isEditable(p.phase);
  const nextRevision = p.revision + 1;
  const decl = p.declarations[0] ?? null;
  const editorHref = `/trainer/programs/${p.id}/edit/${p.missing[0] ? MISSING_FIELDS[p.missing[0]].step : "basics"}`;

  const record = (
    <section className="flex w-full flex-col overflow-hidden rounded-22 border-2 border-action-primary bg-bg-card shadow-float">
      <div aria-hidden className="h-2 bg-action-primary" />
      <div className="flex flex-col gap-4 px-[22px] pt-[22px] pb-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-11 items-center justify-center rounded-12 bg-bg-brand-tint text-text-brand">
            <Glyph icon={ShieldCheck} size={20} />
          </span>
          <h2 className="type-h3 text-text-primary">سجل الإقرار</h2>
        </div>
        <p className="type-caption text-text-muted">يُحفظ هذا السجل دائمًا ويُرفَق بأي مراجعة أو بلاغ لاحق.</p>
        <dl className="flex flex-col gap-3.5">
          <RecordRow label="رقم البرنامج" value={p.reference} mono />
          {editable || !decl ? (
            <>
              <RecordRow label="رقم النسخة" value={versionLabel(nextRevision)} mono />
              <RecordRow label="حالة النسخة" value={p.missing.length ? "مسودة ناقصة" : "مسودة جاهزة للإرسال"} />
              <RecordRow label="المُقِرّ" value={p.trainer.name} />
              <RecordRow label="رقم الهوية الموثّقة" value="يُصدر عند الإرسال" />
              <RecordRow label="تاريخ الإقرار" value="عند الإرسال" />
              <RecordRow label="وقت الإقرار (توقيت الرياض)" value="عند الإرسال" />
              <RecordRow label="بصمة المحتوى" value="تُحسب عند الإرسال" />
            </>
          ) : (
            <>
              <RecordRow label="رقم النسخة" value={versionLabel(decl.revision)} mono />
              <RecordRow label="حالة النسخة" value={p.phase === "under_review" ? "مرسلة — قيد المراجعة" : p.phase === "published" ? "معتمدة ومنشورة" : p.phase === "rejected" ? "مرفوضة" : "مرسلة"} />
              <RecordRow label="المُقِرّ" value={p.trainer.name} />
              <RecordRow label="رقم الهوية الموثّقة" value={decl.reference} mono />
              <RecordRow label="تاريخ الإقرار" value={formatDate(decl.createdAt)} />
              <RecordRow label="وقت الإقرار (توقيت الرياض)" value={timeFmt.format(new Date(decl.createdAt))} />
              <RecordRow label="بصمة المحتوى" value={shortHash(decl.contentHash)} mono />
            </>
          )}
        </dl>
        <p className="flex items-center gap-2.5 rounded-12 bg-state-success-bg px-3.5 py-3 type-caption text-state-success">
          <Glyph icon={CircleCheck} size={16} />
          {editable ? "يُختم الوقت لحظة ضغطك «أقرّ وأرسل» — لا قبلها." : "خُتم الوقت لحظة ضغطك «أقرّ وأرسل»."}
        </p>
      </div>
    </section>
  );

  const after = (
    <section className="flex w-full flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
      <h2 className="type-h3 text-text-primary">ماذا يحدث بعد الإرسال؟</h2>
      <ul className="flex flex-col gap-3">
        {[
          { icon: Lock, tone: "text-state-warning", t: "يُقفل البرنامج للتعديل", d: `لا يمكنك تحرير النسخة ${versionLabelAr(nextRevision)} أثناء المراجعة. لتعديلها اسحب الطلب أولًا.` },
          { icon: Hourglass, tone: "text-state-info", t: "يُراجعه فريق المنصة", d: "خلال ٣ أيام عمل. قد يُطلب تعديل بسبب مصنَّف وحقل محدد." },
          { icon: BellRing, tone: "text-text-brand", t: "يصلك القرار", d: "قبول فوري للنشر، أو رد بسبب واضح — في الحالتين يصلك إشعار." },
          { icon: CircleCheck, tone: "text-state-success", t: "عند القبول: يُنشر", d: "يظهر للمتدربين، وتستطيع إنشاء دورات مجدولة منه." },
        ].map((x) => (
          <li key={x.t} className="flex items-start gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-surface ${x.tone}`}>
              <Glyph icon={x.icon} size={20} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="text-[16px] leading-[1.5] text-text-primary">{x.t}</span>
              <span className="type-caption text-text-muted">{x.d}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <>
      <TopBar title="الإقرار قبل النشر" subtitle="خطوة أخيرة موثّقة قبل إرسال البرنامج" />
      <PageBody className="!gap-6">
        <Breadcrumb items={[{ label: "برامجي", href: "/trainer/programs" }, { label: p.title, href: `/trainer/programs/${p.id}` }, { label: "الإقرار قبل النشر" }]} />
        <section className="flex flex-col gap-5 rounded-22 border-2 border-action-primary bg-bg-brand-tint px-5 py-7 sm:flex-row sm:items-center sm:gap-[26px] sm:px-[30px]">
          <span className="flex size-[72px] shrink-0 items-center justify-center rounded-16 bg-action-primary text-text-on-brand">
            <Glyph icon={ShieldCheck} size={32} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-text-brand">
                <Glyph icon={ShieldCheck} size={16} />
                خطوة موثَّقة
              </span>
              {editable && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-state-success">
                  <Glyph icon={ChevronLeft} size={16} />
                  يمكنك الرجوع قبل التأكيد
                </span>
              )}
            </div>
            <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">إقرارك قبل إرسال البرنامج للنشر</h2>
            <p className="type-body-lg text-text-secondary">هذه ليست شاشة تأكيد عابرة. ما تُقرّ به هنا يُحفظ برقم نسخة وختم زمني، ويصبح المرجع عند أي بلاغ أو نزاع مستقبلي — لك وللمنصة معًا.</p>
          </div>
        </section>

        {editable ? (
          <DeclarationForm
            programId={p.id}
            missing={p.missing.map((m) => MISSING_FIELDS[m].label)}
            editorHref={editorHref}
            record={record}
            history={history(p, versionLabel(nextRevision))}
            summary={summary(p, versionLabelAr(nextRevision))}
            after={after}
          />
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              {summary(p, versionLabelAr(p.revision))}
              {after}
            </div>
            <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
              {record}
              <section className="flex flex-col gap-3 rounded-16 border border-border-default bg-bg-card p-6 shadow-card">
                <p className="type-body text-text-secondary">{decl ? "أُرسل هذا الإقرار مع النسخة أعلاه، ولا يمكن تعديله." : "لا إقرار مسجّل لهذا البرنامج."}</p>
                <ButtonLink href={`/trainer/programs/${p.id}/review`} variant="outline" fullWidth>
                  حالة الطلب
                </ButtonLink>
              </section>
              {history(p, null)}
            </aside>
          </div>
        )}
      </PageBody>
    </>
  );
}
