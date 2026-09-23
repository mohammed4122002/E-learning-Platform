"use client";

import { RouteError } from "@/components/discover/RouteError";

export default function CompareError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="مقارنة البرامج" subtitle="قارن حتى ثلاثة برامج جنبًا إلى جنب" />;
}
