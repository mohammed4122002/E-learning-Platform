"use client";

import { RouteError } from "@/components/learning/RouteError";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل الواجبات" backHref="/trainee" backLabel="العودة إلى الرئيسية" />;
}
