"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function ContractError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل العقد" backHref="/trainer" />;
}
