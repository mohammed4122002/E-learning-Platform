"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { joinWaitlist } from "@/app/courses/[slug]/actions";
import { initialFormState } from "@/lib/validation/auth";

/** Full course → join the waitlist (TRN-WTL-01). Explains the outcome before the click (BR-U2). */
export function WaitlistButton({ courseId, slug }: { courseId: string; slug: string }) {
  const [state, action, pending] = useActionState(joinWaitlist, initialFormState);
  return (
    <form action={action} className="flex w-full flex-col gap-2">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="slug" value={slug} />
      <Button type="submit" size="l" fullWidth loading={pending}>
        انضم إلى قائمة الانتظار
      </Button>
      <p className={`type-caption ${state.status === "error" ? "text-state-error" : "text-text-muted"}`} role={state.status === "error" ? "alert" : undefined}>
        {state.message ?? "اكتملت المقاعد. عند شغور مقعد نرسل لك دعوة صالحة ٢٤ ساعة لإكمال التسجيل."}
      </p>
    </form>
  );
}
