"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Data";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { DataCard, DataRow, FlowNotice } from "./bits";
import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { formatPercent } from "@/lib/format";
import { discardAvatar, removeAvatar, setAvatar } from "@/app/(workspace)/trainee/profile/actions";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const OUTPUT = 512;
const FRAME = 220;

type Phase =
  | { kind: "idle" }
  | { kind: "selected"; file: File; url: string; width: number; height: number }
  | { kind: "uploading"; file: File; progress: number }
  | { kind: "success" }
  | { kind: "failed"; file: File | null; message: string }
  | { kind: "removed"; previousPath: string | null };

/** Square crop of the selected area, resized to 512×512 (WebP, JPEG fallback). */
async function cropToBlob(url: string, sx: number, sy: number, side: number): Promise<Blob> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT;
  canvas.height = OUTPUT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT, OUTPUT);
  const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
  const blob = (await toBlob("image/webp")) ?? (await toBlob("image/jpeg"));
  if (!blob) throw new Error("encode");
  return blob;
}

/** Uploads with progress (supabase-js has no upload progress events). */
function uploadWithProgress(path: string, blob: Blob, token: string, onProgress: (p: number) => void, xhrRef: { current: XMLHttpRequest | null }) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", `${env.supabaseUrl}/storage/v1/object/avatars/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", env.supabaseKey);
    xhr.setRequestHeader("Content-Type", blob.type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`http_${xhr.status}`)));
    xhr.onerror = () => reject(new Error("network"));
    xhr.onabort = () => reject(new Error("aborted"));
    xhr.send(blob);
  });
}

/**
 * TRN-PRF-03 · صورة الملف — default (4151:2), selected (4151:391), uploading (4151:737), success (4151:1083),
 * failed (4151:1429), removed (4151:1778). Upload goes straight from the browser to `avatars/<uid>/<uuid>.webp`.
 */
export function PhotoPanel({ userId, fullName, currentPath, currentUrl }: { userId: string; fullName: string; currentPath: string | null; currentUrl: string | null }) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [offset, setOffset] = useState({ x: 0.5, y: 0.5 });
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const discardRef = useRef<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  const selectedUrl = phase.kind === "selected" ? phase.url : null;
  useEffect(() => () => void (selectedUrl && URL.revokeObjectURL(selectedUrl)), [selectedUrl]);

  const pick = () => inputRef.current?.click();

  const accept = async (file: File | undefined) => {
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      setPhase({ kind: "failed", file, message: "الصيغة غير مدعومة — اختر صورة JPG أو PNG أو WebP." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setPhase({ kind: "failed", file, message: "حجم الصورة أكبر من ٢ ميجابايت — اختر صورة أصغر." });
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      URL.revokeObjectURL(url);
      setPhase({ kind: "failed", file, message: "تعذّر قراءة الصورة — جرّب ملفًا آخر." });
      return;
    }
    if (Math.min(img.naturalWidth, img.naturalHeight) < 200) {
      URL.revokeObjectURL(url);
      setPhase({ kind: "failed", file, message: "الصورة صغيرة جدًا — ٢٠٠ × ٢٠٠ بكسل على الأقل." });
      return;
    }
    if (phase.kind === "removed" && phase.previousPath) discardRef.current = phase.previousPath;
    setOffset({ x: 0.5, y: 0.5 });
    setPhase({ kind: "selected", file, url, width: img.naturalWidth, height: img.naturalHeight });
  };

  const save = async () => {
    if (phase.kind !== "selected") return;
    const { file, url, width, height } = phase;
    const side = Math.min(width, height);
    const sx = Math.round((width - side) * offset.x);
    const sy = Math.round((height - side) * offset.y);
    setPhase({ kind: "uploading", file, progress: 0 });
    let path: string | null = null;
    try {
      const blob = await cropToBlob(url, sx, sy, side);
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("not_authenticated");
      path = `${userId}/${crypto.randomUUID()}.${blob.type === "image/webp" ? "webp" : "jpg"}`;
      await uploadWithProgress(path, blob, data.session.access_token, (p) => setPhase({ kind: "uploading", file, progress: p }), xhrRef);
      const res = await setAvatar(path, discardRef.current);
      if (res.status === "error") {
        await discardAvatar(path);
        throw new Error(res.message ?? "save");
      }
      discardRef.current = null;
      setPhase({ kind: "success" });
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "aborted") {
        setPhase({ kind: "idle" });
        toast("info", "أُلغي رفع الصورة.");
        return;
      }
      setPhase({
        kind: "failed",
        file,
        message: msg === "network" ? "حدث خلل أثناء الرفع. تحقّق من اتصالك ثم أعد المحاولة." : msg.startsWith("http_") || msg === "encode" || msg === "canvas" ? "تعذّر رفع الصورة. أعد المحاولة بعد قليل." : msg === "not_authenticated" ? "انتهت جلستك. سجّل دخولك مرة أخرى." : msg,
      });
    }
  };

  const remove = () =>
    start(async () => {
      const res = await removeAvatar();
      if (res.status === "error") {
        setRemoveError(res.message ?? null);
        return;
      }
      setConfirmRemove(false);
      setPhase({ kind: "removed", previousPath: res.previousPath ?? null });
      router.refresh();
    });

  const restore = (path: string) =>
    start(async () => {
      const res = await setAvatar(path);
      if (res.status === "error") {
        toast("error", res.message ?? "تعذّر الاستعادة");
        return;
      }
      setPhase({ kind: "success" });
      router.refresh();
    });

  // Drag the image inside the round frame to choose the square crop.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || phase.kind !== "selected") return;
    const scale = FRAME / Math.min(phase.width, phase.height);
    const spanX = (phase.width - Math.min(phase.width, phase.height)) * scale;
    const spanY = (phase.height - Math.min(phase.width, phase.height)) * scale;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setOffset({
      x: spanX ? Math.min(1, Math.max(0, dragRef.current.ox - dx / spanX)) : 0.5,
      y: spanY ? Math.min(1, Math.max(0, dragRef.current.oy - dy / spanY)) : 0.5,
    });
  };
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 0.05;
    const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d = map[e.key];
    if (!d) return;
    e.preventDefault();
    setOffset((o) => ({ x: Math.min(1, Math.max(0, o.x + d[0])), y: Math.min(1, Math.max(0, o.y + d[1])) }));
  };

  const notice = {
    idle: { tone: "brand" as const, title: "صورة ملفك الشخصي", body: "اختر صورة من جهازك لتظهر في ملفك المهني." },
    selected: { tone: "brand" as const, title: "معاينة الصورة قبل الحفظ", body: "حرّك الإطار لضبط القص ثم احفظ." },
    uploading: { tone: "brand" as const, title: "جارٍ رفع الصورة", body: "لا تغلق الصفحة حتى يكتمل الرفع." },
    success: { tone: "success" as const, title: "تم تحديث صورتك", body: "ظهرت صورتك الجديدة في ملفك المهني." },
    failed: { tone: "error" as const, title: "تعذّر رفع الصورة", body: phase.kind === "failed" ? phase.message : "" },
    removed: { tone: "warning" as const, title: "حُذفت صورتك", body: "يمكنك استعادة الصورة السابقة أو رفع صورة جديدة." },
  }[phase.kind];

  const dropzone = (label: string, tone: "brand" | "error") => (
    <button
      type="button"
      onClick={pick}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void accept(e.dataTransfer.files[0]);
      }}
      className={`flex w-full cursor-pointer flex-col items-center gap-2 rounded-16 border-[1.5px] border-dashed px-6 py-9 text-center focus-ring ${
        tone === "error" ? "border-state-error bg-bg-surface" : "border-action-primary bg-bg-surface"
      } ${dragOver ? "bg-bg-brand-tint" : ""}`}
    >
      <span className={`type-subtitle font-bold ${tone === "error" ? "text-state-error" : "text-text-brand"}`}>{label}</span>
      <span className="type-caption text-text-muted">JPG أو PNG أو WebP · حتى ٢ ميجابايت · نقصّها مربعة ١:١ · ٢٠٠ × ٢٠٠ بكسل على الأقل</span>
    </button>
  );

  const scale = phase.kind === "selected" ? FRAME / Math.min(phase.width, phase.height) : 1;

  return (
    <section aria-label="صورة الملف" className="flex flex-col gap-6">
      <input
        ref={inputRef}
        type="file"
        accept={TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <FlowNotice tone={notice.tone} title={notice.title}>
        {notice.body}
      </FlowNotice>

      <DataCard title="تفاصيل الصورة">
        {phase.kind === "idle" && (
          <>
            <DataRow label="الصورة الحالية" value={currentPath ? "مرفوعة" : "لا توجد صورة"} tone={currentPath ? "default" : "muted"} />
            <DataRow label="تظهر في" value="الملف العام والخاص" />
          </>
        )}
        {phase.kind === "selected" && (
          <>
            <DataRow label="الملف المختار" value={<span dir="ltr">{phase.file.name}</span>} />
            <DataRow label="الحالة" value="بانتظار الحفظ" tone="brand" />
          </>
        )}
        {phase.kind === "uploading" && (
          <>
            <DataRow label="الملف" value={<span dir="ltr">{phase.file.name}</span>} />
            <DataRow
              label="التقدّم"
              tone="brand"
              value={
                <span role="progressbar" aria-label="تقدّم الرفع" aria-valuenow={phase.progress} aria-valuemin={0} aria-valuemax={100}>
                  {formatPercent(phase.progress)}
                </span>
              }
            />
          </>
        )}
        {phase.kind === "success" && (
          <>
            <DataRow label="الحالة" value="محدَّثة" tone="success" />
            <DataRow label="تظهر في" value="الملف العام والخاص" />
          </>
        )}
        {phase.kind === "failed" && (
          <>
            <DataRow label="الملف" value={<span dir="ltr">{phase.file?.name ?? "—"}</span>} />
            <DataRow label="الحالة" value="فشل الرفع" tone="error" />
          </>
        )}
        {phase.kind === "removed" && (
          <>
            <DataRow label="الصورة الحالية" value="لا توجد صورة" tone="muted" />
            <DataRow label="الصورة السابقة" value={phase.previousPath ? "متاحة للاستعادة" : "غير متاحة"} tone={phase.previousPath ? "warning" : "muted"} />
          </>
        )}
      </DataCard>

      {phase.kind === "selected" && (
        <div className="flex flex-col items-center gap-3">
          <div
            role="slider"
            tabIndex={0}
            aria-label="موضع القص — استخدم الأسهم لتحريك الإطار"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((phase.width >= phase.height ? offset.x : offset.y) * 100)}
            aria-valuetext="موضع القص"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (dragRef.current = null)}
            onKeyDown={onKey}
            className="relative cursor-grab touch-none overflow-hidden rounded-full border-4 border-bg-surface bg-bg-page shadow-card focus-ring active:cursor-grabbing"
            style={{ width: FRAME, height: FRAME }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img
              src={phase.url}
              alt="معاينة الصورة المختارة"
              draggable={false}
              className="pointer-events-none absolute max-w-none select-none"
              style={{
                width: phase.width * scale,
                height: phase.height * scale,
                left: -(phase.width * scale - FRAME) * offset.x,
                top: -(phase.height * scale - FRAME) * offset.y,
              }}
            />
          </div>
          <p className="type-caption text-text-muted">اسحب الصورة داخل الدائرة لضبط القص.</p>
        </div>
      )}

      {(phase.kind === "idle" || phase.kind === "success") && (
        <div className="flex items-center gap-4">
          <Avatar name={fullName || "؟"} src={currentUrl} size="xl" />
          {phase.kind === "idle" && currentPath && (
            <button type="button" onClick={() => setConfirmRemove(true)} className="cursor-pointer rounded-8 type-subtitle text-state-error hover:underline focus-ring">
              إزالة الصورة الحالية
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {phase.kind === "idle" && (
          <>
            <ButtonLink href="/trainee/profile/edit" variant="secondary">
              إلغاء
            </ButtonLink>
            <Button onClick={pick}>اختر صورة</Button>
          </>
        )}
        {phase.kind === "selected" && (
          <>
            <Button variant="secondary" onClick={() => setPhase({ kind: "idle" })}>
              إلغاء
            </Button>
            <Button onClick={save}>احفظ الصورة</Button>
          </>
        )}
        {phase.kind === "uploading" && (
          <Button variant="secondary" onClick={() => xhrRef.current?.abort()}>
            إلغاء الرفع
          </Button>
        )}
        {phase.kind === "success" && <ButtonLink href="/trainee/profile">عد إلى ملفي</ButtonLink>}
        {phase.kind === "failed" && (
          <>
            <Button variant="secondary" onClick={() => setPhase({ kind: "idle" })}>
              إلغاء
            </Button>
            <Button onClick={() => (phase.file && TYPES.includes(phase.file.type) && phase.file.size <= MAX_BYTES ? void accept(phase.file) : pick())}>أعد المحاولة</Button>
          </>
        )}
        {phase.kind === "removed" && (
          <>
            <ButtonLink href="/trainee/profile" variant="secondary">
              عد إلى ملفي
            </ButtonLink>
            <Button onClick={pick}>ارفع صورة جديدة</Button>
            {phase.previousPath && (
              <Button variant="text" loading={pending} onClick={() => restore(phase.previousPath!)}>
                استعد الصورة السابقة
              </Button>
            )}
          </>
        )}
      </div>

      {phase.kind === "idle" && dropzone("اختر صورة من جهازك", "brand")}
      {phase.kind === "failed" && dropzone("أعد اختيار الصورة", "error")}
      {phase.kind === "removed" && dropzone("ارفع صورة جديدة", "brand")}

      <Modal
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="إزالة صورتك؟"
        size="s"
        destructive
        footer={
          <>
            <Button variant="danger" size="s" loading={pending} onClick={remove}>
              أزل الصورة
            </Button>
            <Button variant="outline" size="s" onClick={() => setConfirmRemove(false)}>
              تراجع
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>ستختفي صورتك من ملفك العام وتقييماتك فورًا، ويظهر مكانها اختصار اسمك. يمكنك استعادتها ما دمت في هذه الصفحة.</p>
          {removeError && <Alert tone="error" title="تعذّرت الإزالة">{removeError}</Alert>}
        </div>
      </Modal>
    </section>
  );
}
