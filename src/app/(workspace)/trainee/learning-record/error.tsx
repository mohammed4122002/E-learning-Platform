"use client";

import { RouteError } from "@/components/learning/RouteError";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل سجل التعلم" backHref="/trainee" backLabel="العودة إلى الرئيسية" />;
}
