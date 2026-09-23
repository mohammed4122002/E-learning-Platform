"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleCheck, CircleUserRound, CircleX, Copy, Mail, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Choice";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { initialsOf } from "@/components/ui/Data";
import { useToast } from "@/components/ui/Toast";
import { formatNumber, formatPercent, toArabicDigits } from "@/lib/format";

export type ReportCourse = { id: string; title: string; source: string; monthYear: string | null; hours: number; result: number | null };
export type ReportData = {
  fullName: string;
  verified: boolean;
  period: string;
  stats: { skills: number; certificates: number; completed: number; hours: number };
  skills: string[];
  completed: ReportCourse[];
  withdrawn: ReportCourse[];
  verifyLinks: { title: string; url: string }[];
  shareable: boolean;
};

type Prefs = { courses: boolean; hours: boolean; skills: boolean; grades: boolean; withdrawn: boolean };

/** TRN-LRN-02 · تقرير سجل التعلم (Figma 211:12284): printable report + export/share + "ما الذي يظهر في التقرير؟". */
export function ReportView({ data }: { data: ReportData }) {
  const toast = useToast();
  const [prefs, setPrefs] = useState<Prefs>({ courses: true, hours: true, skills: true, grades: false, withdrawn: false });
  const set = (k: keyof Prefs) => (e: React.ChangeEvent<HTMLInputElement>) => setPrefs((p) => ({ ...p, [k]: e.target.checked }));
  const verifyText = data.verifyLinks.map((l) => `${l.title}: ${l.url}`).join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(verifyText);
      toast("success", "نُسخت روابط التحقق من شهاداتك.");
    } catch {
      toast("error", "تعذّر النسخ تلقائيًا. انسخ الروابط من أسفل التقرير.");
    }
  };
  const mailto = `mailto:?subject=${encodeURIComponent(`سجل تدريب ${data.fullName} — بوابة التدريب`)}&body=${encodeURIComponent(
    `${data.fullName}\n${toArabicDigits(data.stats.completed)} دورات مكتملة · ${toArabicDigits(data.stats.certificates)} شهادات · ${toArabicDigits(data.stats.hours)} ساعة موثّقة\n\nروابط التحقق العامة:\n${verifyText}`,
  )}`;

  const stats = [
    prefs.skills && { value: data.stats.skills, label: "مهارة" },
    { value: data.stats.certificates, label: "شهادة" },
    prefs.courses && { value: data.stats.completed, label: "دورة مكتملة" },
    prefs.hours && { value: data.stats.hours, label: "ساعة موثّقة" },
  ].filter(Boolean) as { value: number; label: string }[];

  const row = (c: ReportCourse, withdrawn = false) => (
    <li key={c.id} className="flex items-center gap-3 py-2">
      <Glyph icon={withdrawn ? CircleX : CircleCheck} size={16} className={withdrawn ? "text-text-muted" : "text-state-success"} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`type-subtitle ${withdrawn ? "text-text-secondary" : "text-text-primary"}`}>{c.title}</span>
        <span className="type-caption text-text-muted">{withdrawn ? `${c.source} · انسحاب` : c.source}</span>
      </span>
      {prefs.grades && c.result !== null && !withdrawn && <span className="shrink-0 type-caption text-state-success">{formatPercent(c.result)}</span>}
      {c.monthYear && <span className="shrink-0 type-caption text-text-muted">{c.monthYear}</span>}
      {prefs.hours && c.hours > 0 && !withdrawn && <span className="shrink-0 type-caption text-text-brand">{formatNumber(c.hours)} ساعة</span>}
    </li>
  );

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #learning-report, #learning-report * { visibility: visible !important; }
        #learning-report { position: absolute; inset: 0 auto auto 0; width: 100%; box-shadow: none !important; }
        @page { margin: 14mm; }
      }`}</style>
      <article id="learning-report" aria-labelledby="report-name" className="flex min-w-0 flex-1 flex-col gap-6 overflow-hidden rounded-22 border border-border-default border-t-4 border-t-action-primary bg-bg-card px-5 pt-6 pb-6 shadow-card sm:px-8">
        <header className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-action-primary text-text-on-brand">
            <Glyph icon={CircleUserRound} size={24} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id="report-name" className="text-[26px] leading-[1.2] font-bold text-text-primary sm:text-[30px]">
              {data.fullName}
            </h2>
            <p className="type-small text-text-secondary">
              سجل تدريب {data.verified ? "موثَّق" : ""} · منصة بوابة التدريب · {data.period}
            </p>
          </div>
          <span aria-hidden className="hidden size-14 shrink-0 items-center justify-center rounded-full bg-action-primary text-[19px] text-text-on-brand sm:flex">
            {initialsOf(data.fullName)}
          </span>
        </header>
        <hr className="border-border-divider" />
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse items-center gap-1 text-center">
              <dt className="type-caption text-text-muted">{s.label}</dt>
              <dd className="text-[30px] leading-none font-bold text-text-brand">{formatNumber(s.value)}</dd>
            </div>
          ))}
        </dl>
        <hr className="border-border-divider" />
        {prefs.courses && (
          <section aria-labelledby="report-courses" className="flex flex-col gap-2">
            <h3 id="report-courses" className="type-h4 text-text-primary">
              الدورات المكتملة
            </h3>
            {data.completed.length > 0 ? <ul className="flex flex-col">{data.completed.map((c) => row(c))}</ul> : <p className="type-small text-text-muted">لا دورات مكتملة بعد.</p>}
          </section>
        )}
        {prefs.withdrawn && data.withdrawn.length > 0 && (
          <section aria-labelledby="report-withdrawn" className="flex flex-col gap-2">
            <h3 id="report-withdrawn" className="type-h4 text-text-primary">
              الدورات المنسحب منها
            </h3>
            <ul className="flex flex-col">{data.withdrawn.map((c) => row(c, true))}</ul>
          </section>
        )}
        {prefs.skills && data.skills.length > 0 && (
          <section aria-labelledby="report-skills" className="flex flex-col gap-2">
            <h3 id="report-skills" className="type-h4 text-text-primary">
              المهارات المكتسبة
            </h3>
            <ul className="flex flex-wrap gap-2">
              {data.skills.map((s) => (
                <li key={s} className="rounded-full border border-border-default px-3 py-1 type-caption text-text-primary">
                  {s}
                </li>
              ))}
            </ul>
          </section>
        )}
        {data.verifyLinks.length > 0 && (
          <footer className="flex flex-col gap-2 rounded-16 bg-state-success-bg px-4 py-3.5">
            <p className="flex items-center gap-2 type-small text-state-success">
              <Glyph icon={ShieldCheck} size={16} />
              روابط تحقق عامة — تعرض كل شهادة دون تسجيل دخول
            </p>
            <ul className="flex flex-col gap-1">
              {data.verifyLinks.map((l) => (
                <li key={l.url} className="flex flex-wrap items-center gap-x-2 type-caption text-text-secondary">
                  <span>{l.title}:</span>
                  <Link href={l.url} className="font-mono text-state-success underline-offset-2 hover:underline" dir="ltr">
                    {l.url.replace(/^https?:\/\//, "")}
                  </Link>
                </li>
              ))}
            </ul>
          </footer>
        )}
      </article>

      <aside aria-label="تصدير التقرير وإعداداته" className="flex w-full flex-col gap-6 lg:w-[380px] lg:shrink-0 print:hidden">
        <section aria-labelledby="export-title" className="flex flex-col gap-3 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
          <h2 id="export-title" className="type-h3 text-text-primary">
            تصدير ومشاركة
          </h2>
          {!data.shareable && (
            <Alert tone="warning" title="المشاركة مغلقة في إعدادات الخصوصية">
              فعّل «إظهار سجل التعلم» من <Link href="/account" className="text-text-brand underline">إعدادات الحساب</Link> لمشاركته. يمكنك تنزيله لنفسك.
            </Alert>
          )}
          <Button size="l" fullWidth icon={<Glyph icon={Printer} size={20} />} onClick={() => window.print()}>
            نزّل التقرير PDF
          </Button>
          <p className="-mt-1 type-caption text-text-muted">يفتح نافذة الطباعة — اختر «حفظ بصيغة PDF».</p>
          <Button variant="outline" size="l" fullWidth icon={<Glyph icon={Copy} size={20} />} onClick={copy} disabled={!data.shareable || data.verifyLinks.length === 0}>
            نسخ رابط التحقق
          </Button>
          {data.shareable ? (
            <a
              href={mailto}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-12 px-8 type-body-lg text-text-primary inner-stroke istroke-w-[1.5px] istroke-c-border-default hover:bg-bg-brand-tint focus-ring"
            >
              <Glyph icon={Mail} size={20} />
              شارك مع جهة توظيف
            </a>
          ) : (
            <Button variant="outline" size="l" fullWidth disabled>
              شارك مع جهة توظيف
            </Button>
          )}
        </section>
        <section aria-labelledby="include-title" className="flex flex-col gap-2 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
          <h2 id="include-title" className="type-h3 text-text-primary">
            ما الذي يظهر في التقرير؟
          </h2>
          <Toggle checked={prefs.courses} onChange={set("courses")} description="الاسم والجهة والساعات والتاريخ">
            الدورات المكتملة
          </Toggle>
          <Toggle checked={prefs.hours} onChange={set("hours")} description="مجموع الساعات المعتمدة">
            الساعات الموثّقة
          </Toggle>
          <Toggle checked={prefs.skills} onChange={set("skills")} description="مستخرجة من الدورات">
            المهارات المكتسبة
          </Toggle>
          <Toggle checked={prefs.grades} onChange={set("grades")} description="مخفية افتراضيًا — يمكنك إظهارها">
            الدرجات والنتائج
          </Toggle>
          <Toggle checked={prefs.withdrawn} onChange={set("withdrawn")} description="مخفية افتراضيًا">
            الدورات المنسحب منها
          </Toggle>
        </section>
      </aside>
    </div>
  );
}
