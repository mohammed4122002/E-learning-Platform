import { NotFoundState } from "@/components/profile/NotFoundState";

export default function NotFound() {
  return <NotFoundState title="الخبرة غير موجودة" description="ربما حُذفت بالفعل أو لا تخصّ حسابك." href="/trainee/profile/experience" label="قائمة الخبرات" />;
}
