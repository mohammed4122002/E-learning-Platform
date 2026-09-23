import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/ui/Navigation";
import type { EnrollmentDetail } from "@/lib/data/trainings";
import {
  ActionsCard,
  AttendanceCard,
  CertificateProgressCard,
  DetailHero,
  MaterialsCard,
  ModulesCard,
  RegistrationInfoCard,
  ScheduleCard,
} from "./EnrollmentSections";

/** In-person / live layout of TRN-MYE-02 (166:6102): optional top block, hero, main (schedule, files) + 380px aside. */
export function ScheduledLayout({ d, top, afterHero, cancelled = false }: { d: EnrollmentDetail; top?: ReactNode; afterHero?: ReactNode; cancelled?: boolean }) {
  return (
    <>
      {top}
      <DetailHero d={d} cancelled={cancelled} />
      {afterHero}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <ScheduleCard d={d} />
          <MaterialsCard d={d} />
        </div>
        <aside aria-label="تفاصيل التسجيل" className="flex flex-col gap-5">
          <RegistrationInfoCard d={d} />
          <AttendanceCard d={d} />
          <ActionsCard d={d} />
        </aside>
      </div>
    </>
  );
}

/** Recorded layout of TRN-MYE-02 (188:9698): breadcrumb, hero, modules + certificate, 360px aside. */
export function RecordedLayout({ d, top }: { d: EnrollmentDetail; top?: ReactNode }) {
  return (
    <>
      <Breadcrumb items={[{ label: "ملف التدريب", href: "/trainee/trainings" }, { label: d.course.title }]} />
      {top}
      <DetailHero d={d} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <ModulesCard d={d} />
          <CertificateProgressCard d={d} />
        </div>
        <aside aria-label="تفاصيل الدورة" className="flex flex-col gap-5">
          <RegistrationInfoCard d={d} />
          <MaterialsCard d={d} compact />
          <ActionsCard d={d} />
        </aside>
      </div>
    </>
  );
}
