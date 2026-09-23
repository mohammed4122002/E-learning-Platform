"use client";

import { RouteError } from "@/components/discover/RouteError";

export default function DiscoverError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="الاكتشاف والبحث" subtitle="ابحث عن البرنامج المناسب لمسارك" />;
}
