"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";

/** Shared body of the learning routes' error.tsx boundaries (Arabic message + retry). */
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
    <main id="main" tabIndex={-1} className="flex flex-col gap-6 px-4 pt-8 pb-14 outline-none sm:px-6 lg:px-12">
      <EmptyState
        tone="error"
        icon={TriangleAlert}
        title={title}
        description="حدث خطأ أثناء جلب البيانات. تحقّق من اتصالك ثم أعد المحاولة، وإن تكرر تواصل مع الدعم."
        action={
          <>
            <Button onClick={() => retry()} icon={<Glyph icon={RotateCcw} size={20} />}>
              أعد المحاولة
            </Button>
            <ButtonLink href={backHref} variant="outline">
              {backLabel}
            </ButtonLink>
          </>
        }
      />
    </main>
  );
}
