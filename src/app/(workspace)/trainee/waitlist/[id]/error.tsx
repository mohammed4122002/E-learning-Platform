"use client";

import { RouteError } from "@/components/trainings/RouteStates";

export default function WaitlistEntryError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError title="دعوة شغور مقعد" error={error} retry={retry} backHref="/trainee/waitlist" backLabel="العودة إلى قائمة انتظاري" />;
}
