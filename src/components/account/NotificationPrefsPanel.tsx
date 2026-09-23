"use client";

import { useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import { Award, CalendarDays, Hourglass, LayoutGrid, Lock, MessagesSquare, TriangleAlert, Users } from "lucide-react";
import { Select } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Choice";
import { Glyph } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { updateNotificationPrefs } from "@/app/(workspace)/account/actions";
import type { Channel, NotificationEvent, NotificationPrefs } from "@/lib/data/account";

const card = "flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6";

const EVENTS: { key: NotificationEvent; title: string; caption: string; icon: LucideIcon; tone: string }[] = [
  { key: "urgent", title: "مهل حرجة", caption: "مهلة الدفع · انتهاء حجز المقعد · مهلة قبول مقعد شاغر.", icon: TriangleAlert, tone: "text-state-warning" },
  { key: "waitlist", title: "قائمة الانتظار", caption: "شغور مقعد في دورة تنتظرها وتغيّر ترتيبك.", icon: Users, tone: "text-state-success" },
  { key: "sessions", title: "جلساتك ومواعيدك", caption: "تذكير قبل ٢٤ ساعة وقبل ساعتين من كل جلسة.", icon: CalendarDays, tone: "text-text-brand" },
  { key: "payments", title: "المدفوعات والاسترداد", caption: "تأكيد الدفع · حالة الاسترداد · الفواتير.", icon: Hourglass, tone: "text-state-success" },
  { key: "certificates", title: "الشهادات والنتائج", caption: "صدور شهادة · نتيجة اختبار · تقييم واجب.", icon: Award, tone: "text-state-warning" },
  { key: "messages", title: "الرسائل والردود", caption: "ردّ مقدّم التدريب أو المدرب أو الدعم.", icon: MessagesSquare, tone: "text-state-info" },
  { key: "offers", title: "مقترحات وعروض", caption: "برامج جديدة في تخصصاتك وتخفيضات على مفضلتك.", icon: LayoutGrid, tone: "text-text-secondary" },
];
const CHANNELS: { key: Channel; label: string }[] = [
  { key: "in_app", label: "داخل المنصة" },
  { key: "email", label: "بريد" },
  { key: "sms", label: "رسالة قصيرة" },
];
const HOURS = Array.from({ length: 24 }, (_, h) => {
  const v = `${String(h).padStart(2, "0")}:00`;
  const label = new Intl.DateTimeFormat("ar-SA-u-nu-arab", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 1, h)));
  return { value: v, label };
});

function ChannelBox({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 cursor-pointer appearance-none rounded-full bg-border-default transition-colors checked:bg-action-primary focus-ring disabled:cursor-not-allowed disabled:opacity-60"
      />
      <span aria-hidden className="pointer-events-none absolute start-[3px] size-[22px] rounded-full bg-white shadow-knob transition-transform peer-checked:-translate-x-5" />
    </span>
  );
}

/** GEN-ACC-01 · ٣ تفضيلات الإشعارات (229:14061) — account_settings.notification_prefs, auto-saved. */
export function NotificationPrefsPanel({ initial }: { initial: NotificationPrefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();

  const save = (next: NotificationPrefs) => {
    const prev = prefs;
    setPrefs(next);
    start(async () => {
      const res = await updateNotificationPrefs(next);
      if (res.status === "error") {
        setPrefs(prev);
        toast("error", res.message ?? "تعذّر الحفظ");
      }
    });
  };
  const setChannel = (event: NotificationEvent, channel: Channel, v: boolean) =>
    save({ ...prefs, events: { ...prefs.events, [event]: { ...prefs.events[event], [channel]: v } } });

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-6">
        <section aria-labelledby="matrix-title" aria-busy={pending || undefined} className={card}>
          <h2 id="matrix-title" className="type-h3 text-text-primary">
            ما يصلني وأين يصلني
          </h2>
          <p className="type-caption text-text-secondary">لكل نوع إشعار ثلاث قنوات مستقلة. القنوات الحرجة مثبّتة لحمايتك ولا يمكن إيقافها.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-y-2 text-start">
              <caption className="sr-only">قنوات الإشعارات لكل نوع</caption>
              <thead>
                <tr className="type-caption text-text-secondary">
                  <th scope="col" className="rounded-s-12 bg-bg-page px-4 py-3 text-start font-normal">
                    نوع الإشعار
                  </th>
                  {CHANNELS.map((c, i) => (
                    <th key={c.key} scope="col" className={`w-28 bg-bg-page px-2 py-3 text-center font-normal ${i === CHANNELS.length - 1 ? "rounded-e-12" : ""}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EVENTS.map((e) => {
                  const locked = e.key === "urgent";
                  return (
                    <tr key={e.key} className={locked ? "bg-state-warning-bg" : ""}>
                      <th scope="row" className={`px-4 py-3 text-start font-normal ${locked ? "rounded-s-12" : ""}`}>
                        <div className="flex items-center gap-3">
                          <span className={`flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-page ${e.tone}`}>
                            <Glyph icon={e.icon} size={20} />
                          </span>
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="flex items-center gap-2 type-subtitle text-text-primary">
                              {e.title}
                              {locked && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-bg-surface px-2 py-px type-caption text-state-warning">
                                  <Glyph icon={Lock} size={16} />
                                  إلزامي
                                </span>
                              )}
                            </span>
                            <span className="type-caption text-text-muted">{e.caption}</span>
                          </span>
                        </div>
                      </th>
                      {CHANNELS.map((c, i) => (
                        <td key={c.key} className={`px-2 py-3 text-center ${locked && i === CHANNELS.length - 1 ? "rounded-e-12" : ""}`}>
                          <ChannelBox
                            checked={prefs.events[e.key][c.key]}
                            disabled={locked}
                            onChange={(v) => setChannel(e.key, c.key, v)}
                            label={`${e.title} — ${c.label}${locked ? " (إلزامي)" : ""}`}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="quiet-title" className={card}>
          <h2 id="quiet-title" className="type-h3 text-text-primary">
            ساعات الهدوء
          </h2>
          <p className="type-caption text-text-secondary">لا تصلك إشعارات غير حرجة خلال هذه الفترة. المهل الحرجة تصل دائمًا.</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Select
              label="من"
              value={prefs.quietHours.from}
              options={HOURS}
              disabled={!prefs.quietHours.enabled}
              onChange={(e) => save({ ...prefs, quietHours: { ...prefs.quietHours, from: e.target.value } })}
            />
            <Select
              label="إلى"
              value={prefs.quietHours.to}
              options={HOURS}
              disabled={!prefs.quietHours.enabled}
              onChange={(e) => save({ ...prefs, quietHours: { ...prefs.quietHours, to: e.target.value } })}
            />
            <Toggle
              className="shrink-0 sm:w-40"
              checked={prefs.quietHours.enabled}
              onChange={(e) => save({ ...prefs, quietHours: { ...prefs.quietHours, enabled: e.target.checked } })}
            >
              مفعّلة
            </Toggle>
          </div>
        </section>
      </div>

      <aside aria-label="شرح وتفضيلات التواصل" className="flex min-w-0 flex-col gap-6">
        <section aria-labelledby="why-mandatory" className={card}>
          <h2 id="why-mandatory" className="type-h3 text-text-primary">
            لماذا بعضها إلزامي؟
          </h2>
          <p className="type-body text-text-secondary">المهل الحرجة مرتبطة بمال أو مقعد قد تخسره. إيقافها قد يكلّفك مقعدًا أو مبلغًا، لذلك تبقى مفعّلة على القنوات الثلاث.</p>
          <div className="flex flex-col gap-1 rounded-12 bg-state-warning-bg px-4 py-3.5">
            <p className="type-caption text-state-warning">مثال</p>
            <p className="type-caption text-text-secondary">مؤقّت الدفع ١٥ دقيقة — لو لم يصلك التنبيه لتحرّر مقعدك وعدت لقائمة الانتظار من جديد.</p>
          </div>
        </section>
        <section aria-labelledby="comm-title" className={card}>
          <h2 id="comm-title" className="type-h3 text-text-primary">
            تفضيلات التواصل
          </h2>
          <Toggle checked={prefs.weeklyDigest} onChange={(e) => save({ ...prefs, weeklyDigest: e.target.checked })} description="بريد كل أحد بتقدّمك وجديد تخصصاتك">
            ملخّص أسبوعي
          </Toggle>
          <Toggle checked={prefs.allowMessages} onChange={(e) => save({ ...prefs, allowMessages: e.target.checked })} description="الجهات التي سجّلت لديها فقط">
            من يستطيع مراسلتي
          </Toggle>
          <Toggle checked={prefs.surveys} onChange={(e) => save({ ...prefs, surveys: e.target.checked })} description="مرة كل ثلاثة أشهر كحد أقصى">
            استبيانات تحسين المنصة
          </Toggle>
        </section>
      </aside>
    </div>
  );
}
