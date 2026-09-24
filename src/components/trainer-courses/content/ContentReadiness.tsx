import Link from "next/link";
import { CircleAlert, CircleCheckBig, CircleX } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { formatPercent, pluralAr, toArabicDigits } from "@/lib/format";
import type { TrainerContent } from "@/lib/data/trainer-courses";

/* «Trainer / Recorded · Content Progress» (394:3892: Incomplete · Ready) and «شروط النشر» (395:17087). */

export function readiness(content: TrainerContent) {
  const t = content.totals;
  const checks = [
    { ok: t.modules > 0 && t.lessons > 0, text: `${pluralAr(t.modules, ["وحدة واحدة", "وحدتان", "وحدات", "وحدة"])} · ${pluralAr(t.lessons, ["درس واحد", "درسان", "دروس", "درسًا"])}` },
    { ok: t.uploadedVideos > 0 || (t.lessons > 0 && t.missing.length === 0), text: t.videos > 0 ? `${toArabicDigits(t.uploadedVideos)} فيديو مرفوع` : "مواد الدروس مرفوعة" },
    { ok: t.lessons > 0 && t.missing.length === 0 && content.modules.every((m) => m.lessons.length > 0), text: "كل درس له مادة" },
    { ok: t.previews > 0, text: "درس معاينة مجاني محدَّد" },
  ];
  return { checks, done: checks.filter((c) => c.ok).length, ready: checks.every((c) => c.ok) };
}

export function missingNote(content: TrainerContent): string | null {
  const m = content.totals.missing;
  if (m.length === 0) return null;
  const names = m.slice(0, 3).map((l) => `«${l.title}»`).join(" و");
  return `${pluralAr(m.length, ["درس بلا مادة", "درسان بلا مادة", "دروس بلا مادة", "درسًا بلا مادة"])} — ${names}${m.length > 3 ? " وغيرها" : ""}.`;
}

export function ContentProgressCard({ content, action }: { content: TrainerContent; action?: { label: string; href: string } }) {
  const r = readiness(content);
  const pct = Math.round((r.done / r.checks.length) * 100);
  const note = missingNote(content);
  return (
    <section
      className={`flex flex-col gap-[18px] rounded-22 border-2 bg-bg-card px-[26px] pt-[26px] pb-7 drop-shadow-milestone ${r.ready ? "border-state-success" : "border-state-warning"}`}
    >
      <div className="flex items-center gap-3">
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-12 ${r.ready ? "bg-state-success-bg text-state-success" : "bg-state-warning-bg text-state-warning"}`}>
          <Glyph icon={r.ready ? CircleCheckBig : CircleAlert} size={20} />
        </span>
        <h2 className={`min-w-0 flex-1 type-h3 ${r.ready ? "text-state-success" : "text-state-warning"}`}>{r.ready ? "المحتوى جاهز للنشر" : "المحتوى غير مكتمل"}</h2>
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between type-caption text-text-secondary">
          <span>{r.ready ? "كل الشروط مكتملة" : `${toArabicDigits(r.done)} من ${toArabicDigits(r.checks.length)} شروط`}</span>
          <span>{formatPercent(pct)}</span>
        </div>
        <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="جاهزية المحتوى" className="h-2.5 overflow-hidden rounded-full bg-border-default">
          <div className="h-full rounded-full bg-action-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ul className="flex flex-col gap-[18px]">
        {r.checks.map((c) => (
          <li key={c.text} className={`flex items-center gap-2.5 rounded-12 px-3.5 pt-3 pb-[13px] type-body ${c.ok ? "bg-state-success-bg text-state-success" : "bg-state-warning-bg text-state-warning"}`}>
            <Glyph icon={c.ok ? CircleCheckBig : CircleAlert} size={20} />
            <span className="flex-1">{c.text}</span>
          </li>
        ))}
      </ul>
      {note && <p className="type-caption text-state-warning">{note}</p>}
      {action && r.ready ? (
        <Link href={action.href} className="flex h-14 items-center justify-center rounded-12 bg-action-primary px-8 type-body-lg text-text-on-brand shadow-hero hover:bg-action-primary-hover focus-ring">
          {action.label}
        </Link>
      ) : (
        <span aria-disabled className="flex h-14 items-center justify-center rounded-12 bg-bg-disabled px-8 type-body-lg text-text-disabled">
          {r.ready ? "المحتوى مكتمل" : "أكمل الشروط أولًا"}
        </span>
      )}
    </section>
  );
}

export function PublishConditionsCard({ content }: { content: TrainerContent }) {
  const t = content.totals;
  const rows = [
    { ok: t.modules > 0, text: "وحدة واحدة على الأقل" },
    { ok: t.modules > 0 && content.modules.every((m) => m.lessons.length > 0), text: "كل وحدة لها درس" },
    { ok: t.lessons > 0 && t.missing.length === 0, text: "كل درس له مادة مرفوعة" },
    { ok: t.previews > 0, text: "درس معاينة مجاني" },
    { ok: content.lessons.filter((l) => l.kind === "video" && l.mediaPath).every((l) => l.durationSeconds > 0), text: "اكتمال معالجة الفيديوهات" },
  ];
  return (
    <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-[26px] shadow-card">
      <h2 className="type-h2 text-text-primary">شروط النشر</h2>
      <ul className="flex flex-col gap-[18px]">
        {rows.map((r) => (
          <li key={r.text} className={`flex items-center gap-3 rounded-12 px-3.5 py-[13px] type-body ${r.ok ? "bg-state-success-bg text-state-success" : "bg-state-error-bg text-state-error"}`}>
            <Glyph icon={r.ok ? CircleCheckBig : CircleX} size={20} />
            <span className="flex-1">{r.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
