"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { BookMarked, BookOpen, FileText, Info, LoaderCircle, OctagonX, SquarePen, Trash2, Tv, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Input, Select } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { initialFormState, type FormState } from "@/lib/validation/auth";
import { formatMonthYear, pluralAr, toArabicDigits } from "@/lib/format";
import { attachPortfolioImages, deletePortfolioItem, savePortfolioItem } from "@/app/(trainer)/trainer/profile/actions";
import type { PortfolioItem } from "@/lib/data/trainer-profile";

/* TRR-PRF-03 · معرض الأعمال — empty (464:34920), default (464:35114), saving (464:35384), error (464:35658). */

const KIND: Record<PortfolioItem["kind"], { icon: LucideIcon; tone: string; label: string }> = {
  delivered: { icon: Tv, tone: "text-state-success", label: "ورشة أو دورة نفّذتها" },
  material: { icon: FileText, tone: "text-state-info", label: "مادة تدريبية أعددتها" },
  program: { icon: BookOpen, tone: "text-state-success", label: "برنامج بنيته لجهة" },
};

const worksWord = (n: number) => pluralAr(n, ["عمل واحد", "عملان", "أعمال", "عملًا"]);
/** Object of «رفع» (464:35658 «فشل رفع صورتين من ثلاث»): accusative dual, small totals spelled out. */
const imagesWord = (n: number) => (n === 2 ? "صورتين" : pluralAr(n, ["صورة واحدة", "صورتان", "صور", "صورة"]));
const TOTAL_FEM = ["", "واحدة", "اثنتين", "ثلاث", "أربع", "خمس", "ست", "سبع", "ثماني", "تسع", "عشر"];
const ofTotal = (n: number) => (n >= 1 && n <= 10 ? TOTAL_FEM[n] : toArabicDigits(n));

export function itemMeta(i: PortfolioItem): string {
  if (i.kind === "material") return [i.fileFormat, i.pageCount ? `${toArabicDigits(i.pageCount)} صفحة` : null].filter(Boolean).join(" · ");
  if (i.kind === "program")
    return [i.coursesCount ? pluralAr(i.coursesCount, ["دورة واحدة", "دورتان", "دورات", "دورة"]) : null, i.traineesCount ? pluralAr(i.traineesCount, ["متدرب واحد", "متدربان", "متدربين", "متدربًا"]) : null]
      .filter(Boolean)
      .join(" · ");
  return [
    i.durationDays ? pluralAr(i.durationDays, ["يوم واحد", "يومان", "أيام", "يومًا"]) : null,
    i.traineesCount ? pluralAr(i.traineesCount, ["متدرب واحد", "متدربان", "متدربين", "متدربًا"]) : null,
    i.happenedOn ? formatMonthYear(`${i.happenedOn}T12:00:00+03:00`) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

type Upload = { itemId: string; title: string; files: File[]; done: number; failed: File[]; phase: "uploading" | "failed" };

function ItemForm({ initial, onSaved, onCancel }: { initial: PortfolioItem | null; onSaved: (id: string, title: string, files: File[]) => void; onCancel: () => void }) {
  const [state, action, pending] = useActionState(savePortfolioItem, initialFormState as FormState & { id?: string });
  const [kind, setKind] = useState<PortfolioItem["kind"]>(initial?.kind ?? "delivered");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const done = useRef(false);
  useEffect(() => {
    if (state.status === "success" && state.id && !done.current) {
      done.current = true;
      onSaved(state.id, title, files);
    }
  }, [state, onSaved, files, title]);
  const v = state.values ?? {};
  const month = initial?.happenedOn?.slice(0, 7) ?? "";
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={initial?.id ?? ""} />
      {state.message && state.status === "error" && <Alert tone="error" title={state.message} />}
      <Select
        name="kind"
        label="نوع العمل"
        value={kind}
        onChange={(e) => setKind(e.target.value as PortfolioItem["kind"])}
        options={(Object.keys(KIND) as PortfolioItem["kind"][]).map((k) => ({ value: k, label: KIND[k].label }))}
        error={state.fieldErrors?.kind}
      />
      <Input name="title" label="عنوان العمل" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} required error={state.fieldErrors?.title} placeholder="مثال: ورشة إدارة المخاطر" />
      <Input name="organization" label="الجهة (اختياري)" defaultValue={v.organization ?? initial?.organization ?? ""} maxLength={120} error={state.fieldErrors?.organization} placeholder="مثال: شركة الأفق" />
      {kind === "delivered" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Input name="durationDays" label="المدة بالأيام" inputMode="numeric" dir="ltr" defaultValue={v.durationDays ?? (initial?.durationDays ? String(initial.durationDays) : "")} error={state.fieldErrors?.durationDays} />
          <Input name="traineesCount" label="عدد المتدربين" inputMode="numeric" dir="ltr" defaultValue={v.traineesCount ?? (initial?.traineesCount ? String(initial.traineesCount) : "")} error={state.fieldErrors?.traineesCount} />
          <Input name="happenedOn" type="month" label="الشهر" defaultValue={v.happenedOn ?? month} error={state.fieldErrors?.happenedOn} />
        </div>
      )}
      {kind === "material" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="fileFormat" label="الصيغة" defaultValue={v.fileFormat ?? initial?.fileFormat ?? "PDF"} maxLength={12} dir="ltr" error={state.fieldErrors?.fileFormat} />
          <Input name="pageCount" label="عدد الصفحات" inputMode="numeric" dir="ltr" defaultValue={v.pageCount ?? (initial?.pageCount ? String(initial.pageCount) : "")} error={state.fieldErrors?.pageCount} />
        </div>
      )}
      {kind === "program" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="coursesCount" label="عدد الدورات" inputMode="numeric" dir="ltr" defaultValue={v.coursesCount ?? (initial?.coursesCount ? String(initial.coursesCount) : "")} error={state.fieldErrors?.coursesCount} />
          <Input name="traineesCount" label="عدد المتدربين" inputMode="numeric" dir="ltr" defaultValue={v.traineesCount ?? (initial?.traineesCount ? String(initial.traineesCount) : "")} error={state.fieldErrors?.traineesCount} />
        </div>
      )}
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-16 border-[1.5px] border-dashed border-border-default bg-bg-page p-5 text-center focus-within:border-action-primary">
        <Glyph icon={Upload} size={24} className="text-text-brand" />
        <span className="type-subtitle text-text-brand">{files.length ? `اخترت ${imagesWord(files.length)}` : "أضف صورًا من العمل (اختياري)"}</span>
        <span className="type-caption text-text-muted">حتى ٦ صور · JPG أو PNG أو WEBP أو PDF · ١٠ م.ب لكل ملف · لا ترفع مواد لا تملك حقوقها</span>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            const bad = list.find((f) => !/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(f.type) || f.size > 10 * 1024 * 1024);
            if (bad) setFileError(`الملف «${bad.name}» غير مدعوم أو أكبر من ١٠ م.ب.`);
            else if (list.length + (initial?.imagePaths.length ?? 0) > 6) setFileError("يمكن إرفاق ٦ ملفات كحد أقصى لكل عمل.");
            else {
              setFileError(null);
              setFiles(list);
            }
          }}
        />
      </label>
      {fileError && <p className="type-caption text-state-error" role="alert">{fileError}</p>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit" loading={pending}>
          {initial ? "احفظ التعديل" : "أضف العمل"}
        </Button>
      </div>
    </form>
  );
}

export function PortfolioManager({ userId, items }: { userId: string; items: PortfolioItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<PortfolioItem | "new" | null>(null);
  const [confirm, setConfirm] = useState<PortfolioItem | null>(null);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [bannerOpen, setBannerOpen] = useState(true);
  const [pending, start] = useTransition();

  const runUpload = async (u: Upload, files: File[]) => {
    setBannerOpen(true);
    setUpload({ ...u, files, done: 0, failed: [], phase: "uploading" });
    const client = createClient();
    const uploaded: string[] = [];
    const failed: File[] = [];
    for (const f of files) {
      const ext = f.type === "application/pdf" ? "pdf" : f.type.split("/")[1].replace("jpeg", "jpg");
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await client.storage.from("trainer-media").upload(path, f, { contentType: f.type });
      if (error) failed.push(f);
      else uploaded.push(path);
      setUpload((cur) => (cur ? { ...cur, done: cur.done + 1 } : cur));
    }
    if (uploaded.length) await attachPortfolioImages(u.itemId, uploaded);
    if (failed.length) {
      setUpload({ ...u, files, done: files.length, failed, phase: "failed" });
    } else {
      setUpload(null);
      toast("success", "حُفظ العمل في معرضك.");
    }
    router.refresh();
  };

  const onSaved = (id: string, title: string, files: File[]) => {
    setEditing(null);
    if (files.length) void runUpload({ itemId: id, title, files, done: 0, failed: [], phase: "uploading" }, files);
    else {
      toast("success", "حُفظ العمل في معرضك.");
      router.refresh();
    }
  };

  const total = items.length;
  const progress = upload ? Math.round((upload.done / Math.max(1, upload.files.length)) * 100) : 0;
  const visible = upload ? items.filter((i) => i.id !== upload.itemId) : items;
  const empty = total === 0 && !upload;

  return (
    <div className="flex flex-col gap-6">
      {upload && bannerOpen && (
        <div
          role={upload.phase === "failed" ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-12 border-[1.5px] px-4 py-3.5 ${upload.phase === "failed" ? "border-state-error bg-state-error-bg" : "border-state-info bg-state-info-bg"}`}
        >
          <Glyph icon={upload.phase === "failed" ? OctagonX : Info} size={20} className={`mt-1 ${upload.phase === "failed" ? "text-state-error" : "text-state-info"}`} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className={`type-body ${upload.phase === "failed" ? "text-state-error" : "text-state-info"}`}>{upload.phase === "failed" ? "تعذّر حفظ العمل" : "جارٍ حفظ العمل الجديد"}</p>
            <p className="type-small text-text-secondary">
              {upload.phase === "failed"
                ? `فشل رفع ${imagesWord(upload.failed.length)} من ${ofTotal(upload.files.length)} بسبب انقطاع الاتصال. باقي أعمالك محفوظة ولم تتأثر.`
                : "نرفع الصور ونحدّث ملفك — لا تغلق الصفحة."}
            </p>
          </div>
          <button type="button" aria-label="إغلاق التنبيه" onClick={() => setBannerOpen(false)} className="flex size-8 cursor-pointer items-center justify-center rounded-8 text-text-muted focus-ring">
            <Glyph icon={X} size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">معرض أعمالك</h2>
          <p className="type-body-lg text-text-secondary">الجهات تنظر إليه قبل قبول عرضك — أعمال حقيقية أقوى من وصف طويل.</p>
        </div>
        {!empty && (
          <Button size="l" onClick={() => setEditing("new")} disabled={upload?.phase === "uploading"} className="w-full sm:w-[120px]">
            أضف عملًا
          </Button>
        )}
      </div>

      {empty ? (
        <section className="flex flex-col items-center gap-[18px] rounded-22 bg-bg-brand-tint px-6 pt-14 pb-[58px] text-center sm:px-12">
          <span className="flex size-24 items-center justify-center rounded-22 bg-bg-surface text-text-brand">
            <Glyph icon={BookMarked} size={32} />
          </span>
          <h3 className="text-[30px] leading-[1.15] font-bold text-text-primary sm:text-[38px]">لا أعمال في معرضك بعد</h3>
          <p className="type-h3 text-text-secondary">أضف ورشة نفّذتها أو مادة تدريبية أعددتها. المدربون الذين لديهم ٣ أعمال فأكثر تُقبل عروضهم بنسبة أعلى.</p>
          <div className="flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="l" onClick={() => setEditing("new")} className="w-full sm:w-[280px]">
              أضف أول عمل
            </Button>
            <a href="#what-counts" className="inline-flex h-14 w-full items-center justify-center rounded-12 px-8 type-body-lg text-text-primary inner-stroke istroke-w-[1.5px] istroke-c-border-default hover:bg-bg-surface focus-ring sm:w-[240px]">
              ما الذي يصلح كعمل؟
            </a>
          </div>
        </section>
      ) : (
        <section aria-labelledby="works-title" className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
          <div className="flex items-center gap-3">
            <h3 id="works-title" className="min-w-0 flex-1 type-h2 text-text-primary">
              أعمالك
            </h3>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-brand-tint px-3 py-1.5 type-subtitle text-text-brand">
              <Glyph icon={BookMarked} size={20} />
              {upload?.phase === "uploading" ? `${worksWord(visible.length)} · جارٍ إضافة ${visible.length === 3 ? "رابع" : "عمل جديد"}` : worksWord(total)}
            </span>
          </div>
          <ul className="flex flex-col gap-5">
            {visible.map((i) => {
              const k = KIND[i.kind];
              return (
                <li key={i.id} className="flex items-center gap-4 rounded-16 bg-bg-page px-5 py-5">
                  <span className={`flex size-[52px] shrink-0 items-center justify-center rounded-12 bg-bg-surface ${k.tone}`}>
                    <Glyph icon={k.icon} size={24} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="type-title text-text-primary">
                      {i.title}
                      {i.organization ? ` – ${i.organization}` : ""}
                    </span>
                    <span className="type-body text-text-muted">{itemMeta(i) || k.label}</span>
                  </span>
                  <button type="button" aria-label={`عدّل ${i.title}`} onClick={() => setEditing(i)} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-8 bg-bg-surface text-text-secondary hover:bg-bg-brand-tint focus-ring">
                    <Glyph icon={SquarePen} size={20} />
                  </button>
                  <button type="button" aria-label={`احذف ${i.title}`} onClick={() => setConfirm(i)} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-8 bg-bg-surface text-state-error hover:bg-state-error-bg focus-ring">
                    <Glyph icon={Trash2} size={20} />
                  </button>
                </li>
              );
            })}
            {upload && (
              <li className={`flex flex-wrap items-center gap-4 rounded-16 px-5 py-5 ${upload.phase === "failed" ? "bg-state-error-bg" : "bg-state-warning-bg"}`}>
                <span className={`flex size-[52px] shrink-0 items-center justify-center rounded-12 bg-bg-surface ${upload.phase === "failed" ? "text-state-error" : "text-state-warning"}`}>
                  <Glyph icon={upload.phase === "failed" ? OctagonX : LoaderCircle} size={24} className={upload.phase === "failed" ? "" : "animate-[tg-spin_1.2s_linear_infinite]"} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="type-title text-text-primary">
                    {upload.title} – {upload.phase === "failed" ? "فشل الرفع" : "قيد الرفع"}
                  </span>
                  <span className={`type-body ${upload.phase === "failed" ? "text-state-error" : "text-state-warning"}`}>
                    {upload.phase === "failed" ? `فشل رفع ${imagesWord(upload.failed.length)} من ${ofTotal(upload.files.length)}` : `جارٍ رفع ${imagesWord(upload.files.length)} · ${toArabicDigits(progress)}٪`}
                  </span>
                </span>
                {upload.phase === "failed" && (
                  <Button onClick={() => runUpload(upload, upload.failed)} className="w-full sm:w-[120px]">
                    أعد الرفع
                  </Button>
                )}
              </li>
            )}
          </ul>
        </section>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "أضف عملًا إلى معرضك" : "عدّل العمل"} size="l">
        {editing !== null && <ItemForm key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? null : editing} onSaved={onSaved} onCancel={() => setEditing(null)} />}
      </Modal>
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        destructive
        size="s"
        title="حذف العمل؟"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              تراجع
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const res = await deletePortfolioItem(confirm!.id);
                  toast(res.ok ? "success" : "error", res.message);
                  setConfirm(null);
                  router.refresh();
                })
              }
            >
              احذف
            </Button>
          </>
        }
      >
        سيختفي «{confirm?.title}» وصوره من معرضك وملفك العام.
      </Modal>
    </div>
  );
}
