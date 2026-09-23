import { PageSkeleton } from "@/components/profile/PageSkeleton";

export default function Loading() {
  return <PageSkeleton title="تحرير الملف" subtitle="ما تعدّله هنا يظهر في ملفك العام" hero={false} side={true} />;
}
