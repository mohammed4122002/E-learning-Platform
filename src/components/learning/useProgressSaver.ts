"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordLessonProgress } from "@/app/(workspace)/trainee/learn/actions";

export type SaveState = "idle" | "saving" | "saved" | "failed" | "offline";

const key = (lessonId: string) => `tg:lesson-progress:${lessonId}`;

function readPending(lessonId: string): number | null {
  try {
    const v = window.localStorage.getItem(key(lessonId));
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}
function writePending(lessonId: string, position: number | null) {
  try {
    if (position === null) window.localStorage.removeItem(key(lessonId));
    else window.localStorage.setItem(key(lessonId), String(Math.floor(position)));
  } catch {
    /* storage unavailable (private mode) — the in-memory copy still retries */
  }
}

/**
 * Reports lesson progress to record_lesson_progress (BR-L11) and never loses it (BR-S1):
 * a failed save is kept in localStorage + memory, retried on demand, when the browser comes back online,
 * and on the next visit to the lesson.
 */
export function useProgressSaver(lessonId: string, onCompleted?: () => void) {
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const pending = useRef<number | null>(null);
  const inFlight = useRef(false);
  const lastSaved = useRef<number | null>(null);
  const completedRef = useRef(false);
  const completedCb = useRef(onCompleted);
  useEffect(() => {
    completedCb.current = onCompleted;
  }, [onCompleted]);

  const flush = useCallback(async () => {
    if (inFlight.current || pending.current === null) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setState("offline");
      return;
    }
    const position = pending.current;
    inFlight.current = true;
    setState("saving");
    const res = await recordLessonProgress({ lessonId, position }).catch(() => ({ ok: false as const, message: "تعذّر الاتصال بالخادم.", retryable: true }));
    inFlight.current = false;
    if (res.ok) {
      lastSaved.current = position;
      if (pending.current === position) {
        pending.current = null;
        writePending(lessonId, null);
      }
      setState("saved");
      setMessage(null);
      if (res.completed && !completedRef.current) {
        completedRef.current = true;
        setCompleted(true);
        completedCb.current?.();
      }
    } else {
      setState("failed");
      setMessage(res.message);
      if (!res.retryable) {
        pending.current = null;
        writePending(lessonId, null);
      }
    }
  }, [lessonId]);

  /** Queue a position; saves immediately unless `lazy` (then only kept until the next flush). */
  const report = useCallback(
    (position: number, opts?: { lazy?: boolean }) => {
      const p = Math.max(0, Math.floor(position));
      if (lastSaved.current !== null && p === lastSaved.current && pending.current === null) return;
      pending.current = p;
      writePending(lessonId, p);
      if (!opts?.lazy) void flush();
    },
    [flush, lessonId],
  );

  // Recover progress that could not be saved during a previous visit, and retry when back online.
  useEffect(() => {
    const stored = readPending(lessonId);
    if (stored !== null && Number.isFinite(stored)) {
      pending.current = stored;
      const t = setTimeout(() => void flush(), 0);
      return () => clearTimeout(t);
    }
  }, [flush, lessonId]);
  useEffect(() => {
    const online = () => void flush();
    const offline = () => pending.current !== null && setState("offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [flush]);

  return { state, message, completed, report, retry: flush, hasPending: () => pending.current !== null };
}
