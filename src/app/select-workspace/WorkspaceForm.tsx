"use client";

import { useActionState, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Briefcase, Building2, CircleUserRound, Compass, Info, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { initialFormState } from "@/lib/validation/auth";
import { chooseWorkspace } from "./actions";

type Option = { kind: string; title: string; cta: string; description: string; icon: LucideIcon; org: boolean; wide?: boolean };

/* Copy and order from PUB-CTX-01 (RTL grid: first item on the right). */
const OPTIONS: Option[] = [
  { kind: "trainee", title: "متدرب", cta: "متابعة كمتدرب", icon: CircleUserRound, org: false, description: "أبحث عن برامج تدريبية، أسجّل فيها، وأحصل على شهادات موثّقة." },
  { kind: "trainer", title: "مدرب مستقل", cta: "متابعة كمدرب مستقل", icon: User, org: false, description: "أقدّم برامجي التدريبية بصفتي الشخصية وأدير دوراتي ومستحقاتي." },
  { kind: "provider", title: "جهة تدريبية", cta: "متابعة كجهة تدريبية", icon: Building2, org: true, description: "منشأة تدريب لها فروع وفريق وبرامج معتمدة." },
  { kind: "studio", title: "الاستيديو", cta: "متابعة كاستيديو", icon: Compass, org: true, description: "منشأة استديو تصوير عبر طلبات من المدرب و الجهة الطالبة." },
  { kind: "requester", title: "جهة طالبة", cta: "متابعة كجهة طالبة", icon: Briefcase, org: true, wide: true, description: "منشأة تُدرّب موظفيها عبر طلبات تدريب وعقود مؤسسية." },
];

export function WorkspaceForm({ available }: { available: readonly string[] }) {
  const [state, action, pending] = useActionState(chooseWorkspace, initialFormState);
  const [kind, setKind] = useState("trainee");
  const selected = OPTIONS.find((o) => o.kind === kind)!;
  const isAvailable = available.includes(kind);

  return (
    <form action={action} className="flex flex-col items-center gap-8">
      <fieldset className="grid w-full gap-6 md:grid-cols-2">
        <legend className="sr-only">نوع المساحة</legend>
        {OPTIONS.map((o) => {
          const active = o.kind === kind;
          return (
            <label
              key={o.kind}
              className={`flex cursor-pointer flex-col gap-3.5 rounded-16 p-6 transition-shadow has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-border-focus ${
                o.wide ? "md:col-span-2" : ""
              } ${active ? "border-2 border-action-primary bg-bg-brand-tint shadow-float" : "border border-border-default bg-bg-surface shadow-card hover:border-action-primary/40"}`}
            >
              <span className="flex items-center gap-3.5">
                <span className="flex min-h-11 flex-1 items-center gap-2.5">
                  <input
                    type="radio"
                    name="kind"
                    value={o.kind}
                    checked={active}
                    onChange={() => setKind(o.kind)}
                    className="size-[22px] shrink-0 cursor-pointer appearance-none rounded-full border-[1.5px] border-border-default bg-bg-surface checked:border-[7px] checked:border-action-primary"
                  />
                  <span className="type-body text-text-primary">{o.title}</span>
                </span>
                <span className={`flex size-14 items-center justify-center rounded-12 ${active ? "bg-action-primary text-text-on-brand" : "bg-bg-brand-tint text-text-brand"}`}>
                  <Glyph icon={o.icon} size={32} />
                </span>
              </span>
              <span className="type-body text-text-secondary">{o.description}</span>
              {o.org && (
                <span className="flex items-center gap-2 rounded-8 bg-state-info-bg px-3 py-2 type-caption text-state-info">
                  <Glyph icon={Info} size={16} />
                  سيُطلب منك بيانات المنشأة ومستنداتها في الخطوة التالية.
                </span>
              )}
            </label>
          );
        })}
      </fieldset>
      {(state.message || !isAvailable) && (
        <div className="w-full max-w-[504px]">
          <Alert tone={isAvailable ? "error" : "info"} title={isAvailable ? "تعذّر إتمام العملية" : `مساحة «${selected.title}» لم تُفتح بعد`}>
            {isAvailable ? state.message : "نعمل على إطلاقها قريبًا. يمكنك البدء كمتدرب الآن وإضافة هذه المساحة من «إدارة سياقاتي» عند توفرها."}
          </Alert>
        </div>
      )}
      <div className="flex w-full max-w-[504px] flex-col items-center gap-3.5">
        <Button type="submit" size="l" fullWidth loading={pending} disabled={!isAvailable}>
          {selected.cta}
        </Button>
        <p className="type-caption text-text-muted">يمكنك تغيير هذا لاحقًا أو إضافة مساحة أخرى في أي وقت.</p>
      </div>
    </form>
  );
}
