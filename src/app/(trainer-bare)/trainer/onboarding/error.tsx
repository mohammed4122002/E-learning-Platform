"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function OnboardingError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل خطوة التجهيز" backHref="/trainer" backLabel="اذهب للوحة التحكم" />;
}
