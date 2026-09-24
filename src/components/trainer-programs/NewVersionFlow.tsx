"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpen, Check, CircleCheck, ClipboardCheck, Copy, Flag, LoaderCircle, OctagonX, Puzzle, ShieldCheck, Star, TriangleAlert, Upload, X } from "lucide-react";
import { cloneAssignments, cloneMaterialsBatch, cloneProgram, discardClone } from "@/app/(trainer)/trainer/programs/actions";
import { FlowPanel, FlowRow, FlowSteps, type FlowStep } from "@/components/trainer-programs/FlowPanel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { toArabicDigits } from "@/lib/format";

type Part = "objectives" | "units" | "assignments" | "materials";
type Stage = { s: "options" } | { s: "creating" } | { s: "done"; id: string; title: string } | { s: "failed"; message: string; subtitle?: string };
/** Real server steps of «جارٍ إنشاء النسخة» (454:28838). */
type StepKey = "base" | "assignments" | "materials";
type Progress = { steps: StepKey[]; current: number; filesDone: number; filesTotal: number };

export type CloneSummary = {
  id: string;
  title: string;
  reference: string;
  versionLine: string;
  counts: Record<Part, string>;
  has: Record<Part, boolean>;
  files: number;
};

const PARTS: { key: Part; label: string; icon: LucideIcon }[] = [
  { key: "objectives", label: "الأهداف التعليمية", icon: Flag },
  { key: "units", label: "المحاور والدروس", icon: Puzzle },
  { key: "assignments", label: "الواجبات ومعاييرها", icon: ClipboardCheck },
  { key: "materials", label: "المواد المرفوعة", icon: Upload },
];

/**
 * TRR-PRG-09 · نسخة جديدة — options 454:28500 · creating 454:28838 · success 454:29078 · fail 454:29314.
 * A new version is a new, independent draft program (clone_program); the original and its courses are untouched.
 */
export function NewVersionFlow({ source, defaultTitle, done }: { source: CloneSummary; defaultTitle: string; done?: { id: string; title: string } | null }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(done ? { s: "done", ...done } : { s: "options" });
  const [title, setTitle] = useState(defaultTitle);
  const [parts, setParts] = useState<Record<Part, boolean>>({ objectives: true, units: true, assignments: true, materials: true });
  const [titleError, setTitleError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>({ steps: ["base"], current: 0, filesDone: 0, filesTotal: 0 });
  const [, start] = useTransition();

  function create(override?: Partial<Record<Part, boolean>>) {
    const chosen = { ...parts, ...override };
    const steps: StepKey[] = ["base", ...(chosen.assignments && source.has.assignments ? (["assignments"] as const) : []), ...(chosen.materials && source.has.materials ? (["materials"] as const) : [])];
    setTitleError(null);
    setProgress({ steps, current: 0, filesDone: 0, filesTotal: source.files });
    setStage({ s: "creating" });
    start(async () => {
      const res = await cloneProgram({ sourceId: source.id, title, ...chosen });
      if (!res.ok || !res.id) {
        if (!res.ok && res.fieldErrors?.title) {
          setTitleError(res.fieldErrors.title);
          setStage({ s: "options" });
        } else setStage({ s: "failed", message: res.ok ? "" : res.message });
        return;
      }
      const id = res.id;
      // A later step failed: remove the half-built copy so the original list stays as it was.
      const fail = async (message: string, subtitle?: string) => {
        const undo = await discardClone(id, source.id);
        setStage(undo.ok ? { s: "failed", message, subtitle } : { s: "failed", message, subtitle: "تعذّر إكمال النسخ — بقيت مسودة جزئية في برامجك، والأصل لم يتأثر." });
      };
      let i = 1;
      if (steps.includes("assignments")) {
        setProgress((p) => ({ ...p, current: i }));
        const a = await cloneAssignments(id);
        if (!a.ok) return fail(a.message);
        i++;
      }
      if (steps.includes("materials")) {
        setProgress((p) => ({ ...p, current: i }));
        let done = 0;
        for (let guard = 0; guard < 200; guard++) {
          const m = await cloneMaterialsBatch(id);
          if (!m.ok) {
            const total = Math.max(source.files, done);
            return fail(m.message, `فشل نسخ ${toArabicDigits(total - done)} ${total - done > 10 ? "ملفًا" : "ملفات"} من ${toArabicDigits(total)} — لم تُنشأ النسخة ولم يتأثر الأصل.`);
          }
          done += m.copied;
          setProgress((p) => ({ ...p, filesDone: done, filesTotal: done + m.remaining }));
          if (m.remaining === 0 || m.copied === 0) break;
        }
      }
      setProgress((p) => ({ ...p, current: steps.length }));
      setStage({ s: "done", id, title });
      router.replace(`/trainer/programs/${source.id}/new-version?created=${id}`, { scroll: false });
      router.refresh();
    });
  }

  if (stage.s === "creating") {
    const { steps, current, filesDone, filesTotal } = progress;
    const baseTitle = parts.objectives || parts.units ? "نسخ الأهداف والمحاور" : "إنشاء المسودة";
    const titles: Record<StepKey, string> = { base: baseTitle, assignments: "نسخ الواجبات", materials: "نسخ المواد المرفوعة" };
    const fraction = steps[current] === "materials" && filesTotal > 0 ? filesDone / filesTotal : 0;
    const rows: FlowStep[] = steps.map((k, i) => ({
      title: titles[k],
      state: i < current ? "done" : i === current ? "current" : "todo",
      detail: k === "materials" && i === current && filesTotal > 0 ? `جارٍ · ${toArabicDigits(filesDone)} من ${toArabicDigits(filesTotal)}` : undefined,
    }));
    return (
      <FlowPanel tone="info" icon={LoaderCircle} spinning title="جارٍ إنشاء النسخة…" subtitle={`ننسخ ${source.counts.units.replace(" · ", " و")}${parts.materials && source.has.materials ? ` و${source.counts.materials.split(" · ")[0]}` : ""}.`}>
        <FlowSteps label={`${toArabicDigits(Math.min(current + 1, steps.length))} من ${toArabicDigits(steps.length)} ${steps.length > 2 ? "خطوات" : "خطوة"}`} percent={((current + fraction) / steps.length) * 100} steps={rows} />
      </FlowPanel>
    );
  }

  if (stage.s === "done") {
    return (
      <FlowPanel tone="success" icon={CircleCheck} title="أُنشئت النسخة الجديدة" subtitle="نسخة مستقلة بحالة مسودة — عدّلها ثم أرسلها للاعتماد.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-12 bg-state-success-bg px-4 py-3.5">
            <span className="type-caption text-state-success">النسخة</span>
            <span className="type-small text-text-primary">{stage.title}</span>
            <span className="type-caption text-text-muted">مسودة · لا دورات · v1.0</span>
          </div>
          <div className="flex flex-col gap-1 rounded-12 bg-state-info-bg px-4 py-3.5">
            <span className="type-caption text-state-info">الأصلي</span>
            <span className="type-small text-text-primary">{source.title}</span>
            <span className="type-caption text-text-muted">{source.versionLine}</span>
            <span dir="ltr" className="text-end font-mono text-[13px] text-state-info">
              {source.reference}
            </span>
          </div>
        </div>
        <FlowRow icon={ShieldCheck} tone="success" title="البرنامج الأصلي لم يتغيّر" body="دوراته ومتدربوه وتقييماته تعمل عليه كما هي." />
        <ButtonLink href={`/trainer/programs/${stage.id}/edit/basics`} size="l" fullWidth>
          افتح النسخة الجديدة
        </ButtonLink>
        <ButtonLink href="/trainer/programs" variant="outline" size="l" fullWidth>
          عُد لبرامجي
        </ButtonLink>
      </FlowPanel>
    );
  }

  if (stage.s === "failed") {
    return (
      <FlowPanel tone="error" icon={OctagonX} title="تعذّر إنشاء النسخة" subtitle={stage.subtitle ?? "لم تُنشأ النسخة ولم يتأثر الأصل."}>
        <FlowRow icon={ShieldCheck} tone="success" title="برنامجك الأصلي بخير" body="لم يُمس ولم تتغيّر أي دورة." />
        <FlowRow icon={TriangleAlert} tone="warning" title="سبب الفشل" body={stage.message || "انقطاع مؤقت — أعد المحاولة."} />
        <Button size="l" fullWidth onClick={() => create()}>
          أعد المحاولة
        </Button>
        {parts.materials && source.has.materials && (
          <Button
            variant="outline"
            size="l"
            fullWidth
            onClick={() => {
              setParts({ ...parts, materials: false });
              create({ materials: false });
            }}
          >
            أنشئ نسخة بلا المواد
          </Button>
        )}
        <Link href={`/trainer/programs/${source.id}`} className="self-center rounded-8 py-2 type-subtitle text-text-brand hover:underline focus-ring">
          إلغاء
        </Link>
      </FlowPanel>
    );
  }

  return (
    <FlowPanel tone="brand" icon={Copy} title="أنشئ نسخة جديدة من البرنامج" subtitle="نسخة مستقلة تعدّلها بحرّية — البرنامج الأصلي ودوراته لا تتأثر إطلاقًا.">
      <div className="flex items-center gap-3 rounded-12 bg-bg-brand-tint px-3.5 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
          <Glyph icon={BookOpen} size={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="type-small text-text-primary">{source.title}</span>
          <span className="type-caption text-text-muted">{source.versionLine}</span>
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="clone-title" className="type-small text-text-secondary">
          اسم النسخة الجديدة
        </label>
        <input
          id="clone-title"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={!!titleError || undefined}
          aria-describedby={titleError ? "clone-title-error" : undefined}
          className={`h-12 w-full rounded-12 border-[1.5px] bg-bg-surface px-4 type-body text-text-primary outline-none focus:border-2 focus:border-action-primary ${titleError ? "border-2 border-state-error" : "border-border-default"}`}
        />
        {titleError && (
          <p id="clone-title-error" role="alert" className="type-caption text-state-error">
            {titleError}
          </p>
        )}
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 type-subtitle text-text-primary">ما الذي يُنسخ؟</legend>
        {PARTS.map((p) => (
          <label key={p.key} className={`flex cursor-pointer items-center gap-3 rounded-12 bg-bg-page px-3.5 py-3 ${!source.has[p.key] ? "opacity-70" : ""}`}>
            <span className="relative flex size-[22px] shrink-0 items-center justify-center">
              <input
                type="checkbox"
                checked={parts[p.key]}
                onChange={(e) => setParts({ ...parts, [p.key]: e.target.checked })}
                className="peer absolute inset-0 cursor-pointer appearance-none rounded-8 border-[1.5px] border-border-default bg-bg-surface checked:border-0 checked:bg-action-primary focus-ring"
              />
              <Check aria-hidden size={16} strokeWidth={1.75} absoluteStrokeWidth className="pointer-events-none relative text-text-on-brand opacity-0 peer-checked:opacity-100" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="type-small text-text-primary">{p.label}</span>
              <span className="type-caption text-text-muted">{source.counts[p.key]}</span>
            </span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-secondary">
              <Glyph icon={p.icon} size={20} />
            </span>
          </label>
        ))}
        <div className="flex items-center gap-3 rounded-12 bg-bg-disabled px-3.5 py-3">
          <Glyph icon={X} size={16} className="text-text-muted" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="type-small text-text-muted">التقييمات والإحصاءات</span>
            <span className="type-caption text-text-muted">لا تُنسخ — النسخة تبدأ من الصفر</span>
          </span>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-muted">
            <Glyph icon={Star} size={20} />
          </span>
        </div>
      </fieldset>
      <FlowRow icon={ShieldCheck} tone="success" title="البرنامج الأصلي ودوراته المنشورة لا تتأثر" body="النسخة مستقلة تمامًا وتبدأ مسودة." />
      <Button size="l" fullWidth onClick={() => create()}>
        أنشئ النسخة
      </Button>
      <Link href={`/trainer/programs/${source.id}`} className="self-center rounded-8 py-2 type-subtitle text-text-brand hover:underline focus-ring">
        إلغاء
      </Link>
    </FlowPanel>
  );
}
