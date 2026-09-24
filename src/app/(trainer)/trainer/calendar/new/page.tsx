import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/ui/Navigation";
import { PageHeading } from "@/components/trainings/ui";
import { EventForm, type EventDraft } from "@/components/trainer/EventForm";
import { requireTrainer } from "@/lib/auth";
import { getTrainerEvent } from "@/lib/data/trainer-calendar";
import { hhmm, isYmd, ymdOf } from "@/lib/trainer-calendar";

export const metadata: Metadata = { title: "إضافة موعد", description: "ارتباط شخصي أو إجازة" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HM = /^\d{2}:\d{2}$/;

/** TRR-CAL-02 · إضافة موعد (303:9062). `?event=` edits an existing appointment; `?date=&from=&to=` prefill from «اقتراح تلقائي». */
export default async function NewCalendarEventPage(props: PageProps<"/trainer/calendar/new">) {
  const user = await requireTrainer("/trainer/calendar/new");
  const sp = await props.searchParams;
  const eventId = typeof sp.event === "string" ? sp.event : null;

  let initial: EventDraft;
  if (eventId) {
    if (!UUID.test(eventId)) notFound();
    const ev = await getTrainerEvent(user.id, eventId);
    if (!ev) notFound();
    const lastInstant = new Date(new Date(ev.ends_at).getTime() - (ev.all_day ? 1 : 0));
    initial = {
      id: ev.id,
      kind: ev.kind,
      title: ev.title,
      allDay: ev.all_day,
      fromDate: ymdOf(ev.starts_at),
      toDate: ymdOf(lastInstant),
      fromTime: ev.all_day ? "16:00" : hhmm(ev.starts_at),
      toTime: ev.all_day ? "19:00" : hhmm(ev.ends_at),
      recurrence: ev.recurrence,
    };
  } else {
    const date = isYmd(sp.date) ? sp.date : ymdOf(new Date());
    const from = typeof sp.from === "string" && HM.test(sp.from) ? sp.from : "16:00";
    const to = typeof sp.to === "string" && HM.test(sp.to) ? sp.to : "19:00";
    initial = { kind: "personal", title: "", allDay: false, fromDate: date, toDate: date, fromTime: from, toTime: to, recurrence: "none" };
  }

  const editing = !!eventId;
  return (
    <>
      <TopBar title={editing ? "تعديل موعد" : "إضافة موعد"} subtitle="ارتباط شخصي أو إجازة" />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "الجدول", href: "/trainer/calendar" }, { label: editing ? "تعديل موعد" : "موعد جديد" }]} />
        <PageHeading
          title={editing ? "عدّل موعدك" : "أضف موعدًا إلى تقويمك"}
          description="المواعيد التي تضيفها هنا تحجب الوقت أمام الجهات — لكن تفاصيلها تبقى خاصة تمامًا."
        />
        <EventForm initial={initial} />
      </PageBody>
    </>
  );
}
