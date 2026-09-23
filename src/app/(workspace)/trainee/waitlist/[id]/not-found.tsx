import { NotFoundView } from "@/components/trainings/NotFoundView";

export default function NotFound() {
  return (
    <NotFoundView
      title="دعوة شغور مقعد"
      heading="لم نعثر على هذه الدعوة"
      description="ربما انتهت أو لا تخص حسابك. ستجد كل دوراتك المنتظرة في قائمة انتظارك."
      href="/trainee/waitlist"
      cta="قائمة انتظاري"
    />
  );
}
