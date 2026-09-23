"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, Briefcase, Building2, CircleCheck, Globe, LayoutGrid, Lock, Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Data";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { IconPill } from "./bits";
import { experienceYears } from "./format";
import { updateProfile } from "@/app/(workspace)/trainee/profile/actions";
import { initialFormState } from "@/lib/validation/auth";
import type { ExperienceView } from "@/lib/data/profile";

type Props = {
  fullName: string;
  verified: boolean;
  headline: string | null;
  bio: string | null;
  city: string | null;
  phone: string | null;
  avatarUrl: string | null;
  experiences: ExperienceView[];
  skills: string[];
};

const IMPACT: { icon: LucideIcon; title: string; caption: string; tone: string }[] = [
  { icon: LayoutGrid, title: "يظهر للجميع فورًا", caption: "العنوان المهني · النبذة · الصورة · الخبرات", tone: "text-text-brand" },
  { icon: Building2, title: "يظهر للجهات فقط", caption: "ساعاتك التدريبية ومستواك", tone: "text-state-warning" },
  { icon: Lock, title: "لا يظهر أبدًا", caption: "بريدك · هاتفك · مدفوعاتك · درجاتك", tone: "text-state-success" },
  { icon: BadgeCheck, title: "يتطلب إعادة توثيق", caption: "الاسم الموثّق في هويتك", tone: "text-state-warning" },
];

function CardHead({ id, title, pill }: { id: string; title: string; pill?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h3 id={id} className="min-w-0 flex-1 type-h3 text-text-primary">
        {title}
      </h3>
      {pill}
    </div>
  );
}

const card = "flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6";

/** TRN-PRF-02 · تحرير الملف (243:15464). One form spans both columns; the save card lives in the side column. */
export function EditProfileForm(p: Props) {
  const [state, action, pending] = useActionState(updateProfile, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const v = state.values;

  return (
    <form ref={formRef} action={action} noValidate className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-6">
        {p.verified ? (
          <section aria-labelledby="locked-title" className="flex flex-col gap-4 rounded-16 border-[1.5px] border-state-warning bg-state-warning-bg p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h3 id="locked-title" className="min-w-0 flex-1 type-h3 text-state-warning">
                بيانات موثّقة — مقفلة
              </h3>
              <IconPill tone="surface-warning" icon={Lock}>
                مقفل
              </IconPill>
            </div>
            <p className="type-body text-text-secondary">
              هذه البيانات مطابقة لهويتك الموثّقة. تغييرها يُبطل التوثيق ويتطلب رفع مستند جديد ومراجعة تستغرق ٢٤ إلى ٤٨ ساعة عمل، وقد يتعطّل خلالها تسجيلك في البرامج المعتمدة.
            </p>
            <div className="flex items-center gap-3 rounded-12 bg-bg-surface px-4 py-3.5">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="type-caption text-text-muted">الاسم الكامل</span>
                <span className="type-subtitle text-text-primary">{p.fullName}</span>
              </div>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-state-warning-bg text-state-warning">
                <Glyph icon={Lock} size={16} />
              </span>
            </div>
            <ButtonLink href="/trainee/verification?new=1" variant="outline" className="self-end bg-bg-surface">
              أريد تغيير بياناتي الموثّقة
            </ButtonLink>
          </section>
        ) : (
          <section aria-labelledby="identity-title" className={card}>
            <CardHead id="identity-title" title="اسمك في الملف" pill={<IconPill tone="info" icon={Globe}>عام · يظهر في ملفك العام</IconPill>} />
            <Input
              name="fullName"
              label="الاسم الكامل"
              autoComplete="name"
              required
              defaultValue={v?.fullName ?? p.fullName}
              error={state.fieldErrors?.fullName}
              hint="اكتبه كما في هويتك — يُقفل بعد توثيق الهوية."
            />
          </section>
        )}

        <section aria-labelledby="public-title" className={card}>
          <CardHead id="public-title" title="ما يظهر في ملفك العام" pill={<IconPill tone="info" icon={Globe}>عام · يظهر في ملفك العام</IconPill>} />
          <Input
            name="headline"
            label="العنوان المهني"
            placeholder="مثال: منسّق مشاريع · يبني مساره في إدارة المشاريع"
            maxLength={160}
            defaultValue={v?.headline ?? p.headline ?? ""}
            error={state.fieldErrors?.headline}
          />
          <Textarea
            id="bio"
            name="bio"
            label="نبذة عنك"
            rows={3}
            maxLength={2000}
            placeholder="ما تعمل عليه، وما تتعلّمه، وما تبحث عنه."
            defaultValue={v?.bio ?? p.bio ?? ""}
            error={state.fieldErrors?.bio}
          />
          <Input name="city" label="المدينة" placeholder="مثال: الرياض" maxLength={80} autoComplete="address-level2" defaultValue={v?.city ?? p.city ?? ""} error={state.fieldErrors?.city} />
          <div className="flex flex-wrap items-center gap-4 rounded-12 bg-bg-page px-4 py-4">
            <Avatar name={p.fullName || "؟"} src={p.avatarUrl} size="l" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="type-subtitle text-text-primary">الصورة الشخصية</p>
              <p className="type-caption text-text-muted">صورة واضحة لوجهك · JPG أو PNG أو WebP حتى ٢ م.ب · تظهر مع تقييماتك المنشورة</p>
            </div>
            <ButtonLink href="/trainee/profile/photo" variant="outline" size="s" className="w-[120px]">
              {p.avatarUrl ? "غيّر الصورة" : "ارفع صورة"}
            </ButtonLink>
          </div>
        </section>

        <section aria-labelledby="private-title" className={card}>
          <CardHead id="private-title" title="بيانات خاصة" pill={<IconPill tone="success" icon={Lock}>خاص · لا يظهر أبدًا</IconPill>} />
          <Input
            name="phone"
            type="tel"
            dir="ltr"
            label="رقم الهاتف"
            placeholder="+9665XXXXXXXX"
            autoComplete="tel"
            defaultValue={v?.phone ?? p.phone ?? ""}
            error={state.fieldErrors?.phone}
            hint="يُستخدم لتنبيهات المهل الحرجة فقط، ولا يظهر في ملفك."
          />
        </section>

        <section aria-labelledby="exp-edit-title" className={card}>
          <CardHead id="exp-edit-title" title="الخبرات المهنية" pill={<IconPill tone="info" icon={Globe}>عام · يظهر في ملفك العام</IconPill>} />
          <p className="type-caption text-state-warning">تُدخلها بنفسك ولا تتحقق منها المنصة — تُعرض للآخرين موسومة «غير متحقَّق منها».</p>
          {p.experiences.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {p.experiences.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-12 bg-bg-page px-4 py-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-surface text-text-secondary">
                    <Glyph icon={Briefcase} size={20} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <p className="type-subtitle text-text-primary">
                      {e.title} · {e.organization}
                    </p>
                    <p className="type-caption text-text-muted">{experienceYears(e)}</p>
                  </div>
                  <Link
                    href={`/trainee/profile/experience?delete=${e.id}`}
                    aria-label={`حذف خبرة ${e.title}`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-state-error focus-ring"
                  >
                    <Glyph icon={Trash2} size={16} />
                  </Link>
                  <Link
                    href={`/trainee/profile/experience?edit=${e.id}`}
                    aria-label={`تعديل خبرة ${e.title}`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-secondary focus-ring"
                  >
                    <Glyph icon={Pencil} size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-small text-text-secondary">لا توجد خبرات بعد.</p>
          )}
          <ButtonLink href="/trainee/profile/experience?mode=add" variant="outline" fullWidth>
            أضف خبرة
          </ButtonLink>
        </section>

        <section aria-labelledby="skills-edit-title" className="flex flex-col gap-4 rounded-16 border border-state-success/30 bg-state-success-bg p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h3 id="skills-edit-title" className="min-w-0 flex-1 type-h3 text-state-success">
              المهارات الموثّقة — تُبنى تلقائيًا
            </h3>
            <IconPill tone="surface-success" icon={CircleCheck}>
              غير قابلة للتعديل
            </IconPill>
          </div>
          <p className="type-body text-text-secondary">
            تُستخرج من دوراتك المكتملة. لا يمكنك إضافتها أو حذفها — وهذا ما يجعل ملفك موثوقًا أمام جهات التوظيف. لإضافة مهارة جديدة، أكمل دورة تغطّيها.
          </p>
          {p.skills.length > 0 ? (
            <ul className="flex flex-wrap gap-2.5">
              {p.skills.map((s) => (
                <li key={s} className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-3 py-2 type-small text-state-success">
                  <Glyph icon={CircleCheck} size={16} />
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-small text-text-secondary">لم تُكمل دورة بعد.</p>
          )}
          <Link href="/trainee/discover" className="self-start rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
            اكتشف دورات تضيف مهارات جديدة
          </Link>
        </section>
      </div>

      <aside aria-label="أثر التعديلات والحفظ" className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-[110px]">
        <section aria-labelledby="impact-title" className={card}>
          <h3 id="impact-title" className="type-h3 text-text-primary">
            أثر تعديلاتك
          </h3>
          <ul className="flex flex-col gap-4">
            {IMPACT.map((i) => (
              <li key={i.title} className="flex items-start gap-2.5 rounded-12 bg-bg-page px-3 py-[11px]">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${i.tone}`}>
                  <Glyph icon={i.icon} size={20} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className={`type-subtitle ${i.tone}`}>{i.title}</p>
                  <p className="type-caption text-text-muted">{i.caption}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="save-title" className={card}>
          <h3 id="save-title" className="type-h3 text-text-primary">
            حفظ التعديلات
          </h3>
          {state.status === "success" ? (
            <Alert tone="success" title="حُفظت تعديلاتك">
              {state.message}
            </Alert>
          ) : state.status === "error" ? (
            <Alert tone="error" title="تعذّر الحفظ">
              {state.message ?? "راجع الحقول المظلّلة ثم أعد المحاولة."}
            </Alert>
          ) : (
            <p className="type-body text-state-warning">لم تُحفظ تعديلاتك بعد. عاين ملفك قبل الحفظ لترى كيف سيظهر للآخرين.</p>
          )}
          <Button type="submit" name="intent" value="preview" size="l" fullWidth loading={pending}>
            عاين ثم احفظ
          </Button>
          <Button type="submit" name="intent" value="save" variant="outline" size="l" fullWidth disabled={pending}>
            احفظ مباشرة
          </Button>
          <button
            type="button"
            onClick={() => formRef.current?.reset()}
            className="h-12 cursor-pointer rounded-12 type-subtitle text-text-brand hover:underline focus-ring"
          >
            تراجع عن التعديلات
          </button>
        </section>
      </aside>
    </form>
  );
}
