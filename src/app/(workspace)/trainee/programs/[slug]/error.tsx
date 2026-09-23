"use client";

import { RouteError } from "@/components/discover/RouteError";

export default function ProgramError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تفاصيل البرنامج" subtitle="تعذّر التحميل" />;
}
