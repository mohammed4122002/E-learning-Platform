import { NotFoundView } from "@/components/trainings/NotFoundView";

export default function NotFound() {
  return (
    <NotFoundView
      title="متابعة طلب الاسترداد"
      heading="لم نعثر على طلب الاسترداد"
      description="ربما لا يخص حسابك أو أن الرابط غير صحيح. تجد طلباتك الجارية في «بانتظار إجرائي»."
      href="/trainee/queue"
      cta="بانتظار إجرائي"
    />
  );
}
