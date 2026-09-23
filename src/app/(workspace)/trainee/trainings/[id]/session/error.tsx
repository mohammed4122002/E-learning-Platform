"use client";

import { RouteError } from "@/components/trainings/RouteStates";

export default function SessionError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError title="الجلسة المباشرة" error={error} retry={retry} />;
}
