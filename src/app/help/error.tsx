"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function PublicHelpError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل مركز المساعدة" backHref="/help" backLabel="عد إلى مركز المساعدة" />;
}
