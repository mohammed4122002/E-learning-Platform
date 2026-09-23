"use client";

import { PublicHeader } from "@/components/profile/PublicHeader";
import { RouteError } from "@/components/profile/RouteStates";

export default function PublicProfileError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-page">
      <PublicHeader />
      <RouteError error={error} retry={retry} title="تعذّر تحميل الملف" />
    </div>
  );
}
