"use client";

import { RouteError } from "@/components/trainings/RouteStates";

export default function WaitlistError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError title="قائمة انتظاري" error={error} retry={retry} />;
}
