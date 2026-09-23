"use client";

import { useEffect } from "react";
import { CircleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

/** Shared body of `error.tsx` files: Arabic message + retry (Next 16 `retry()` re-fetches the segment). */
export function RouteError({
  error,
  retry,
  title = "تعذّر تحميل الصفحة",
  backHref = "/trainee",
  backLabel = "العودة إلى الرئيسية",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
  backHref?: string;
  backLabel?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="flex flex-1 items-start px-4 pt-8 pb-14 sm:px-6 lg:px-12">
      <EmptyState
        tone="error"
        icon={CircleAlert}
        title={title}
        description="حدث خطأ غير متوقع أثناء جلب البيانات. أعد المحاولة، وإن تكرر تواصل مع الدعم."
        action={
          <>
            <Button onClick={() => retry()}>أعد المحاولة</Button>
            <ButtonLink href={backHref} variant="outline">
              {backLabel}
            </ButtonLink>
          </>
        }
      />
    </div>
  );
}
