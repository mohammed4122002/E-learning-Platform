"use client";

import { RouteError } from "@/components/profile/RouteStates";

export default function RouteErrorBoundary({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="تعذّر تحميل المحادثة" backHref="/messages" backLabel="كل المحادثات" />;
}
