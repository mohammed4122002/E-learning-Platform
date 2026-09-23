import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";

/**
 * TRN-DSH-01 · مساعدك الذكي للتعلم. Each suggestion opens the matching, data-driven view (plan,
 * level-filtered discovery, recommendations, next lesson). A generative chat needs an LLM provider
 * and is tracked in OPEN_QUESTIONS.md.
 */
export function AiAssistantCard({ continueHref, level }: { continueHref: string; level: string | null }) {
  const prompts = [
    { label: "ما الذي ينقصني لإتمام المسار؟", href: "/trainee/trainings" },
    { label: "دورات تناسب مستواي", href: level ? `/trainee/discover?level=${level}` : "/trainee/discover" },
    { label: "اقترح لي خطة لثلاثة أشهر", href: "/trainee/discover?sort=recommended" },
    { label: "ماذا أتعلّم اليوم؟", href: continueHref },
  ];
  return (
    <section
      id="assistant"
      aria-labelledby="ai-assistant-title"
      className="flex scroll-mt-24 flex-col items-start gap-[22px] overflow-hidden rounded-16 bg-bg-brand-tint px-6 pt-[22px] pb-6 inner-stroke istroke-w-[1.5px] istroke-c-action-primary md:flex-row"
    >
      <div className="flex size-14 shrink-0 items-center justify-center rounded-12 bg-action-primary text-text-on-brand">
        <Glyph icon={Lightbulb} size={20} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-3 self-stretch md:self-auto">
        <h2 id="ai-assistant-title" className="w-full type-h3 text-text-primary">
          مساعدك الذكي للتعلم
        </h2>
        <p className="w-full type-body text-text-secondary">
          اقتراحات مبنية على تخصصاتك المتابَعة ودوراتك السابقة. كل اقتراح مسودة — القرار النهائي لك دائمًا.
        </p>
        <ul className="flex w-full flex-wrap content-center items-center gap-2.5">
          {prompts.map((p) => (
            <li key={p.label}>
              <Link href={p.href} className="flex h-9 items-center whitespace-nowrap rounded-full bg-bg-surface px-3.5 type-small text-text-primary inner-stroke hover:text-text-brand focus-ring">
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <ButtonLink href="/trainee/discover?sort=recommended" variant="secondary">
        اسأل المساعد
      </ButtonLink>
    </section>
  );
}
