"use client";

import { RouteError } from "@/components/trainings/RouteStates";

export default function WithdrawError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError title="الانسحاب من دورة" error={error} retry={retry} />;
}
