import { PageSkeleton } from "@/components/profile/PageSkeleton";

export default function Loading() {
  return <PageSkeleton title="مركز الإشعارات" subtitle="كل إشعاراتك مع البحث والفلترة" hero={false} side={true} />;
}
