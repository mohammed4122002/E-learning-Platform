"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { CalendarDays, CircleAlert, CircleCheck, CircleX, ImagePlus, LayoutGrid, MapPin, Armchair, Plus, TriangleAlert, X } from "lucide-react";
import { autosaveProgram, saveBasics } from "@/app/(trainer)/trainer/programs/actions";
import { CourseCard } from "@/components/course/CourseCard";
import { announceSaved, announceSaving } from "@/components/trainer-programs/SavedIndicator";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { coverUrl } from "@/lib/storage";
import { hoursWord, UPLOAD_LIMITS } from "@/lib/trainer-programs";
import { initialFormState } from "@/lib/validation/auth";

export type BasicsInitial = {
  id: string | null;
  title: string;
  summary: string;
  categoryId: string;
  skills: string[];
  level: "beginner" | "intermediate" | "advanced";
  hours: string;
  language: string;
  prerequisites: string;
  coverPath: string;
  price: number | null;
  updatedAt: string | null;
};

const LEVELS = [
  { value: "beginner", label: "مبتدئ" },
  { value: "intermediate", label: "متوسط" },
  { value: "advanced", label: "متقدم" },
];
const LANGUAGES = [
  { value: "ar", label: "العربية" },
  { value: "en", label: "الإنجليزية" },
  { value: "ar_en", label: "العربية والإنجليزية" },
];
/** «معرض المنصة»: cover images that ship with the platform (free to use). */
const GALLERY = [
  "/assets/images/continue-project-management.jpg",
  "/assets/images/continue-business-administration.jpg",
  "/assets/images/recommended-financial-leadership.jpg",
  "/assets/images/recommended-effective-leadership.jpg",
  "/assets/images/recommended-web-development.jpg",
  "/assets/images/continue-design.jpg",
];


function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-2.5 rounded-8 px-3 pt-2.5 pb-[11px] type-caption text-text-primary ${ok ? "bg-state-success-bg" : "bg-state-error-bg"}`}>
      <Glyph icon={ok ? CircleCheck : CircleX} size={16} className={ok ? "text-state-success" : "text-state-error"} />
      {children}
    </li>
  );
}

function AsideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
      <h2 className="type-h2 text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

/** TRR-PRG-02 · ١ الأساسيات والغلاف (351:13417 · no cover 351:13808). */
export function BasicsForm({
  initial,
  categories,
  userId,
  trainerName,
}: {
  initial: BasicsInitial;
  categories: { id: string; name: string }[];
  userId: string;
  trainerName: string;
}) {
  const [state, action, pending] = useActionState(saveBasics, initialFormState);
  const v = (k: string, fallback: string) => state.values?.[k] ?? fallback;
  const fe = state.fieldErrors ?? {};

  const [title, setTitle] = useState(v("title", initial.title));
  const [summary, setSummary] = useState(v("summary", initial.summary));
  const [categoryId, setCategoryId] = useState(v("categoryId", initial.categoryId));
  const [level, setLevel] = useState(v("level", initial.level));
  const [hours, setHours] = useState(v("hours", initial.hours));
  const [skills, setSkills] = useState<string[]>(initial.skills);
  const [skillDraft, setSkillDraft] = useState<string | null>(null);
  const [coverPath, setCoverPath] = useState(v("coverPath", initial.coverPath));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [warnClosed, setWarnClosed] = useState(false);
  const [, startAutosave] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cover = coverUrl(coverPath);
  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? null;
  const hoursNum = Number(hours.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
  const levelLabel = LEVELS.find((l) => l.value === level)?.label ?? "";

  // Debounced autosave of an existing draft.
  function scheduleAutosave() {
    if (!initial.id) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!formRef.current) return;
      const fd = new FormData(formRef.current);
      fd.set("step", "basics");
      announceSaving();
      startAutosave(async () => {
        const res = await autosaveProgram(fd);
        if (res.ok && res.savedAt) announceSaved(res.savedAt);
        else window.dispatchEvent(new CustomEvent("program-saved", { detail: null }));
      });
    }, 1500);
  }
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  // Skills and cover are state-driven: autosave after they change.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    scheduleAutosave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills, coverPath]);

  async function onFile(file: File) {
    setUploadError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setUploadError("اختر صورة JPG أو PNG أو WEBP.");
    if (file.size > UPLOAD_LIMITS.coverBytes) return setUploadError("حجم الصورة أكبر من ٥ م.ب — صغّرها ثم أعد الرفع.");
    const dims = await new Promise<{ w: number; h: number } | null>((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
    if (!dims) return setUploadError("تعذّر قراءة الصورة. جرّب ملفًا آخر.");
    if (dims.w < 1600 || dims.h < 900) return setUploadError("الصورة أصغر من المطلوب — المقاس الأدنى ١٦٠٠×٩٠٠ بكسل.");
    setUploading(true);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/programs/${initial.id ?? "new"}/${Date.now()}.${ext}`;
    const { error } = await createClient().storage.from("course-covers").upload(path, file, { contentType: file.type, upsert: false });
    setUploading(false);
    if (error) return setUploadError("تعذّر رفع الصورة. تحقّق من اتصالك ثم أعد المحاولة.");
    setCoverPath(path);
  }

  function addSkill() {
    const s = (skillDraft ?? "").trim();
    if (s && !skills.includes(s) && skills.length < 15) setSkills([...skills, s.slice(0, 60)]);
    setSkillDraft(null);
  }

  const followCard = (
    <AsideCard title="متابعة">
      {!cover && <p className="type-body text-state-warning">يمكنك المتابعة الآن وإضافة الصورة لاحقًا — لكن الإرسال للاعتماد يتطلبها.</p>}
      {state.status === "error" && state.message && <Alert tone="error" title={state.message} />}
      {state.status === "error" && !state.message && state.fieldErrors && <Alert tone="error" title="تحقّق من الحقول المظلّلة." />}
      <Button type="submit" name="intent" value="next" size="l" fullWidth loading={pending}>
        التالي · الأهداف والمحاور
      </Button>
      <Button type="submit" name="intent" value="later" variant="outline" size="l" fullWidth disabled={pending}>
        احفظ وأكمل لاحقًا
      </Button>
    </AsideCard>
  );

  return (
    <form ref={formRef} action={action} onChange={scheduleAutosave} className="flex flex-col gap-6" noValidate>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="skills" value={JSON.stringify(skills)} />
      <input type="hidden" name="coverPath" value={coverPath} />

      {!cover && !warnClosed && (
        <div role="alert" className="flex w-full items-start gap-3 rounded-12 border-[1.5px] border-state-warning bg-state-warning-bg px-4 py-3.5 text-state-warning">
          <Glyph icon={TriangleAlert} size={20} className="mt-1" />
          <div className="flex flex-1 flex-col gap-1">
            <p className="type-body">أضف صورة الغلاف قبل الإرسال للاعتماد</p>
            <p className="type-caption text-text-secondary">لا يمكن إرسال برنامج بلا صورة. الصورة أول ما يراه المتدرب، والبرامج بلا صور تحصل على تسجيلات أقل بكثير.</p>
          </div>
          <button type="button" onClick={() => setWarnClosed(true)} aria-label="إخفاء التنبيه" className="cursor-pointer rounded-8 text-text-secondary focus-ring">
            <Glyph icon={X} size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* MAIN */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section className="flex w-full flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="min-w-0 flex-1 type-h2 text-text-primary">صورة غلاف البرنامج</h2>
              <span className="inline-flex items-center gap-[7px] rounded-full bg-state-error-bg px-3.5 py-[9px] type-subtitle !font-normal text-state-error">
                <Glyph icon={CircleAlert} size={20} />
                إلزامية قبل النشر
              </span>
            </div>
            <p className="type-body-lg text-text-secondary">
              {cover
                ? "أول ما يراه المتدرب في نتائج البحث وفي صفحة البرنامج. الصورة الجيدة ترفع التسجيل كثيرًا."
                : "أول ما يراه المتدرب في نتائج البحث وفي صفحة البرنامج. ارفع صورة أو اختر من معرض المنصة."}
            </p>
            <div className="flex flex-col gap-5">
              {cover ? (
                <div className="relative flex h-[200px] w-full flex-col items-center justify-center overflow-hidden rounded-16 sm:h-[270px]">
                  <Image src={cover} alt="" fill sizes="(min-width: 1024px) 640px, 100vw" className="object-cover" />
                  <div aria-hidden className="absolute inset-0 bg-black/45" />
                  <div className="relative flex flex-col items-center gap-2 px-6 text-center text-text-on-brand">
                    <p className="type-h2">{title || "اسم البرنامج"}</p>
                    <p className="type-body">{[hoursNum > 0 ? hoursWord(hoursNum) : null, levelLabel ? `مستوى ${levelLabel}` : null].filter(Boolean).join(" · ")}</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-[200px] w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-16 border-2 border-dashed border-border-default bg-bg-page focus-ring sm:h-[235px]"
                >
                  <span className="flex size-[62px] items-center justify-center rounded-12 bg-bg-surface text-text-secondary">
                    <Glyph icon={ImagePlus} size={24} />
                  </span>
                  <span className="type-title text-text-secondary">{uploading ? "جارٍ رفع الصورة…" : "لم تُرفع صورة بعد"}</span>
                </button>
              )}
              <p className="flex items-center gap-2.5 rounded-12 bg-bg-page px-3.5 py-3 type-body text-text-secondary sm:min-h-[84px]">
                <Glyph icon={LayoutGrid} size={20} />
                المقاس ١٦:٩ · ١٦٠٠×٩٠٠ بكسل على الأقل · حتى ٥ م.ب
              </p>
              {uploadError && <Alert tone="error" title={uploadError} />}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                  e.target.value = "";
                }}
              />
              {cover ? (
                <>
                  <Button variant="outline" size="l" fullWidth loading={uploading} onClick={() => fileRef.current?.click()}>
                    استبدل الصورة
                  </Button>
                  <Button variant="ghost" size="l" fullWidth onClick={() => setGalleryOpen(true)}>
                    اختر من معرض المنصة
                  </Button>
                  <ul className="flex flex-col gap-3.5">
                    <Check ok>الصورة واضحة ومناسبة للموضوع</Check>
                    <Check ok>لا نص كثير على الصورة — العنوان يظهر فوقها تلقائيًا</Check>
                    <Check ok={false}>لا تستخدم صورًا لا تملك حقوقها — سبب شائع للرفض</Check>
                  </ul>
                </>
              ) : (
                <>
                  <Button size="l" fullWidth loading={uploading} onClick={() => fileRef.current?.click()}>
                    ارفع صورة من جهازك
                  </Button>
                  <Button variant="outline" size="l" fullWidth onClick={() => setGalleryOpen(true)}>
                    اختر من معرض المنصة
                  </Button>
                  <ul className="flex flex-col gap-3.5">
                    <Check ok>ليس لديك صورة؟ معرض المنصة فيه صور جاهزة ومجانية لكل تخصص</Check>
                    <Check ok>الصورة تُقتصّ تلقائيًا وتُعاين قبل الحفظ</Check>
                    <Check ok={false}>لا ترفع صورًا لا تملك حقوقها</Check>
                  </ul>
                </>
              )}
            </div>
          </section>

          <section className="flex w-full flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
            <h2 className="type-h2 text-text-primary">اسم البرنامج ووصفه</h2>
            <Input name="title" label="اسم البرنامج" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: بناء خطة مشروع من الصفر" error={fe.title} maxLength={200} />
            <Textarea name="summary" label="وصف البرنامج" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="اكتب ما سيحصل عليه المتدرب بعد البرنامج…" error={fe.summary} maxLength={2000} />
          </section>

          <section className="flex w-full flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
            <h2 className="type-h2 text-text-primary">التصنيف والمهارات</h2>
            <p className="type-body text-state-warning">إلزامي — عليه تُبنى المطابقة مع المتدربين وطلبات الجهات.</p>
            <Select
              name="categoryId"
              label="التصنيف الرئيسي"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              placeholder="اختر التصنيف"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              error={fe.categoryId}
            />
            <div className="flex flex-col gap-1">
              <p className="type-subtitle !font-normal text-text-primary">المهارات التي يكتسبها المتدرب</p>
              <p className="type-caption text-state-success">تُضاف تلقائيًا إلى ملف المتدرب بعد إكماله البرنامج — موثَّقة لا مُدخَلة.</p>
            </div>
            <ul className="flex flex-wrap gap-2.5">
              {skills.map((s) => (
                <li key={s} className="inline-flex h-9 items-center gap-2 rounded-full border-[1.5px] border-action-primary bg-bg-brand-tint ps-3.5 pe-2 type-small text-text-brand">
                  {s}
                  <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} aria-label={`احذف ${s}`} className="cursor-pointer rounded-full focus-ring">
                    <Glyph icon={X} size={20} />
                  </button>
                </li>
              ))}
              <li>
                {skillDraft === null ? (
                  <button type="button" onClick={() => setSkillDraft("")} className="inline-flex h-9 cursor-pointer items-center rounded-full border border-border-default bg-bg-surface px-3.5 type-small text-text-primary hover:bg-bg-brand-tint focus-ring">
                    + أضف مهارة
                  </button>
                ) : (
                  <span className="inline-flex h-9 items-center gap-1 rounded-full border-[1.5px] border-action-primary bg-bg-surface ps-3.5 pe-1.5">
                    <label htmlFor="skill-draft" className="sr-only">
                      مهارة جديدة
                    </label>
                    <input
                      id="skill-draft"
                      autoFocus
                      value={skillDraft}
                      maxLength={60}
                      onChange={(e) => setSkillDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                        if (e.key === "Escape") setSkillDraft(null);
                      }}
                      onBlur={addSkill}
                      placeholder="اكتب المهارة ثم Enter"
                      className="w-40 bg-transparent type-small text-text-primary outline-none"
                    />
                    <Glyph icon={Plus} size={16} className="text-text-brand" />
                  </span>
                )}
              </li>
            </ul>
            {fe.skills && <p className="type-caption text-state-error">{fe.skills}</p>}
          </section>

          <section className="flex w-full flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
            <h2 className="type-h2 text-text-primary">المستوى والمدة والمتطلبات</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select name="level" label="المستوى" value={level} onChange={(e) => setLevel(e.target.value as BasicsInitial["level"])} options={LEVELS} error={fe.level} />
              <Input name="hours" label="إجمالي الساعات" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} error={fe.hours} placeholder="مثال: ٢٤" />
            </div>
            <Select name="language" label="لغة التقديم" defaultValue={v("language", initial.language)} options={LANGUAGES} error={fe.language} />
            <Textarea name="prerequisites" label="المتطلبات المسبقة" rows={3} defaultValue={v("prerequisites", initial.prerequisites)} error={fe.prerequisites} maxLength={1500} placeholder="مثال: خبرة سنة على الأقل في بيئة مشاريع." />
          </section>
        </div>

        {/* ASIDE */}
        <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
          {cover ? (
            <>
              <AsideCard title="معاينة البطاقة">
                <p className="type-body text-text-muted">هكذا يظهر برنامجك في نتائج البحث:</p>
                <CourseCard
                  hideMode
                  course={{
                    id: initial.id ?? "new",
                    slug: "",
                    title: title || "اسم البرنامج",
                    category: categoryName,
                    mode: "recorded",
                    cover: { src: cover, crop: null },
                    source: { kind: "independent", name: trainerName },
                    status: null,
                    href: initial.id ? `/trainer/programs/${initial.id}/visibility` : "#",
                    cta: "اعرض التفاصيل",
                    variant: "catalog",
                    rating: 0,
                    ratingCount: 0,
                    durationHours: hoursNum > 0 ? hoursNum : null,
                    level: level as BasicsInitial["level"],
                    learners: 0,
                    price: initial.price ?? 0,
                    currency: "SAR",
                  }}
                  delivery={
                    <ul className="flex w-full flex-wrap items-center gap-x-3.5 gap-y-2 text-text-secondary">
                      <li className="flex items-center gap-1.5 type-caption">
                        <Glyph icon={MapPin} size={16} />
                        الموقع — غير متاح
                      </li>
                      <li className="flex items-center gap-1.5 type-caption">
                        <Glyph icon={Armchair} size={16} />
                        المقاعد — غير متاحة
                      </li>
                      <li className="flex items-center gap-1.5 type-caption">
                        <Glyph icon={CalendarDays} size={16} />
                        التواريخ — غير متاحة
                      </li>
                    </ul>
                  }
                />
                <p className="type-caption text-state-warning">البطاقة بلا صورة تحصل على نقرات أقل بكثير.</p>
              </AsideCard>
              <AsideCard title="نصيحة للاسم والوصف">
                <ul className="flex flex-col gap-3">
                  {[
                    { ok: true, t: "اذكر النتيجة لا الموضوع", d: "«بناء خطة مخاطر» أوضح من «مقدمة في المخاطر»." },
                    { ok: true, t: "حدّد الجمهور في الوصف", d: "«لمن يعمل في مشاريع فعلية» يجذب المناسب ويصرف غيره." },
                    { ok: false, t: "تجنّب المبالغة", d: "«الأقوى» و«الأشمل» تثير بلاغات وصف مضلّل." },
                  ].map((tip) => (
                    <li key={tip.t} className={`flex items-start gap-3 rounded-12 px-3.5 py-[13px] ${tip.ok ? "bg-state-success-bg" : "bg-state-error-bg"}`}>
                      <Glyph icon={tip.ok ? CircleCheck : CircleX} size={20} className={tip.ok ? "text-state-success" : "text-state-error"} />
                      <span className="flex flex-col gap-0.5">
                        <span className={`text-[16px] leading-[1.5] ${tip.ok ? "text-state-success" : "text-state-error"}`}>{tip.t}</span>
                        <span className="type-caption text-text-muted">{tip.d}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </AsideCard>
            </>
          ) : (
            <AsideCard title="معرض المنصة">
              <p className="type-body text-text-secondary">صور جاهزة ومجانية مصنَّفة حسب التخصص — تكفي لبدء برنامجك.</p>
              <ul className="grid grid-cols-2 gap-2.5">
                {GALLERY.slice(0, 4).map((g) => (
                  <li key={g}>
                    <button type="button" onClick={() => setCoverPath(g)} aria-label="استخدم هذه الصورة غلافًا" className="relative block h-20 w-full cursor-pointer overflow-hidden rounded-8 focus-ring">
                      <Image src={g} alt="" fill sizes="160px" className="object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button variant="outline" fullWidth onClick={() => setGalleryOpen(true)}>
                تصفّح المعرض كاملًا
              </Button>
            </AsideCard>
          )}
          {followCard}
        </aside>
      </div>

      <Modal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        title="معرض المنصة"
        size="l"
        footer={
          <Button variant="outline" onClick={() => setGalleryOpen(false)}>
            إغلاق
          </Button>
        }
      >
        <p className="mb-4">صور جاهزة ومجانية مصنَّفة حسب التخصص — تكفي لبدء برنامجك.</p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {GALLERY.map((g) => (
            <li key={g}>
              <button
                type="button"
                onClick={() => {
                  setCoverPath(g);
                  setGalleryOpen(false);
                }}
                aria-pressed={coverPath === g}
                aria-label="استخدم هذه الصورة غلافًا"
                className={`relative block aspect-video w-full cursor-pointer overflow-hidden rounded-12 focus-ring ${coverPath === g ? "ring-2 ring-action-primary" : ""}`}
              >
                <Image src={g} alt="" fill sizes="220px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </form>
  );
}
