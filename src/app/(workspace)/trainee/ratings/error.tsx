"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function RatingsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل التقييمات" backHref="/trainee/ratings" backLabel="عد إلى تقييماتي" />;
}
