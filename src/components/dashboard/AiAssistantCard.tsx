import { aiAssistant } from "@/lib/dashboard-data";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function AiAssistantCard() {
  return (
    <section
      aria-labelledby="ai-assistant-title"
      className="flex flex-col items-start gap-[22px] overflow-hidden rounded-16 bg-bg-brand-tint px-6 pt-[22px] pb-6 inner-stroke istroke-w-[1.5px] istroke-c-action-primary md:flex-row"
    >
      <div className="flex size-14 shrink-0 items-center justify-center rounded-12 bg-action-primary">
        <Icon src="/assets/icons/lightbulb-white.svg" size={20} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-3 self-stretch md:self-auto">
        <h2 id="ai-assistant-title" className="w-full type-h3 text-text-primary">
          {aiAssistant.title}
        </h2>
        <p className="w-full type-body text-text-secondary">{aiAssistant.description}</p>
        <ul className="flex w-full flex-wrap content-center items-center gap-2.5">
          {aiAssistant.prompts.map((prompt) => (
            <li key={prompt}>
              <button
                type="button"
                className="flex h-9 cursor-pointer items-center whitespace-nowrap rounded-full bg-bg-surface px-3.5 type-small text-text-primary inner-stroke"
              >
                {prompt}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <Button variant="secondary">{aiAssistant.cta}</Button>
    </section>
  );
}
