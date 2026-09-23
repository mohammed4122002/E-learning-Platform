"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { deleteExperience } from "@/app/(workspace)/trainee/profile/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-12 border-[1.5px] border-state-error bg-state-error-bg px-6 type-button text-state-error hover:opacity-90 focus-ring disabled:cursor-progress disabled:opacity-85"
    >
      {pending && <LoaderCircle aria-hidden className="size-5 animate-[tg-spin_0.9s_linear_infinite]" />}
      أكّد الحذف
    </button>
  );
}

/** TRN-PRF-04 · تأكيد الحذف (4152:1810) — the panel itself is the confirmation step (BR-U2). */
export function DeleteExperienceButton({ id }: { id: string }) {
  return (
    <form action={deleteExperience}>
      <input type="hidden" name="id" value={id} />
      <Submit />
    </form>
  );
}
