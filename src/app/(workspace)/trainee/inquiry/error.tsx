"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function InquiryError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل صفحة الاستفسار" />;
}
