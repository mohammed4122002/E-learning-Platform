import { PageSkeleton } from "@/components/profile/PageSkeleton";

export default function Loading() {
  return <PageSkeleton title="الملف الشخصي" subtitle="ملفك المهني وما يظهر منه للآخرين" hero={true} side={true} />;
}
