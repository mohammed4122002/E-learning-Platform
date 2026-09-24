"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { requestCourseRatings } from "@/lib/actions/trainer-ops";
import { toArabicDigits } from "@/lib/format";

/** «اطلب تقييمًا من ٦ متبقين» (438:20952): one reminder to the trainees who have not rated yet (once every 3 days). */
export function RequestRatingsButton({ courseId, remaining, disabled }: { courseId: string; remaining: number; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const label = remaining === 1 ? "اطلب تقييمًا من المتبقي" : `اطلب تقييمًا من ${toArabicDigits(remaining)} متبقين`;
  return (
    <Button
      variant="outline"
      size="l"
      fullWidth
      loading={pending}
      disabled={disabled || remaining === 0 || pending}
      onClick={() =>
        start(async () => {
          const res = await requestCourseRatings(courseId);
          if (!res.ok) {
            toast("error", res.message);
            return;
          }
          toast("success", `أُرسل طلب التقييم إلى ${toArabicDigits(res.data ?? 0)} متدربين.`);
          router.refresh();
        })
      }
    >
      {label}
    </Button>
  );
}
