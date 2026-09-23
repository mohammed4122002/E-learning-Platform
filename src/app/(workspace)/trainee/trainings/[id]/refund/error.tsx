"use client";

import { RouteError } from "@/components/trainings/RouteStates";

export default function RefundRequestError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError title="طلب استرداد" error={error} retry={retry} />;
}
