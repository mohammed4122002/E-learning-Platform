"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { formatDayMonth, formatTime } from "@/lib/format";
import { refCode } from "@/lib/trainings";
import { checkIn, type CheckInResult } from "@/app/(workspace)/trainee/trainings/actions";
import { DataCard, Notice, type NoticeTone } from "./ui";

type Mode = "scan" | "permission" | "manual" | "success" | "already" | "invalid" | "expired" | "error";

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

const NOTICE: Record<Mode, { tone: NoticeTone; title: string; text: string }> = {
  scan: { tone: "brand", title: "وجّه الكاميرا نحو رمز الجلسة", text: "رمز الجلسة معروض بشاشة المدرب في القاعة." },
  permission: { tone: "warning", title: "نحتاج إذن الكاميرا", text: "فعّل الكاميرا لمسح رمز الحضور، أو أدخل الرمز يدويًا." },
  manual: { tone: "brand", title: "أدخل رمز الحضور", text: "اكتب الرمز الظاهر أسفل رمز QR على شاشة المدرب." },
  success: { tone: "success", title: "تم تسجيل حضورك", text: "سُجِّل حضورك لهذه الجلسة بنجاح." },
  already: { tone: "brand", title: "الحضور مسجَّل مسبقًا", text: "سبق أن سجّلت حضورك لهذه الجلسة — لا حاجة لأي إجراء آخر." },
  invalid: { tone: "error", title: "الرمز غير صالح", text: "هذا الرمز لا يخصّ جلسة نشطة. تأكّد من الرمز المعروض أمامك." },
  expired: { tone: "warning", title: "انتهت صلاحية الرمز", text: "اطلب من المدرب عرض رمز جديد ثم أعد المسح." },
  error: { tone: "error", title: "تعذّر تسجيل الحضور", text: "حدث خطأ أثناء التسجيل. أعد المحاولة بعد قليل." },
};

const FRAME: Partial<Record<Mode, string>> = {
  success: "border-state-success",
  already: "border-action-primary",
  invalid: "border-state-error",
  expired: "border-state-warning",
  error: "border-state-error",
};
const DOT: Partial<Record<Mode, string>> = { success: "bg-state-success", invalid: "bg-state-error", error: "bg-state-error", expired: "bg-state-warning", already: "bg-action-primary" };

function extractCode(raw: string) {
  try {
    const u = new URL(raw);
    return u.searchParams.get("code") ?? u.pathname.split("/").filter(Boolean).pop() ?? raw;
  } catch {
    return raw;
  }
}

/** TRN-MYE-02 · تسجيل الحضور (QR) — scanner (4142:2), camera permission (4142:560), results (4142:1077/1602/2119/2636). */
export function CheckInScanner({ enrollmentId, courseTitle, sessionLabel, backHref }: { enrollmentId: string; courseTitle: string; sessionLabel: string | null; backHref: string }) {
  const [mode, setMode] = useState<Mode>("permission");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [manualError, setManualError] = useState<string | undefined>();
  const [supported, setSupported] = useState(true);
  const [pending, start] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const submit = useCallback(
    (code: string, fromManual = false) =>
      start(async () => {
        stop();
        const res = await checkIn(enrollmentId, code);
        if (fromManual && res.status === "invalid" && !res.code) {
          setManualError(res.message);
          return;
        }
        setResult(res);
        setMode(res.status === "idle" ? "error" : res.status);
        if (res.status === "success" || res.status === "already") router.refresh();
      }),
    [enrollmentId, router, stop],
  );

  const startCamera = useCallback(async () => {
    const Ctor = (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
      setSupported(false);
      setMode("manual");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      setMode("scan");
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        void video.play();
      });
    } catch {
      setMode("permission");
    }
  }, []);

  // Start right away when the camera permission was already granted.
  useEffect(() => {
    let cancelled = false;
    const Ctor = (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    const t = setTimeout(() => {
      if (!Ctor) {
        setSupported(false);
        setMode("manual");
        return;
      }
      navigator.permissions
        ?.query({ name: "camera" as PermissionName })
        .then((p) => {
          if (!cancelled && p.state === "granted") void startCamera();
        })
        .catch(() => {});
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
      stop();
    };
  }, [startCamera, stop]);

  // Detection loop while scanning.
  useEffect(() => {
    if (mode !== "scan") return;
    const Ctor = (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    if (!Ctor) return;
    const detector = new Ctor({ formats: ["qr_code"] });
    let busy = false;
    const t = setInterval(async () => {
      const video = videoRef.current;
      if (busy || !video || video.readyState < 2) return;
      busy = true;
      try {
        const found = await detector.detect(video);
        if (found[0]?.rawValue) {
          clearInterval(t);
          submit(extractCode(found[0].rawValue));
        }
      } catch {
        // keep scanning
      } finally {
        busy = false;
      }
    }, 350);
    return () => clearInterval(t);
  }, [mode, submit]);

  const notice = NOTICE[mode];
  const at = result?.checkedInAt;
  const rows: { label: string; value: string; tone?: "success" | "error" | "warning" | "brand" }[] = [{ label: sessionLabel ? "الدورة والجلسة" : "الدورة", value: sessionLabel ? `${courseTitle} · ${sessionLabel}` : courseTitle }];
  if ((mode === "success" || mode === "already") && at) {
    rows.push({ label: "وقت التسجيل", value: `${formatTime(at)} · ${formatDayMonth(at)}` });
    rows.push({ label: "حالة الحضور", value: "حاضر", tone: "success" });
    if (result?.sessionId) rows.push({ label: "رقم العملية", value: refCode("ATT", result.sessionId, at) });
  } else if (mode === "invalid" || mode === "expired" || mode === "error") {
    rows.push({ label: "حالة المسح", value: mode === "expired" ? "رمز منتهي الصلاحية" : mode === "invalid" ? "رمز غير صالح" : "تعذّر التسجيل", tone: mode === "expired" ? "warning" : "error" });
  }

  const retry = () => {
    setResult(null);
    setManualError(undefined);
    if (supported) void startCamera();
    else setMode("manual");
  };

  return (
    <>
      <Notice tone={supported || mode !== "manual" ? notice.tone : "info"} title={notice.title}>
        <p aria-live="polite">{!supported && mode === "manual" ? "متصفحك لا يدعم مسح رمز QR — أدخل الرمز يدويًا." : notice.text}</p>
      </Notice>

      <section aria-label="ماسح رمز الحضور" className="flex w-full flex-col items-center rounded-[14px] border border-border-default bg-bg-card px-4 py-7 sm:px-6">
        {mode === "manual" ? (
          <form
            className="flex w-full max-w-[360px] flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const code = String(new FormData(e.currentTarget).get("code") ?? "");
              setManualError(undefined);
              submit(code, true);
            }}
          >
            <Input name="code" label="رمز الحضور" placeholder="مثال: RSK-4821" dir="ltr" autoComplete="off" autoCapitalize="characters" required error={manualError} />
            <Button type="submit" loading={pending} fullWidth>
              تسجيل الحضور
            </Button>
          </form>
        ) : (
          <div className="relative flex aspect-square w-full max-w-[360px] items-center justify-center overflow-hidden rounded-16 bg-text-on-accent">
            {mode === "scan" && <video ref={videoRef} muted playsInline aria-label="معاينة الكاميرا" className="absolute inset-0 size-full object-cover" />}
            <div className={`relative flex size-[56%] items-center justify-center rounded-12 border-[3px] ${FRAME[mode] ?? "border-action-accent"}`}>
              {DOT[mode] && <span aria-hidden className={`size-[35%] rounded-full ${DOT[mode]}`} />}
              {mode === "permission" && <span className="px-2 text-center type-subtitle text-text-on-brand">الكاميرا غير مفعّلة</span>}
              {pending && <span className="absolute -bottom-9 type-caption text-text-on-brand">جارٍ التحقق…</span>}
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        {mode === "scan" && (
          <>
            <Button variant="secondary" onClick={() => (stop(), setMode("manual"))}>
              أدخل الرمز يدويًا
            </Button>
            <Button variant="secondary" onClick={() => (stop(), setMode("permission"))}>
              إلغاء المسح
            </Button>
          </>
        )}
        {mode === "permission" && (
          <>
            <Button variant="secondary" onClick={() => setMode("manual")}>
              أدخل الرمز يدويًا
            </Button>
            <Button onClick={() => void startCamera()}>فعّل الكاميرا</Button>
          </>
        )}
        {mode === "manual" && supported && (
          <Button variant="secondary" onClick={() => void startCamera()}>
            امسح الرمز بالكاميرا
          </Button>
        )}
        {(mode === "success" || mode === "already") && <ButtonLink href={backHref}>عد إلى تفاصيل التسجيل</ButtonLink>}
        {(mode === "invalid" || mode === "expired" || mode === "error") && (
          <>
            <ButtonLink href={backHref} variant="secondary">
              عد إلى تفاصيل التسجيل
            </ButtonLink>
            <Button onClick={retry}>{supported ? "أعد المسح" : "أعد المحاولة"}</Button>
          </>
        )}
      </div>

      <DataCard title="تفاصيل الحضور" rows={rows} />
    </>
  );
}
