"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { joinLiveSession } from "@/app/(workspace)/trainee/trainings/actions";

/** «الدخول إلى الجلسة»: records attendance (join_live_session) then opens the meeting in a new tab. */
export function JoinSessionButton({ enrollmentId, sessionId }: { enrollmentId: string; sessionId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <Button
      loading={pending}
      onClick={() => {
        // Open synchronously (inside the click) so pop-up blockers allow it; navigate once the link is known.
        const win = window.open("", "_blank");
        start(async () => {
          const res = await joinLiveSession(enrollmentId, sessionId);
          if (res.ok && res.url) {
            if (win) win.location.href = res.url;
            else window.location.href = res.url;
            toast("success", "سُجِّل حضورك وفُتحت الجلسة في نافذة جديدة.");
            router.refresh();
          } else {
            win?.close();
            router.push(`/trainee/trainings/${enrollmentId}/session?session=${sessionId}&error=${res.code ?? "network"}`);
          }
        });
      }}
    >
      الدخول إلى الجلسة
    </Button>
  );
}

/** «اختبر الصوت والصورة»: asks for camera + microphone and reports the result, then releases the devices. */
export function DeviceCheckButton() {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <Button
      variant="secondary"
      loading={busy}
      onClick={async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
          toast("error", "متصفحك لا يدعم اختبار الكاميرا والميكروفون.");
          return;
        }
        setBusy(true);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          stream.getTracks().forEach((t) => t.stop());
          toast("success", "الكاميرا والميكروفون يعملان — أنت جاهز للجلسة.");
        } catch {
          toast("warning", "لم نتمكن من الوصول إلى الكاميرا أو الميكروفون. اسمح بالوصول من إعدادات المتصفح.");
        } finally {
          setBusy(false);
        }
      }}
    >
      اختبر الصوت والصورة
    </Button>
  );
}

/** Re-checks the session state periodically while waiting for the host (and on demand). */
export function RefreshStatus({ label = "أعد المحاولة", every, href }: { label?: string; every?: number; href?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  useEffect(() => {
    if (!every) return;
    const t = setInterval(() => router.refresh(), every * 1000);
    return () => clearInterval(t);
  }, [every, router]);
  return (
    <Button loading={pending} onClick={() => start(() => (href ? router.replace(href) : router.refresh()))}>
      {label}
    </Button>
  );
}
