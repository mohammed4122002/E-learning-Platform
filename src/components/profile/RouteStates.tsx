"use client";

import { useEffect } from "react";
import { CircleX } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

/** Shared body of the `error.tsx` boundaries in this area: Arabic message + retry. */
export function RouteError({
  error,
  retry,
  title = "تعذّر تحميل الصفحة",
  backHref,
  backLabel,
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
    <main id="main" className="flex flex-1 items-start justify-center px-4 pt-16 pb-14 sm:px-6 lg:px-12">
      <EmptyState
        tone="error"
        icon={CircleX}
        title={title}
        description="حدث خطأ غير متوقع أثناء جلب البيانات. أعد المحاولة، وإن تكرر تواصل مع الدعم."
        action={
          <>
            <Button onClick={() => retry()}>أعد المحاولة</Button>
            {backHref && (
              <ButtonLink href={backHref} variant="outline">
                {backLabel ?? "رجوع"}
              </ButtonLink>
            )}
          </>
        }
        className="max-w-xl"
      />
    </main>
  );
}
