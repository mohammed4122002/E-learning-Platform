"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, CircleCheck, FileText, LoaderCircle, Paperclip, SendHorizontal, X } from "lucide-react";
import { Avatar } from "@/components/ui/Data";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatTime, toArabicDigits } from "@/lib/format";
import { initialFormState } from "@/lib/validation/auth";
import { markConversationRead, sendMessage } from "@/app/(workspace)/messages/actions";
import type { ConversationDetail } from "@/lib/data/messages";

const ATTACH_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const ATTACH_MAX = 10 * 1024 * 1024;
const riyadhDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date(iso));

function dayLabel(iso: string, today: string, yesterday: string) {
  const d = riyadhDay(iso);
  if (d === today) return "اليوم";
  if (d === yesterday) return "أمس";
  return formatDate(iso);
}

/** GEN-MSG-01 (panel) / GEN-MSG-02 (thread): header, day-grouped bubbles, attachments and the composer. */
export function Thread({ c, variant, now }: { c: ConversationDetail; variant: "panel" | "page"; now: string }) {
  const [state, action, pending] = useActionState(sendMessage, initialFormState);
  const [attachment, setAttachment] = useState<{ path: string; name: string } | { uploading: string } | { error: string } | null>(null);
  const [body, setBody] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const last = c.messages[c.messages.length - 1]?.id;

  useEffect(() => {
    void markConversationRead(c.id);
  }, [c.id, last]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [last]);

  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.status === "success") {
      setBody("");
      setAttachment(null);
    }
  }
  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [state, router]);

  const today = riyadhDay(now);
  const yesterday = riyadhDay(new Date(new Date(now).getTime() - 86400000).toISOString());

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!ATTACH_TYPES.includes(file.type)) return setAttachment({ error: "الصيغة غير مدعومة — PDF أو صور أو Word/Excel." });
    if (file.size > ATTACH_MAX) return setAttachment({ error: "المرفق أكبر من ١٠ م.ب." });
    setAttachment({ uploading: file.name });
    const safe = file.name.replace(/[^\w.\-؀-ۿ]+/g, "_").slice(-80) || "file";
    const path = `${c.id}/${crypto.randomUUID()}-${safe}`;
    const { error } = await createClient().storage.from("message-attachments").upload(path, file, { contentType: file.type, upsert: false });
    if (error) return setAttachment({ error: "تعذّر رفع المرفق. أعد المحاولة." });
    setAttachment({ path, name: file.name });
    if (!body.trim()) setBody(`مرفق: ${file.name}`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border-divider bg-bg-page px-5 py-4">
        <Avatar name={c.name} src={c.avatarUrl} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className={`${variant === "page" ? "type-title" : "type-subtitle"} truncate text-text-primary`}>
            {variant === "panel" ? (
              <Link href={`/messages/${c.id}`} className="rounded-8 hover:underline focus-ring">
                {c.name}
              </Link>
            ) : (
              c.name
            )}
          </p>
          <p className="truncate type-caption text-text-muted">
            بخصوص: {c.course?.title ?? c.subject}
            {c.muted && " · مكتومة"}
          </p>
        </div>
        {c.verifiedOrg && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-state-success-bg px-2.5 py-[3px] type-caption text-state-success">
            <Glyph icon={CircleCheck} size={16} />
            جهة موثَّقة
          </span>
        )}
        {variant === "panel" && c.course && (
          <ButtonLink href={`/courses/${c.course.slug}`} variant="outline" size="s">
            اعرض البرنامج
          </ButtonLink>
        )}
      </header>

      <ol ref={listRef} aria-label="الرسائل" aria-live="polite" className="flex min-h-[280px] flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        {c.messages.map((m, i) => {
          const sep = i === 0 || riyadhDay(c.messages[i - 1].createdAt) !== riyadhDay(m.createdAt);
          return (
            <li key={m.id} className="flex flex-col gap-4">
              {sep && (
                <span className="self-center rounded-full border border-border-divider bg-bg-page px-3 py-1 type-caption text-text-muted">{dayLabel(m.createdAt, today, yesterday)}</span>
              )}
              <div
                className={`flex max-w-[85%] flex-col gap-2 rounded-16 px-4 py-3 sm:max-w-[440px] ${
                  m.mine ? "self-start bg-action-primary text-text-on-brand" : "self-end border border-border-default bg-bg-page text-text-primary"
                }`}
              >
                {!m.mine && <span className="sr-only">{m.senderName}:</span>}
                <p className="whitespace-pre-line type-body">{m.body}</p>
                {m.attachment && (
                  <div className={`flex items-center gap-3 rounded-12 px-3 py-2.5 ${m.mine ? "bg-text-on-brand/15" : "bg-bg-surface"}`}>
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-8 ${m.mine ? "bg-text-on-brand/20" : "bg-state-error-bg text-state-error"}`}>
                      <Glyph icon={FileText} size={20} />
                    </span>
                    <span dir="auto" className="min-w-0 flex-1 truncate type-small">
                      {m.attachment.name}
                    </span>
                    {m.attachment.url && (
                      <a
                        href={m.attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex h-9 shrink-0 items-center rounded-12 px-4 type-small focus-ring ${m.mine ? "bg-text-on-brand/20" : "border-[1.5px] border-border-default"}`}
                      >
                        تنزيل
                      </a>
                    )}
                  </div>
                )}
                <span className={`flex items-center gap-1.5 type-caption ${m.mine ? "text-text-on-brand/80" : "text-text-muted"}`}>
                  {dayLabel(m.createdAt, today, yesterday)} · {formatTime(m.createdAt)}
                  {m.mine && (
                    <>
                      <Glyph icon={CheckCheck} size={16} />
                      <span className="sr-only">{m.readByOthers ? "مقروءة" : "أُرسلت"}</span>
                    </>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <form ref={formRef} action={action} className="flex flex-col gap-2 border-t border-border-divider bg-bg-page px-5 py-4">
        <input type="hidden" name="conversationId" value={c.id} />
        <input type="hidden" name="attachmentPath" value={attachment && "path" in attachment ? attachment.path : ""} />
        {state.status === "error" && (state.message || state.fieldErrors?.body) && (
          <p role="alert" className="type-caption text-state-error">
            {state.message ?? state.fieldErrors?.body}
          </p>
        )}
        {attachment && (
          <div className="flex items-center gap-2 type-caption">
            {"uploading" in attachment ? (
              <span className="flex items-center gap-2 text-text-muted">
                <Glyph icon={LoaderCircle} size={16} className="animate-[tg-spin_0.9s_linear_infinite]" /> جارٍ رفع {attachment.uploading}
              </span>
            ) : "error" in attachment ? (
              <span role="alert" className="text-state-error">
                {attachment.error}
              </span>
            ) : (
              <span className="flex items-center gap-2 rounded-full bg-bg-surface px-3 py-1 text-text-primary">
                <Glyph icon={Paperclip} size={16} />
                <span dir="auto">{attachment.name}</span>
              </span>
            )}
            <button type="button" aria-label="إزالة المرفق" onClick={() => setAttachment(null)} className="cursor-pointer rounded-8 p-1 text-text-muted focus-ring">
              <Glyph icon={X} size={16} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <label htmlFor={`msg-${c.id}`} className="sr-only">
            اكتب رسالتك
          </label>
          <textarea
            id={`msg-${c.id}`}
            name="body"
            rows={1}
            required
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (body.trim()) formRef.current?.requestSubmit();
              }
            }}
            placeholder="اكتب رسالتك..."
            className="max-h-40 min-h-12 flex-1 resize-none rounded-12 border-[1.5px] border-border-default bg-bg-surface px-4 py-2.5 type-body text-text-primary outline-none placeholder:text-text-muted focus:border-2 focus:border-action-primary"
          />
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            accept={ATTACH_TYPES.join(",")}
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            aria-label="إرفاق ملف"
            onClick={() => fileRef.current?.click()}
            className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-12 bg-bg-surface text-text-secondary focus-ring"
          >
            <Glyph icon={Paperclip} size={20} />
          </button>
          <button
            type="submit"
            aria-label="إرسال"
            disabled={pending || !body.trim() || (attachment !== null && "uploading" in attachment)}
            className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-12 bg-action-primary text-text-on-brand hover:bg-action-primary-hover focus-ring disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:text-text-disabled"
          >
            <Glyph icon={pending ? LoaderCircle : SendHorizontal} size={20} className={pending ? "animate-[tg-spin_0.9s_linear_infinite]" : ""} />
          </button>
        </div>
        {variant === "page" && (
          <p className="type-caption text-text-muted">لا تُشارك بيانات بطاقتك أو رقمك الوطني. المرفقات حتى {toArabicDigits(10)} م.ب — PDF أو صور.</p>
        )}
      </form>
    </div>
  );
}
