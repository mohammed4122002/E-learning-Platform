import { NotFoundView } from "@/components/trainings/NotFoundView";

export default function NotFound() {
  return (
    <NotFoundView
      title="النزاع المالي"
      heading="لم نعثر على هذا النزاع"
      description="ربما لا يخص حسابك أو أن الرابط غير صحيح. تجد نزاعاتك الجارية في «بانتظار إجرائي»."
      href="/trainee/queue"
      cta="بانتظار إجرائي"
    />
  );
}
