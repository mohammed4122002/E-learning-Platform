"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert, Spinner } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { createAttendanceCode, importLiveAttendance } from "@/lib/actions/trainer-ops";
import { qrMatrix, qrPath } from "@/lib/qr";
import { formatTime, toArabicDigits } from "@/lib/format";
import { DataPanel } from "./parts";

/*
 * TRR-ATT-02 · تسجيل الحضور برمز QR (4253:2) and TRR-ATT-03 · متابعة حضور الجلسة المباشرة (4253:585 imported,
 * 4253:1077 import failed). Shown above the register of the same session.
 */

function QrImage({ code }: { code: string }) {
  const { d, n } = useMemo(() => {
    const m = qrMatrix(code);
    return { d: qrPath(m, 2), n: m.length + 4 };
  }, [code]);
  return (
    <div className="flex size-[240px] items-center justify-center rounded-16 bg-text-primary p-4 sm:size-[280px]">
      <svg viewBox={`0 0 ${n} ${n}`} role="img" aria-label={`رمز الحضور ${code}`} className="size-full rounded-[10px] bg-white" shapeRendering="crispEdges">
        <path d={d} fill="#111111" />
      </svg>
    </div>
  );
}

export function QrPanel({
  courseId,
  sessionId,
  courseLabel,
  sessionLabel,
  present,
  roster,
  initial,
  backHref,
}: {
  courseId: string;
  sessionId: string;
  courseLabel: string;
  sessionLabel: string;
  present: number;
  roster: number;
  initial: { code: string; expiresAt: string } | null;
  backHref: string;
}) {
  const [code, setCode] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (code) return;
    start(async () => {
      const res = await createAttendanceCode(courseId, sessionId);
      if (res.ok && res.data) setCode(res.data);
      else if (!res.ok) setError(res.message);
    });
  }, [code, courseId, sessionId]);

  // «الحاضرون الآن» follows the check-ins while the code is on screen.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <>
      <DataPanel
        tone="brand"
        title={`حضور بالرمز · ${sessionLabel.split(" من ")[0]}`}
        rows={[
          { label: "الدورة", value: courseLabel },
          { label: "الجلسة", value: sessionLabel },
          { label: "الحاضرون الآن", value: `${toArabicDigits(present)} من ${toArabicDigits(roster)}`, tone: "success" },
          { label: "طريقة الرصد", value: "مسح رمز من مساحة المتدرب", tone: "brand" },
        ]}
      />
      <section aria-label="رمز الحضور" className="flex flex-col items-center gap-4 rounded-[14px] border border-border-default bg-bg-card px-6 py-8">
        {error ? (
          <Alert tone="error" title={error} />
        ) : code ? (
          <>
            <QrImage code={code.code} />
            <p className="text-center text-[15px] font-bold text-text-secondary">يمسح المتدرب هذا الرمز من مساحته لتسجيل حضوره</p>
            <p className="text-center type-caption text-text-muted">
              أو يكتب الرمز <bdi className="font-bold tracking-[0.2em] text-text-primary" dir="ltr">{code.code}</bdi> · صالح حتى {formatTime(code.expiresAt)}
            </p>
          </>
        ) : (
          <Spinner label="جارٍ إنشاء رمز الجلسة" />
        )}
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink href={backHref} variant="secondary">
          العودة إلى إدارة الدورة
        </ButtonLink>
        <Button onClick={() => document.getElementById("register")?.scrollIntoView({ behavior: "smooth" })}>افتح سجل الحضور</Button>
      </div>
    </>
  );
}

export function ImportPanel({
  courseId,
  sessionId,
  courseLabel,
  sessionLabel,
  status,
  provider,
  present,
  absent,
  backHref,
}: {
  courseId: string;
  sessionId: string;
  courseLabel: string;
  sessionLabel: string;
  status: "completed" | "failed" | null;
  provider: string | null;
  present: number;
  absent: number;
  backHref: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();
  const run = () =>
    start(async () => {
      setError(null);
      const res = await importLiveAttendance(courseId, sessionId);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      toast(res.data === "completed" ? "success" : "error", res.data === "completed" ? "استُورد الحضور من تقرير الجلسة." : "تعذّر استيراد تقرير الجلسة.");
      router.refresh();
    });

  // The report is imported automatically the first time the register of a live session is opened.
  const auto = useRef(false);
  useEffect(() => {
    if (status !== null || auto.current) return;
    auto.current = true;
    run();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === null) {
    return error ? <Alert tone="error" title={error} /> : <Spinner label="جارٍ استيراد تقرير الجلسة" />;
  }
  const ok = status === "completed";
  return (
    <>
      {error && <Alert tone="error" title={error} />}
      <DataPanel
        tone={ok ? "success" : "error"}
        title={ok ? "حضور مستورد من تقرير الجلسة" : "تعذّر استيراد تقرير الجلسة"}
        intro={ok ? "استُورد الحضور آليًا من تقرير الجلسة — لا رصد يدوي ولا رمز حضور." : "لم نتمكّن من جلب تقرير الحضور من الجلسة. أعد المحاولة."}
        rows={[
          { label: "الدورة", value: courseLabel },
          { label: "الجلسة", value: sessionLabel },
          { label: "مصدر التقرير", value: provider ?? "—", tone: "brand" },
          ...(ok
            ? [
                { label: "الحاضرون", value: `${toArabicDigits(present)} من ${toArabicDigits(present + absent)}`, tone: "success" as const },
                { label: "الغائبون", value: toArabicDigits(absent), tone: "error" as const },
              ]
            : []),
          { label: "حالة الاستيراد", value: ok ? "مكتمل" : "فشل", tone: ok ? ("success" as const) : ("error" as const) },
        ]}
      />
      <div className="flex flex-wrap items-center gap-3">
        {ok ? (
          <ButtonLink href={backHref}>العودة إلى إدارة الدورة</ButtonLink>
        ) : (
          <>
            <ButtonLink href={backHref} variant="secondary">
              العودة إلى إدارة الدورة
            </ButtonLink>
            <Button onClick={run} loading={pending}>
              أعد محاولة الاستيراد
            </Button>
          </>
        )}
      </div>
    </>
  );
}
