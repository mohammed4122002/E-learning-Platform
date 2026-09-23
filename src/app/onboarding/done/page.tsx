import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Layers, Tag, Target } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { requireTrainee } from "@/lib/auth";
import { getLearningFields, getOnboarding } from "@/lib/data/onboarding";
import { createClient } from "@/lib/supabase/server";
import { GOALS, HOURS, LEVELS, MODES, modeValueFrom } from "@/lib/onboarding";
import { formatHours, toArabicDigits } from "@/lib/format";

function SummaryCard({ icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-16 border border-border-default bg-bg-surface px-5 pt-5 pb-[22px]">
      <span className="flex size-11 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
        <Glyph icon={icon} size={20} />
      </span>
      <p className="type-caption text-text-muted">{label}</p>
      <p className="type-subtitle text-text-primary">{value}</p>
    </div>
  );
}

/** TRN-ONB-02 · تم تخصيص تجربتك (224:13772). */
export default async function OnboardingDonePage() {
  const user = await requireTrainee("/onboarding/done");
  const state = await getOnboarding(user.id);
  if (!state.completedAt) redirect(`/onboarding/${Math.min(Math.max(state.step, 1), 6)}`);

  const fields = await getLearningFields();
  const fieldNames = fields.filter((f) => state.fieldSlugs.includes(f.slug)).map((f) => f.name);
  const goal = GOALS.find((g) => g.value === state.goal)?.title;
  const level = LEVELS.find((l) => l.value === state.experienceLevel)?.title;
  const mode = MODES.find((m) => m.value === modeValueFrom(state.modes))?.title;
  const hours = HOURS.find((h) => h.value === state.weeklyHours)?.title;

  // Starter plan: real open courses in the chosen fields, easiest first.
  const supabase = await createClient();
  const { data: cats } = await supabase.from("categories").select("id").in("field_slug", state.fieldSlugs.length ? state.fieldSlugs : ["__none__"]);
  const { data: programs } = await supabase.from("programs").select("id").in("category_id", (cats ?? []).map((c) => c.id).concat("00000000-0000-0000-0000-000000000000"));
  const { data: courses } = await supabase
    .from("courses")
    .select("slug, title, duration_hours, level")
    .eq("status", "open")
    .in("program_id", (programs ?? []).map((p) => p.id).concat("00000000-0000-0000-0000-000000000000"))
    .order("level")
    .limit(2);
  const plan = [
    ...(courses ?? []).map((c, i) => ({
      title: i === 0 ? "ابدأ ببرنامج أساسي" : "أضف مهارة جديدة",
      detail: `${c.title}${c.duration_hours ? ` · ${formatHours(Number(c.duration_hours))}` : ""}`,
      href: `/courses/${c.slug}`,
    })),
    { title: "اختم بشهادة موثّقة", detail: "تصدر بعد إتمام الدورة برابط تحقق عام", href: "/trainee/certificates" },
  ];

  return (
    <main id="main" className="flex flex-1 flex-col items-center gap-[34px] px-4 pt-14 pb-14 sm:px-8 lg:px-[120px]">
      <div className="flex max-w-[1200px] flex-col items-center gap-4 text-center">
        <span className="flex size-[88px] items-center justify-center rounded-full bg-state-success-bg text-state-success">
          <Glyph icon={Target} size={32} />
        </span>
        <h1 className="text-[32px] leading-[1.15] font-bold text-text-primary md:type-display">تم تخصيص تجربتك 🎯</h1>
        <p className="type-body-lg text-text-secondary">بنينا لك نقطة بداية بناءً على إجاباتك. كل شيء قابل للتغيير لاحقًا من «المتابعات» و«الإعدادات».</p>
      </div>
      <div className="grid w-full max-w-[1030px] gap-5 md:grid-cols-3">
        <SummaryCard icon={Tag} label="مجالاتك" value={fieldNames.join(" · ") || "—"} />
        <SummaryCard icon={Target} label="هدفك" value={[goal, level && `مستوى: ${level}`].filter(Boolean).join(" · ") || "—"} />
        <SummaryCard icon={Layers} label="تفضيلك" value={[mode, hours && `${hours} أسبوعيًا`].filter(Boolean).join(" · ") || "—"} />
      </div>
      <section aria-labelledby="plan-title" className="flex w-full max-w-[1030px] flex-col gap-4 rounded-22 bg-bg-brand-tint px-5 pt-6 pb-[26px] sm:px-7">
        <h2 id="plan-title" className="type-h3 text-text-primary">
          خطة البداية المقترحة
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {plan.map((p, i) => (
            <li key={p.title}>
              <Link href={p.href} className="flex items-center gap-3 rounded-12 bg-bg-surface px-4 py-3.5 hover:ring-1 hover:ring-action-primary focus-ring">
                <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-action-primary type-caption text-text-on-brand">
                  {toArabicDigits(i + 1)}
                </span>
                <span className="flex min-w-0 flex-col gap-[3px]">
                  <span className="type-subtitle text-text-primary">{p.title}</span>
                  <span className="truncate type-caption text-text-muted">{p.detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <div className="flex w-full flex-col-reverse items-center justify-center gap-3.5 sm:flex-row">
        <ButtonLink href="/onboarding/1" variant="ghost" size="l" className="w-full sm:w-[200px]">
          عدّل إجاباتي
        </ButtonLink>
        <ButtonLink href="/trainee/discover?sort=recommended" size="l" className="w-full sm:w-[320px]">
          ابدأ استكشاف الدورات
        </ButtonLink>
      </div>
    </main>
  );
}
