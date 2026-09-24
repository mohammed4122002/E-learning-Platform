"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleAlert, CircleCheckBig, MapPin, Tv, Video } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { MODE_TITLES, STEP3_NEXT } from "@/lib/trainer-courses";
import type { CourseMode } from "@/types/views";
import { createCourseDraft } from "@/app/(trainer)/trainer/courses/actions";
import { useWizard } from "./WizardShell";

/* TRR-CRS-02 · نمط التقديم — «Trainer / Course Mode Selector» (390:14110 حضوري · 390:14507 مباشر · 390:14904 مسجَّل). */

const MODES: {
  mode: CourseMode;
  icon: typeof MapPin;
  tile: string;
  check: string;
  description: string;
  unlocks: string[];
}[] = [
  {
    mode: "recorded",
    icon: Tv, // TG «icon · monitor-play» draws Lucide «tv»
    tile: "bg-state-warning-bg text-state-warning",
    check: "text-state-warning",
    description: "منتج رقمي يُباع ويشاهده المتدرب في أي وقت",
    unlocks: ["فيديوهات ودروس مرفوعة", "بلا مواعيد ولا حضور", "بيع مفتوح دائم", "معاينة مجانية", "شهادة بإكمال ١٠٠٪"],
  },
  {
    mode: "live_remote",
    icon: Video,
    tile: "bg-state-info-bg text-state-info",
    check: "text-state-info",
    description: "جلسات مباشرة عبر الإنترنت في مواعيد ثابتة",
    unlocks: ["رابط بث ومنصة", "مواعيد ثابتة للجلسات", "حضور آلي من البث", "مقاعد محدودة", "تسجيل الجلسات اختياري"],
  },
  {
    mode: "in_person",
    icon: MapPin,
    tile: "bg-state-success-bg text-state-success",
    check: "text-state-success",
    description: "تدريب في مكان محدد مع حضور فعلي",
    unlocks: ["قاعة ومكان محدد", "جدول جلسات بتواريخ", "رصد حضور يدوي", "مقاعد محدودة", "شهادة بشرط الحضور ٧٥٪"],
  },
];

export function ModeStep({ programVersionId, initialMode }: { programVersionId: string; initialMode: CourseMode | null }) {
  const { courseId, save, run, flush } = useWizard();
  const router = useRouter();
  const [mode, setMode] = useState<CourseMode | null>(initialMode);
  const [creating, setCreating] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function choose(next: CourseMode) {
    if (next === mode || creating) return;
    setMode(next);
    if (courseId) {
      save({ mode: next });
      return;
    }
    // First choice: the draft is created (and autosaved from now on).
    setCreating(true);
    const res = await run(() => createCourseDraft(programVersionId, next));
    setCreating(false);
    if (res?.ok && res.data) router.replace(`/trainer/courses/${res.data.id}/setup/mode`);
  }

  const next = mode ? STEP3_NEXT[mode] : null;

  return (
    <>
      <section aria-labelledby="mode-q" className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 id="mode-q" className="text-[26px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">
            كيف تريد تقديم هذا البرنامج؟
          </h2>
          <p className="type-body-lg text-text-secondary">النمط يحدد ما ستُدخله في الخطوات التالية — ولا يمكن تغييره بعد نشر الدورة.</p>
        </div>
        <div role="radiogroup" aria-labelledby="mode-q" className="grid gap-5 md:grid-cols-3 md:items-start">
          {MODES.map((m) => {
            const selected = mode === m.mode;
            return (
              <button
                key={m.mode}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={creating}
                onClick={() => void choose(m.mode)}
                className={`flex cursor-pointer flex-col gap-4 rounded-22 px-6 pt-[26px] pb-7 text-start transition-shadow focus-ring disabled:cursor-progress ${
                  selected
                    ? "border-[3px] border-action-primary bg-bg-brand-tint drop-shadow-[0px_8px_12px_rgba(91,60,196,0.25)]"
                    : "border-[1.5px] border-border-default bg-bg-card drop-shadow-milestone hover:border-action-primary"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`flex size-[60px] shrink-0 items-center justify-center rounded-16 ${selected ? "bg-action-primary text-text-on-brand" : m.tile}`}>
                    <Glyph icon={m.icon} size={20} />
                  </span>
                  {selected ? (
                    <>
                      <span className="flex-1" />
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-[11px] py-1.5 type-caption text-text-brand">
                        مختار
                        <Glyph icon={CircleCheckBig} size={16} />
                      </span>
                    </>
                  ) : (
                    <>
                      <span aria-hidden className="size-[22px] shrink-0 rounded-full border-[1.5px] border-border-default bg-bg-surface" />
                      <span className="flex-1" />
                    </>
                  )}
                </span>
                <span className={`type-h3 ${selected ? "text-text-brand" : "text-text-primary"}`}>{MODE_TITLES[m.mode]}</span>
                <span className="type-body-lg text-text-secondary">{m.description}</span>
                <span aria-hidden className="h-px w-full bg-border-divider" />
                <span className="type-caption text-text-muted">ما يفتحه هذا النمط:</span>
                <span className="flex flex-col gap-4">
                  {m.unlocks.map((u) => (
                    <span key={u} className="flex items-start gap-2.5">
                      <Glyph icon={CircleCheckBig} size={16} className={`mt-1.5 ${selected ? "text-text-brand" : m.check}`} />
                      <span className="flex-1 type-body text-text-primary">{u}</span>
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        {next && (
          <p className="flex items-start gap-3.5 rounded-16 bg-state-info-bg px-5 pt-4 pb-[18px] type-body-lg text-state-info">
            <Glyph icon={CircleAlert} size={20} className="mt-1.5" />
            <span className="flex-1">{next.hint}</span>
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card px-[26px] pt-[22px] pb-6 shadow-card lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <p className="type-subtitle text-text-primary">{next ? next.next : "اختر نمطًا لتفتح الخطوة التالية"}</p>
          <p className="type-caption text-text-muted">يمكنك الرجوع وتغيير النمط ما دامت الدورة مسودة.</p>
        </div>
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center">
          <Button
            size="l"
            disabled={!courseId || !mode}
            loading={creating}
            onClick={async () => {
              if (await flush()) router.push(`/trainer/courses/${courseId}/setup/schedule`);
            }}
          >
            {next ? next.button : "التالي"}
          </Button>
          <Button size="l" variant="ghost" onClick={() => router.push("/trainer/programs")}>
            السابق
          </Button>
          <Button
            size="l"
            variant="outline"
            disabled={!courseId}
            loading={leaving}
            onClick={async () => {
              setLeaving(true);
              const ok = await flush();
              setLeaving(false);
              if (ok) router.push("/trainer/courses");
            }}
          >
            احفظ وأكمل لاحقًا
          </Button>
        </div>
      </section>
    </>
  );
}
