import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Banknote, BellRing, CalendarDays, CircleCheck, Clock, MapPin, Presentation, Route, TriangleAlert, User, Users } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { HmsCountdown } from "@/components/trainings/HmsCountdown";
import { Glyph } from "@/components/ui/Icon";
import { ModeBadge } from "@/components/course/CourseCover";
import { ConfirmAction } from "@/components/trainings/ConfirmAction";
import { Chip, Notice, SectionCard } from "@/components/trainings/ui";
import { WaitlistEntryCard } from "@/components/trainings/WaitlistEntryCard";
import { WaitlistHowItWorks } from "@/components/trainings/WaitlistHowItWorks";
import { DismissibleAlert } from "@/components/trainings/DismissibleAlert";
import { requireTrainee } from "@/lib/auth";
import { getWaitlistEntries, getWaitlistEntry } from "@/lib/data/waitlist";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDayMonth, formatPrice, formatTime, toArabicDigits } from "@/lib/format";
import { acceptWaitlistInvite, leaveWaitlist, rejoinWaitlist } from "../actions";

export const metadata: Metadata = { title: "دعوة شغور مقعد", description: "لديك مهلة محددة لقبول المقعد" };

function WhatIf() {
  const items = [
    { icon: Users, title: "ينتقل المقعد للتالي", text: "يُعرض على صاحب الترتيب الثاني مباشرة." },
    { icon: Route, title: "تبقى في القائمة", text: "لن تخرج من قائمة الانتظار — يبقى دورك لشغور قادم." },
    { icon: Banknote, title: "لا خصم إطلاقًا", text: "لم يُحجز أي مبلغ ولن يُخصم شيء." },
  ];
  return (
    <SectionCard title="ماذا لو لم أقبل؟" id="what-if">
      <ul className="flex flex-col gap-4">
        {items.map((i) => (
          <li key={i.title} className="flex items-start gap-3 rounded-12 bg-bg-page px-3.5 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
              <Glyph icon={i.icon} size={20} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="type-subtitle text-text-primary">{i.title}</span>
              <span className="type-caption text-text-muted">{i.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

/** TRN-WTL-02 · دعوة شغور مقعد — active (171:7338) and lapsed (171:7545). */
export default async function WaitlistInvitePage(props: PageProps<"/trainee/waitlist/[id]">) {
  const { id } = await props.params;
  const user = await requireTrainee(`/trainee/waitlist/${id}`);
  const entry = await getWaitlistEntry(user.id, id);
  if (!entry) notFound();
  const c = entry.course;

  if (entry.status === "invited" && entry.expiresAt) {
    const seatsTotal = c.capacity ?? 0;
    const taken = c.capacity !== null && c.seatsLeft !== null ? c.capacity - c.seatsLeft : null;
    const accept = acceptWaitlistInvite.bind(null, entry.id);
    const acceptBody = (
      <>
        سيُحجز مقعدك في «{c.title}» فورًا.
        {c.price > 0 ? " يبدأ بعدها مؤقت دفع مدته ١٥ دقيقة — إن لم تُكمل الدفع يعود المقعد للقائمة ويُعرض على التالي." : " الدورة مجانية فلن يُطلب منك دفع."}
      </>
    );
    return (
      <>
        <TopBar title="دعوة شغور مقعد" subtitle="لديك مهلة محددة لقبول المقعد" />
        <PageBody className="gap-6">
          <section aria-labelledby="invite-title" className="flex flex-col-reverse items-stretch gap-6 rounded-22 border-2 border-state-success bg-state-success-bg px-5 py-6 sm:px-[30px] sm:py-7 md:flex-row md:items-center">
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="surface" icon={CircleCheck} className="text-state-success">
                  شغر مقعد لك
                </Chip>
                <ModeBadge mode={c.mode} />
              </div>
              <h2 id="invite-title" className="text-[28px] font-bold leading-[1.2] text-text-primary sm:text-[36px]">
                مقعدك متاح الآن في «{c.title}»
              </h2>
              <p className="type-body-lg text-text-secondary">
                كنت الأول في الترتيب. المقعد محجوز باسمك مؤقتًا — {c.price > 0 ? "أكمل الدفع" : "اقبله"} قبل انتهاء المهلة وإلا انتقل للتالي في القائمة.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <ConfirmAction label={c.price > 0 ? "اقبل المقعد وأكمل الدفع" : "اقبل المقعد"} variant="primary" size="l" title="قبول المقعد" body={acceptBody} confirmLabel="نعم، اقبل المقعد" action={accept} />
                <ConfirmAction
                  label="اعتذر عن المقعد"
                  variant="text"
                  size="l"
                  title="الاعتذار عن المقعد؟"
                  body="سيُعرض المقعد على التالي في الترتيب فورًا وتخرج من قائمة الانتظار. لا يُخصم أي مبلغ."
                  confirmLabel="نعم، اعتذر"
                  destructive
                  action={leaveWaitlist.bind(null, entry.id)}
                />
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1.5 self-center rounded-16 bg-bg-surface px-[22px] py-[18px]">
              <span className="font-mono text-[30px] font-semibold leading-[1.2] text-state-warning">
                <HmsCountdown until={entry.expiresAt} />
              </span>
              <span className="type-caption text-text-muted">الوقت المتبقي للقبول</span>
            </div>
          </section>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <SectionCard title="تفاصيل الدورة المتاحة" id="course-details">
              <article className="flex flex-col gap-5 rounded-16 border border-border-default bg-bg-card px-[22px] py-5 drop-shadow-milestone sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="min-w-0 flex-1 type-title text-text-primary">
                      {c.startsAt ? `${formatDate(c.startsAt)}${c.endsAt ? ` – ${formatDate(c.endsAt)}` : ""}` : c.title}
                    </h3>
                    <Chip tone="success">مقعد محجوز لك</Chip>
                  </div>
                  <ul className="flex flex-wrap items-center gap-x-[18px] gap-y-2 text-text-secondary">
                    {c.firstSession && (
                      <li className="flex items-center gap-1.5 type-caption">
                        <Glyph icon={Clock} size={16} />
                        {formatTime(c.firstSession.startsAt)} – {formatTime(c.firstSession.endsAt)}
                      </li>
                    )}
                    {(c.city || c.venue) && (
                      <li className="flex items-center gap-1.5 type-caption">
                        <Glyph icon={MapPin} size={16} />
                        {[c.city, c.venue].filter(Boolean).join(" · ")}
                      </li>
                    )}
                    {c.trainer && (
                      <li className="flex items-center gap-1.5 type-caption">
                        <Glyph icon={User} size={16} />
                        {c.trainer}
                      </li>
                    )}
                    <li className="flex items-center gap-1.5 type-caption">
                      <Glyph icon={Presentation} size={16} />
                      {c.mode === "in_person" ? "حضوري" : c.mode === "live_remote" ? "مباشر عن بُعد" : "مسجَّل"}
                    </li>
                  </ul>
                  {taken !== null && seatsTotal > 0 && (
                    <div className="flex items-center gap-2.5">
                      <span className="min-w-0 flex-1 type-caption text-text-muted">
                        {toArabicDigits(taken)} من {toArabicDigits(seatsTotal)} مقعدًا · مقعدك هو الشاغر
                      </span>
                      <span className="h-2 w-[200px] max-w-[40%] overflow-hidden rounded-full bg-border-default">
                        <span className="block h-full rounded-full bg-state-success" style={{ width: `${Math.min(100, (taken / seatsTotal) * 100)}%` }} />
                      </span>
                    </div>
                  )}
                  <span dir="ltr" className="self-end font-mono text-[14px] text-text-muted">
                    {c.ref}
                  </span>
                </div>
                <div className="flex shrink-0 flex-row items-center justify-between gap-2 sm:flex-col sm:items-end">
                  <span className="type-title text-text-primary">{c.price > 0 ? formatPrice(c.price, c.currency) : "مجانية"}</span>
                  <ConfirmAction label={c.price > 0 ? "اقبل وادفع" : "اقبل المقعد"} variant="primary" title="قبول المقعد" body={acceptBody} confirmLabel="نعم، اقبل المقعد" action={accept} />
                </div>
              </article>
              <p className="flex items-start gap-2.5 rounded-12 bg-state-warning-bg px-3.5 py-3 type-body text-state-warning">
                <Glyph icon={TriangleAlert} size={20} className="mt-1" />
                <span>عند القبول يبدأ مؤقت دفع مدته ١٥ دقيقة. إن لم تُكمل الدفع يعود المقعد للقائمة ويُعرض على التالي.</span>
              </p>
            </SectionCard>
            <WhatIf />
          </div>
        </PageBody>
      </>
    );
  }

  if (entry.status === "expired") {
    const all = await getWaitlistEntries(user.id);
    const view = all.find((w) => w.id === entry.id);
    return (
      <>
        <TopBar title="دعوة شغور مقعد" subtitle="انتهت مهلة القبول" />
        <PageBody className="gap-6">
          <DismissibleAlert tone="warning" title="انتهت مهلة قبول المقعد">
            لم تُقبل الدعوة خلال المهلة فانتقل المقعد إلى التالي في الترتيب. لم يُخصم أي مبلغ، وما زلت قادرًا على الانضمام من جديد لشغور قادم.
          </DismissibleAlert>
          {view && <WaitlistEntryCard entry={view} />}
          <SectionCard title="خياراتك الآن" id="options">
            <ul className="grid gap-4 md:grid-cols-3">
              <li className="flex flex-col items-center gap-2 rounded-12 bg-bg-page px-4 py-[18px] text-center">
                <span className="flex size-11 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
                  <Glyph icon={Users} size={20} />
                </span>
                <span className="type-subtitle text-text-primary">ابقَ في قائمة الانتظار</span>
                <span className="type-caption text-text-muted">تنضم إلى آخر القائمة وسنُشعرك عند الشغور القادم.</span>
                <ConfirmAction
                  label="ابقَ في القائمة"
                  variant="primary"
                  fullWidth
                  title="الانضمام لقائمة الانتظار من جديد؟"
                  body={`تنضم إلى آخر قائمة «${c.title}». لا يُخصم أي مبلغ قبل قبولك للمقعد.`}
                  confirmLabel="انضم للقائمة"
                  action={rejoinWaitlist.bind(null, c.id)}
                />
              </li>
              <li className="flex flex-col items-center gap-2 rounded-12 bg-bg-page px-4 py-[18px] text-center">
                <span className="flex size-11 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
                  <Glyph icon={CalendarDays} size={20} />
                </span>
                <span className="type-subtitle text-text-primary">اختر دورة أخرى</span>
                <span className="type-caption text-text-muted">دورات أخرى في المجال نفسه بمقاعد متاحة.</span>
                <ButtonLink href="/trainee/discover" variant="outline" fullWidth>
                  اعرض الدورات المتاحة
                </ButtonLink>
              </li>
              <li className="flex flex-col items-center gap-2 rounded-12 bg-bg-page px-4 py-[18px] text-center">
                <span className="flex size-11 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
                  <Glyph icon={BellRing} size={20} />
                </span>
                <span className="type-subtitle text-text-primary">فعّل تنبيهًا فوريًا</span>
                <span className="type-caption text-text-muted">نُشعرك خلال دقيقة من شغور أي مقعد.</span>
                <ButtonLink href="/account#notifications" variant="text" fullWidth>
                  فعّل التنبيه
                </ButtonLink>
              </li>
            </ul>
          </SectionCard>
        </PageBody>
      </>
    );
  }

  if (entry.status === "waiting") {
    const all = await getWaitlistEntries(user.id);
    const view = all.find((w) => w.id === entry.id);
    return (
      <>
        <TopBar title="قائمة انتظاري" subtitle={c.title} />
        <PageBody className="gap-6">
          {view && <WaitlistEntryCard entry={view} />}
          <WaitlistHowItWorks />
        </PageBody>
      </>
    );
  }

  // accepted / left
  let enrollmentId: string | null = null;
  if (entry.status === "accepted") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("enrollments")
      .select("id")
      .eq("trainee_id", user.id)
      .eq("course_id", c.id)
      .not("status", "in", "(withdrawn,cancelled,access_revoked)")
      .limit(1);
    enrollmentId = data?.[0]?.id ?? null;
  }
  return (
    <>
      <TopBar title="دعوة شغور مقعد" subtitle={c.title} />
      <PageBody className="gap-6">
        {entry.status === "accepted" ? (
          <Notice tone="success" title="قبلت المقعد">
            <p>قبلت مقعدك في «{c.title}»{entry.invitedAt ? ` بعد دعوة ${formatDayMonth(entry.invitedAt)}` : ""}. تابع تسجيلك من ملف التدريب.</p>
          </Notice>
        ) : (
          <Notice tone="neutral" title="خرجت من قائمة الانتظار">
            <p>لم تعد في قائمة انتظار «{c.title}». يمكنك الانضمام من جديد من صفحة الدورة ما دامت مكتملة.</p>
          </Notice>
        )}
        <div className="flex flex-wrap gap-3">
          {enrollmentId ? <ButtonLink href={`/trainee/trainings/${enrollmentId}`}>افتح تفاصيل التسجيل</ButtonLink> : <ButtonLink href={`/courses/${c.slug}`}>صفحة الدورة</ButtonLink>}
          <ButtonLink href="/trainee/waitlist" variant="outline">
            قائمة انتظاري
          </ButtonLink>
        </div>
      </PageBody>
    </>
  );
}
