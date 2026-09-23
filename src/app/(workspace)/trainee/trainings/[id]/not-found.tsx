import { NotFoundView } from "@/components/trainings/NotFoundView";

export default function NotFound() {
  return (
    <NotFoundView
      title="تفاصيل تسجيلي"
      heading="لم نعثر على هذا التسجيل"
      description="ربما حُذف أو لا يخص حسابك. ستجد كل تسجيلاتك في ملف التدريب."
      href="/trainee/trainings"
      cta="ملف التدريب"
    />
  );
}
