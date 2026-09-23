"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import { Award, ChevronDown, CircleAlert, CircleUser, CircleX, Clock, Download, Eye, FileText, Hourglass, Landmark, Lock, Shield, Trophy } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { TileRow } from "@/components/profile/bits";
import { closeAccount, updatePrivacy } from "@/app/(workspace)/account/actions";
import type { DeletionBlocker } from "@/lib/data/account";

const card = "flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6";

type Field = "is_public" | "show_certificates" | "show_learning_record";

const BLOCKER_COPY: Record<DeletionBlocker, string> = {
  active_enrollment: "لديك تسجيل نشط في دورة جارية أو قادمة",
  open_refund: "لديك طلب استرداد قيد المراجعة",
  open_dispute: "لديك نزاع مالي مفتوح",
};

function PrivacyRow({
  icon,
  title,
  caption,
  children,
}: {
  icon: LucideIcon;
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-12 bg-bg-page px-4 py-3.5 sm:flex-nowrap">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
        <Glyph icon={icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="type-subtitle text-text-primary">{title}</p>
        <p className="type-caption text-text-muted">{caption}</p>
      </div>
      <div className="w-full sm:w-[164px]">{children}</div>
    </div>
  );
}

function VisibilitySelect({ label, value, onChange, publicLabel }: { label: string; value: boolean; onChange: (v: boolean) => void; publicLabel: string }) {
  return (
    <div className="relative flex items-center">
      <select
        aria-label={label}
        value={value ? "public" : "private"}
        onChange={(e) => onChange(e.target.value === "public")}
        className="h-11 w-full cursor-pointer appearance-none rounded-12 border-[1.5px] border-border-default bg-bg-surface px-4 pe-10 type-small text-text-primary outline-none focus:border-2 focus:border-action-primary"
      >
        <option value="public">{publicLabel}</option>
        <option value="private">خاص</option>
      </select>
      <Glyph icon={ChevronDown} size={16} className="pointer-events-none absolute end-3 text-text-secondary" />
    </div>
  );
}

function AlwaysPrivate() {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[3px] type-caption text-state-success">
        <Glyph icon={Lock} size={16} />
        خاص دائمًا
      </span>
      <span className="flex size-9 items-center justify-center rounded-8 bg-state-success-bg text-state-success">
        <Glyph icon={Lock} size={16} />
      </span>
    </div>
  );
}

/** GEN-ACC-01 · ٤ الخصوصية والبيانات (229:14437) — visibility, data export and account deletion (BR-S3). */
export function PrivacyPanel({
  isPublic,
  showCertificates,
  showLearningRecord,
  blockers,
}: {
  isPublic: boolean;
  showCertificates: boolean;
  showLearningRecord: boolean;
  blockers: DeletionBlocker[];
}) {
  const [values, setValues] = useState({ is_public: isPublic, show_certificates: showCertificates, show_learning_record: showLearningRecord });
  const [confirm, setConfirm] = useState<"freeze" | "delete" | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const blocked = blockers.length > 0;

  const set = (field: Field, v: boolean) => {
    const prev = values[field];
    setValues((s) => ({ ...s, [field]: v }));
    start(async () => {
      const res = await updatePrivacy(field, v);
      if (res.status === "error") {
        setValues((s) => ({ ...s, [field]: prev }));
        toast("error", res.message ?? "تعذّر الحفظ");
      } else toast("success", res.message ?? "حُفظ.");
    });
  };

  const close = (kind: "freeze" | "delete") =>
    start(async () => {
      setCloseError(null);
      const res = await closeAccount(kind);
      if (res?.status === "error") setCloseError(res.message ?? null);
    });

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-6">
        <section aria-labelledby="who-title" aria-busy={pending || undefined} className={card}>
          <h2 id="who-title" className="type-h3 text-text-primary">
            من يرى ماذا
          </h2>
          <p className="type-caption text-text-secondary">الافتراضي دائمًا «خاص». أنت من يرفع مستوى الظهور، ونعرض لك معاينة قبل أي نشر.</p>
          <PrivacyRow icon={CircleUser} title="اسمي وصورتي وملفي" caption="يظهر مع تقييماتك المنشورة وعبر رابط ملفك">
            <VisibilitySelect label="ظهور اسمي وصورتي وملفي" value={values.is_public} onChange={(v) => set("is_public", v)} publicLabel="عام" />
          </PrivacyRow>
          <PrivacyRow icon={Award} title="شهاداتي" caption="أي جهة توظيف تفتح الرابط وتتأكد">
            <VisibilitySelect label="ظهور شهاداتي" value={values.show_certificates} onChange={(v) => set("show_certificates", v)} publicLabel="عام برابط تحقق" />
          </PrivacyRow>
          <PrivacyRow icon={Clock} title="ساعاتي ومهاراتي" caption="تراها الجهات التي سجّلت لديها دائمًا — «عام» يعرضها في ملفك">
            <VisibilitySelect label="ظهور ساعاتي ومهاراتي" value={values.show_learning_record} onChange={(v) => set("show_learning_record", v)} publicLabel="عام" />
          </PrivacyRow>
          <PrivacyRow icon={Trophy} title="درجاتي ونتائجي" caption="لا تظهر لأحد إلا بموافقتك">
            <AlwaysPrivate />
          </PrivacyRow>
          <PrivacyRow icon={Hourglass} title="مدفوعاتي وفواتيري" caption="لا يمكن جعلها عامة إطلاقًا">
            <AlwaysPrivate />
          </PrivacyRow>
          <PrivacyRow icon={CircleX} title="دوراتي المنسحب منها" caption="لا تظهر في أي سجل مشارَك">
            <AlwaysPrivate />
          </PrivacyRow>
          <ButtonLink href="/trainee/profile?tab=preview" variant="secondary" fullWidth>
            عاين ملفي كما يراه الآخرون
          </ButtonLink>
        </section>

        <section aria-labelledby="data-title" className={card}>
          <h2 id="data-title" className="type-h3 text-text-primary">
            بياناتك
          </h2>
          <div className="flex flex-wrap items-center gap-3 rounded-12 bg-bg-page px-4 py-3.5 sm:flex-nowrap">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
              <Glyph icon={Download} size={20} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="type-subtitle text-text-primary">نزّل نسخة من بياناتك</p>
              <p className="type-caption text-text-muted">ملف واحد (JSON) يشمل حسابك وتسجيلاتك وشهاداتك وسجل تعلّمك ورسائلك — يُنزَّل فورًا.</p>
            </div>
            <a href="/account/export" download className="flex h-11 shrink-0 items-center justify-center rounded-12 px-[18px] type-small text-text-primary inner-stroke istroke-w-[1.5px] istroke-c-border-default hover:bg-bg-brand-tint focus-ring">
              اطلب نسختي
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-12 bg-bg-page px-4 py-3.5 sm:flex-nowrap">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
              <Glyph icon={Eye} size={20} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="type-subtitle text-text-primary">سجل نشاط حسابك</p>
              <p className="type-caption text-text-muted">عمليات الدخول والتغييرات على حسابك — يتاح قريبًا. حتى ذلك الحين يصلك تنبيه بكل دخول جديد.</p>
            </div>
            <Link href="/account/security" className="shrink-0 rounded-8 px-2 type-small text-text-brand hover:underline focus-ring">
              الأمان والجلسات
            </Link>
          </div>
        </section>

        <section aria-labelledby="delete-title" className="flex flex-col gap-4 rounded-16 border-[1.5px] border-state-error bg-state-error-bg p-5 sm:p-6">
          <h2 id="delete-title" className="type-h3 text-state-error">
            حذف الحساب
          </h2>
          <p className="type-small text-text-secondary">قبل أن تقرّر — هذا ما سيحدث بالضبط:</p>
          <TileRow tone="surface" icon={CircleX} iconClass="text-state-error" titleClass="text-state-error" title="يُحذف نهائيًا" caption="حسابك · ملفك · تسجيلاتك · رسائلك · مفضلتك" />
          <TileRow tone="surface" icon={Award} iconClass="text-state-success" titleClass="text-state-success" title="شهاداتك تبقى قابلة للتحقق" caption="روابط التحقق العامة تظل تعمل — لا تفقد إثبات إنجازك" />
          <TileRow tone="surface" icon={Hourglass} iconClass="text-state-warning" titleClass="text-state-warning" title="السجلات المالية تُحفظ ٧ سنوات" caption="التزامًا نظاميًا — لا يمكن حذفها بطلبك" />
          {blocked ? (
            <TileRow
              tone="surface"
              icon={CircleAlert}
              iconClass="text-state-error"
              titleClass="text-state-error"
              title="لا يمكن حذف الحساب الآن"
              caption={`${blockers.map((b) => BLOCKER_COPY[b]).join(" · ")}. أنهِها أولًا ثم عد إلى هنا.`}
            />
          ) : (
            <TileRow tone="surface" icon={Shield} iconClass="text-state-success" titleClass="text-state-success" title="لا التزامات قائمة" caption="لا تسجيل نشط ولا استرداد أو نزاع مفتوح — يمكنك المتابعة." />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="danger" disabled={blocked} onClick={() => setConfirm("delete")}>
              احذف حسابي نهائيًا
            </Button>
            <Button variant="outline" disabled={blocked} className="bg-bg-surface" onClick={() => setConfirm("freeze")}>
              جمّد حسابي مؤقتًا بدلًا من ذلك
            </Button>
          </div>
          <p className="type-caption text-text-secondary">التجميد يوقف الإشعارات ويخفي ملفك، ويمكنك العودة في أي وقت بالتواصل مع الدعم.</p>
        </section>
      </div>

      <aside aria-label="التزامنا تجاه بياناتك" className="flex min-w-0 flex-col gap-6">
        <section aria-labelledby="commit-title" className={card}>
          <h2 id="commit-title" className="type-h3 text-text-primary">
            التزامنا تجاه بياناتك
          </h2>
          <TileRow icon={Shield} iconClass="text-state-success" title="لا نبيع بياناتك" caption="لأي معلن أو طرف ثالث. إطلاقًا." />
          <TileRow icon={Landmark} title="ما تراه الجهة التدريبية" caption="اسمك وحضورك ونتائجك في دوراتها فقط — لا شيء آخر." />
          <TileRow icon={FileText} iconClass="text-state-success" title="مستندات التوثيق" caption="مشفّرة ولا تُشارك مع أي جهة تدريبية." />
          <TileRow icon={Hourglass} title="حقوقك" caption="الاطلاع · التصحيح · النقل · الحذف — وفق قانون حماية البيانات." />
          <Link href="/terms#privacy" className="self-center rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
            اقرأ سياسة الخصوصية كاملة
          </Link>
        </section>
      </aside>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        destructive={confirm === "delete"}
        size="s"
        title={confirm === "delete" ? "حذف حسابك نهائيًا؟" : "تجميد حسابك؟"}
        footer={
          <>
            <Button variant={confirm === "delete" ? "danger" : "primary"} size="s" loading={pending} onClick={() => confirm && close(confirm)}>
              {confirm === "delete" ? "نعم، احذف حسابي" : "جمّد حسابي"}
            </Button>
            <Button variant="outline" size="s" onClick={() => setConfirm(null)}>
              تراجع
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>
            {confirm === "delete"
              ? "سنجمّد حسابك فورًا ونسجّل طلب الحذف، ثم تُحذف بياناتك نهائيًا بعد مراجعة الطلب. شهاداتك تبقى قابلة للتحقق. ستُسجَّل خارج المنصة الآن."
              : "سيختفي ملفك وتتوقف الإشعارات، وستُسجَّل خارج المنصة الآن. للعودة تواصل مع الدعم."}
          </p>
          {closeError && <Alert tone="error" title="تعذّر التنفيذ">{closeError}</Alert>}
        </div>
      </Modal>
    </div>
  );
}
