"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function PortfolioError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل معرض الأعمال" backHref="/trainer/profile/edit" backLabel="العودة إلى إدارة الملف" />;
}
