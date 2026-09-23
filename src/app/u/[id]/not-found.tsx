import { UserX } from "lucide-react";
import { PublicHeader } from "@/components/profile/PublicHeader";
import { NotFoundState } from "@/components/profile/NotFoundState";

export default function ProfileNotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-page">
      <PublicHeader />
      <NotFoundState icon={UserX} title="الملف غير متاح" description="صاحب هذا الملف جعله خاصًا أو أوقف مشاركته، أو أن الرابط غير صحيح." href="/verify" label="تحقّق من شهادة" />
    </div>
  );
}
