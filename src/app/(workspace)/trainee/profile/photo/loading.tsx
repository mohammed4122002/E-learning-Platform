import { PageSkeleton } from "@/components/profile/PageSkeleton";

export default function Loading() {
  return <PageSkeleton title="تحرير الملف" subtitle="صورة الملف" hero={false} side={true} />;
}
