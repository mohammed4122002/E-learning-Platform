import { PageSkeleton } from "@/components/profile/PageSkeleton";

export default function Loading() {
  return <PageSkeleton title="المحادثات" subtitle="مراسلاتك مع الجهات والمدربين والدعم" hero={false} side={false} />;
}
