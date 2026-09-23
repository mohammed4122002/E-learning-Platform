"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";

/** loading.tsx body for the trainings / money screens (Figma "Feedback / Skeleton"). */
export function PageSkeleton({ title, subtitle, variant = "list" }: { title: string; subtitle?: string; variant?: "list" | "detail" | "grid" }) {
  return (
    <>
      <TopBar title={title} subtitle={subtitle} />
      <PageBody>
        <span role="status" className="sr-only">
          جارٍ التحميل…
        </span>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-2/3 max-w-md" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        {variant === "detail" ? (
          <>
            <Skeleton className="h-[220px] w-full rounded-22" />
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <Skeleton className="h-[420px] rounded-16" />
              <Skeleton className="h-[420px] rounded-16" />
            </div>
          </>
        ) : variant === "grid" ? (
          <>
            <Skeleton className="h-[200px] w-full rounded-22" />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[420px] rounded-16" />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[170px] w-full rounded-16" />
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}

/** error.tsx body: Arabic message + retry (Next 16 `retry` re-fetches the segment). */
export function RouteError({ title, error, retry, backHref = "/trainee/trainings", backLabel = "العودة إلى ملف التدريب" }: { title: string; error: Error & { digest?: string }; retry: () => void; backHref?: string; backLabel?: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <>
      <TopBar title={title} />
      <PageBody>
        <EmptyState
          tone="error"
          icon={TriangleAlert}
          title="تعذّر تحميل هذه الصفحة"
          description="حدث خطأ أثناء جلب بياناتك. تحقّق من اتصالك ثم أعد المحاولة، وإن تكرر الخطأ تواصل مع الدعم."
          action={
            <>
              <Button onClick={() => retry()} icon={<Glyph icon={RefreshCw} size={20} />}>
                أعد المحاولة
              </Button>
              <ButtonLink href={backHref} variant="outline">
                {backLabel}
              </ButtonLink>
            </>
          }
        />
      </PageBody>
    </>
  );
}
