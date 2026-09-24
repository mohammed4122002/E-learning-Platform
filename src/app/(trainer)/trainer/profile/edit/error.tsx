"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function ProfileEditError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل إدارة الملف المهني" backHref="/trainer" />;
}
