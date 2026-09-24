"use client";

import { ProgramsRouteError } from "@/components/trainer-programs/RouteStates";

export default function ProgramError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ProgramsRouteError error={error} retry={retry} title="البرنامج" />;
}
