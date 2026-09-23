import { NotFoundState } from "@/components/profile/NotFoundState";

export default function NotFound() {
  return <NotFoundState title="الدورة غير موجودة" description="لم نعثر على الدورة التي تريد مراسلة فريقها." href="/trainee/discover" label="اكتشف دورة" />;
}
