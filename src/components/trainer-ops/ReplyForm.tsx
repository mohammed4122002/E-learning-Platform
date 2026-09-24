"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleAlert, CircleCheck, Info, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { Avatar } from "@/components/ui/Data";
import { Glyph } from "@/components/ui/Icon";
import { RatingStars } from "@/components/ui/Rating";
import { useToast } from "@/components/ui/Toast";
import { saveRatingReply } from "@/lib/actions/trainer-ops";
import { ReplyBox } from "./Ratings";

/*
 * TRR-RTG-02 · الرد على تقييم (291:8261): style templates, the reply text with a live checklist, the public preview and
 * «إرسال الرد» (final publish / draft / no reply).
 */

type Style = "clarify" | "thanks" | "fix";
const STYLES: { key: Style; icon: LucideIcon; title: string; hint: string }[] = [
  { key: "clarify", icon: Info, title: "أوضّح سوء فهم", hint: "الأنسب لمعلومة غير دقيقة" },
  { key: "thanks", icon: MessagesSquare, title: "أشكر فقط", hint: "الأنسب للتقييم الإيجابي" },
  { key: "fix", icon: CircleCheck, title: "أشكر وأوضّح ما عالجته", hint: "الأنسب لنقد صحيح" },
];

const template = (style: Style, first: string) =>
  style === "clarify"
    ? `شكرًا لك ${first} على تقييمك ووقتك. أودّ توضيح أن [اكتب المعلومة الصحيحة]. يسعدني تواصلك إن كان لديك أي استفسار.`
    : style === "thanks"
      ? `شكرًا لك ${first} على كلماتك الطيبة، سعدت بوجودك في الدورة وأتمنى لك التوفيق.`
      : `شكرًا لك ${first} على الملاحظة الصريحة. لاحظت المشكلة نفسها، و[اذكر الإجراء الذي اتخذته]. أقدّر وقتك في كتابة هذا.`;

function checks(body: string, first: string) {
  const t = body.trim();
  return [
    { ok: /شكر/.test(t) && t.includes(first), label: "شكرت المتدرب باسمه" },
    { ok: /(ملاحظ|محق|صحيح|لاحظت|أتفق|معك حق)/.test(t), label: "اعترفت بالملاحظة بدل إنكارها" },
    { ok: /(زدت|أضفت|غيّرت|غيرت|عدّلت|عدلت|نقلت|خصّصت|خصصت|سأ|[0-9٠-٩])/.test(t) && !t.includes("["), label: "ذكرت إجراءً محددًا اتخذته" },
    { ok: t.length > 0 && !/(لكنك|غير صحيح|لم تحضر|أنت مخطئ|ادعاء|تتهم)/.test(t), label: "لم تجادل ولم تدافع" },
  ];
}

export function ReplyForm({
  ratingId,
  traineeName,
  score,
  comment,
  replyAuthor,
  draft,
  skipped,
  rated,
  sideAfter,
}: {
  ratingId: string;
  traineeName: string;
  score: number;
  comment: string | null;
  replyAuthor: string;
  draft: string | null;
  skipped: boolean;
  /** «التقييم الذي تردّ عليه» (server rendered). */
  rated: ReactNode;
  /** «كيف تردّ باحتراف؟» and «التقييم مخالف للشروط؟». */
  sideAfter: ReactNode;
}) {
  const first = traineeName.split(" ")[0] ?? traineeName;
  const initialStyle: Style = score >= 4.5 ? "thanks" : "fix";
  const [style, setStyle] = useState<Style | null>(draft ? null : initialStyle);
  const [body, setBody] = useState(draft ?? template(initialStyle, first));
  const [final, setFinal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"publish" | "draft" | "skip" | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const list = checks(body, first);
  const allOk = list.every((c) => c.ok);
  const placeholder = body.includes("[");
  const canPublish = final && body.trim().length >= 10 && !placeholder;

  const send = (action: "publish" | "draft" | "skip") => {
    setError(null);
    setBusy(action);
    start(async () => {
      const res = await saveRatingReply({ ratingId, body, action });
      setBusy(null);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      if (action === "publish") {
        router.replace(`/trainer/ratings/${ratingId}/reply?published=1`, { scroll: false });
        router.refresh();
      } else if (action === "draft") {
        toast("success", "حُفظت المسودة — لم يُنشر شيء بعد.");
        router.refresh();
      } else {
        toast("info", "لن تردّ على هذا التقييم. يمكنك الرد لاحقًا ما لم يُنشر رد.");
        router.push("/trainer/ratings");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {rated}
        <section aria-labelledby="reply-title" className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
          <h2 id="reply-title" className="type-h2 text-text-primary">
            ردّك
          </h2>
          <div className="flex items-start gap-3 rounded-16 border-2 border-state-warning bg-state-warning-bg px-4 py-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-warning">
              <Glyph icon={CircleAlert} size={20} />
            </span>
            <div className="flex flex-col gap-1">
              <span className="type-subtitle font-bold! text-state-warning">قبل أن ترسل – اقرأ هذا</span>
              <span className="type-body text-text-secondary">لك ردّ واحد فقط على كل تقييم، ولا يمكن تعديله أو حذفه بعد الإرسال. يظهر علنًا تحت التقييم لكل من يزور ملفك.</span>
            </div>
          </div>
          {skipped && <p className="rounded-12 bg-state-info-bg px-4 py-3 type-small text-state-info">اخترت سابقًا عدم الرد على هذا التقييم — يمكنك الرد الآن إن أردت.</p>}
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 type-small text-text-primary">اختر أسلوبًا للبدء – ثم عدّله بحرية</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {STYLES.map((s) => {
                const on = style === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setStyle(s.key);
                      setBody(template(s.key, first));
                    }}
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-16 border-[1.5px] px-3 py-4 text-center transition-colors focus-ring ${
                      on ? "border-action-primary bg-bg-brand-tint" : "border-border-default bg-bg-page hover:bg-bg-brand-tint"
                    }`}
                  >
                    <span className={`flex size-10 items-center justify-center rounded-12 ${on ? "bg-action-primary text-text-on-brand" : "bg-bg-surface text-text-brand"}`}>
                      <Glyph icon={s.icon} size={20} />
                    </span>
                    <span className={`type-subtitle ${on ? "text-text-brand" : "text-text-primary"}`}>{s.title}</span>
                    <span className="type-caption text-text-muted">{s.hint}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <label htmlFor="reply-body" className="flex flex-col gap-2">
            <span className="type-small text-text-secondary">نص الرد</span>
            <textarea
              id="reply-body"
              rows={4}
              maxLength={1500}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-28 w-full resize-y rounded-12 border-[1.5px] border-border-default bg-bg-surface px-4 py-3 type-body text-text-primary outline-none focus:border-2 focus:border-action-primary"
            />
          </label>
          <div className={`flex flex-col gap-3 rounded-16 px-4 py-4 ${allOk ? "bg-state-success-bg" : "bg-state-warning-bg"}`} aria-live="polite">
            <span className={`type-small font-bold ${allOk ? "text-state-success" : "text-state-warning"}`}>{allOk ? "ردّك يبدو جيدًا" : "راجع ردّك قبل الإرسال"}</span>
            <ul className="flex flex-col gap-2.5">
              {list.map((c) => (
                <li key={c.label} className="flex items-center gap-2 type-body text-text-secondary">
                  <Glyph icon={c.ok ? CircleCheck : CircleAlert} size={20} className={c.ok ? "text-state-success" : "text-state-warning"} />
                  {c.label}
                </li>
              ))}
            </ul>
            {placeholder && <p className="type-caption text-state-warning">أكمل ما بين القوسين [ ] قبل الإرسال.</p>}
          </div>
        </section>
        <section aria-labelledby="preview-title" className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
          <h2 id="preview-title" className="type-h2 text-text-primary">
            معاينة – هكذا سيظهر في ملفك العام
          </h2>
          <div className="flex flex-col gap-3 rounded-16 border border-border-default bg-bg-card px-4 py-4">
            <div className="flex items-center gap-3">
              <Avatar name={traineeName} size="m" />
              <span className="min-w-0 flex-1 type-subtitle text-text-primary">{traineeName}</span>
              <RatingStars value={score} />
            </div>
            {comment && <p className="type-body text-text-secondary">{comment}</p>}
            {body.trim() && <ReplyBox author={`ردّ ${replyAuthor}`} body={body.trim()} />}
          </div>
        </section>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[330px]">
        <section aria-labelledby="send-title" className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
          <h2 id="send-title" className="type-h2 text-text-primary">
            إرسال الرد
          </h2>
          <Checkbox checked={final} onChange={(e) => setFinal(e.currentTarget.checked)}>
            أفهم أن الرد نهائي ولا يمكن تعديله
          </Checkbox>
          {error && (
            <p role="alert" className="type-small text-state-error">
              {error}
            </p>
          )}
          <Button size="l" fullWidth disabled={!canPublish || pending} loading={busy === "publish"} onClick={() => send("publish")}>
            أرسل الرد نهائيًا
          </Button>
          <Button variant="outline" size="l" fullWidth disabled={pending || !body.trim()} loading={busy === "draft"} onClick={() => send("draft")}>
            احفظ كمسودة
          </Button>
          <Button variant="text" size="m" fullWidth disabled={pending} loading={busy === "skip"} onClick={() => send("skip")}>
            لا أريد الرد على هذا التقييم
          </Button>
          <p className="type-caption text-text-muted">عدم الرد خيار مقبول. بعض التقييمات لا تحتاج ردًّا.</p>
        </section>
        {sideAfter}
      </div>
    </div>
  );
}
