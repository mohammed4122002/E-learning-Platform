"use client";

import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";

/*
 * Browser → private bucket `lesson-media` at "<course_id>/<folder>/<uuid>-<name>" (storage RLS: course staff).
 * Resumable (TUS, Supabase `/storage/v1/upload/resumable`, 6 MB chunks): progress, cancel, and resume after a
 * dropped connection or a page reload (the upload URL is remembered per file).
 */

export const LESSON_VIDEO_TYPES = ["video/mp4", "video/webm"];
export const LESSON_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "image/jpeg",
  "image/png",
];
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
const CHUNK = 6 * 1024 * 1024;

export function checkLessonFile(file: File, kind: "video" | "file"): string | null {
  const types = kind === "video" ? LESSON_VIDEO_TYPES : LESSON_FILE_TYPES;
  if (!types.includes(file.type)) return kind === "video" ? "يُقبل فيديو MP4 أو WebM فقط." : "يُقبل PDF أو Excel أو Word أو PowerPoint أو ZIP أو صورة.";
  if (file.size === 0) return "الملف فارغ.";
  if (file.size > (kind === "video" ? MAX_VIDEO_BYTES : MAX_FILE_BYTES)) return kind === "video" ? "حجم الفيديو يتجاوز ٢ جيجابايت." : "حجم الملف يتجاوز ٥٠ ميجابايت.";
  return null;
}

function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "file"}${ext ? `.${ext}` : ""}`;
}

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));

/** Duration (seconds) of a local video file, read from its metadata. */
export function videoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    const done = (d: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) ? Math.round(d) : 0);
    };
    v.onloadedmetadata = () => {
      if (Number.isFinite(v.duration)) return done(v.duration);
      // Streamed WebM files carry no duration header: seek to the end so the browser computes it.
      v.ontimeupdate = () => {
        v.ontimeupdate = null;
        done(v.duration);
      };
      v.currentTime = 1e101;
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    v.src = url;
  });
}

export type UploadHandle = { promise: Promise<{ path: string }>; cancel: () => void };

type Stored = { url: string; path: string };

/** Start (or resume) a resumable upload. `onProgress` receives 0–100. */
export function uploadLessonMedia(file: File, courseId: string, folder: "lessons" | "files", onProgress: (percent: number) => void): UploadHandle {
  let cancelled = false;
  let xhr: XMLHttpRequest | null = null;
  const fingerprint = `tg-tus:${courseId}:${folder}:${file.name}:${file.size}:${file.lastModified}`;

  const promise = (async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) throw new Error("not_authenticated");
    const headers = { Authorization: `Bearer ${session.access_token}`, apikey: env.supabaseKey, "Tus-Resumable": "1.0.0" };
    const endpoint = `${env.supabaseUrl}/storage/v1/upload/resumable`;

    let stored: Stored | null = null;
    try {
      stored = JSON.parse(localStorage.getItem(fingerprint) ?? "null");
    } catch {}

    let offset = 0;
    if (stored) {
      const head = await fetch(stored.url, { method: "HEAD", headers }).catch(() => null);
      if (head && head.ok && head.headers.get("Upload-Offset")) offset = Number(head.headers.get("Upload-Offset"));
      else stored = null;
    }
    if (!stored) {
      const path = `${courseId}/${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          ...headers,
          "Upload-Length": String(file.size),
          "x-upsert": "false",
          "Upload-Metadata": [
            `bucketName ${b64("lesson-media")}`,
            `objectName ${b64(path)}`,
            `contentType ${b64(file.type)}`,
            `cacheControl ${b64("3600")}`,
          ].join(","),
        },
      });
      const location = res.headers.get("Location");
      if (!res.ok || !location) throw new Error(`upload_${res.status}`);
      stored = { url: location.startsWith("http") ? location : `${env.supabaseUrl}${location}`, path };
      try {
        localStorage.setItem(fingerprint, JSON.stringify(stored));
      } catch {}
    }

    const target = stored;
    while (offset < file.size) {
      if (cancelled) throw new Error("cancelled");
      const chunk = file.slice(offset, Math.min(offset + CHUNK, file.size));
      const start = offset;
      offset = await new Promise<number>((resolve, reject) => {
        xhr = new XMLHttpRequest();
        xhr.open("PATCH", target.url);
        Object.entries(headers).forEach(([k, v]) => xhr!.setRequestHeader(k, v));
        xhr.setRequestHeader("Upload-Offset", String(start));
        xhr.setRequestHeader("Content-Type", "application/offset+octet-stream");
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.min(99, Math.round(((start + e.loaded) / file.size) * 100)));
        xhr.onload = () => {
          if (xhr!.status === 204 || xhr!.status === 200) resolve(Number(xhr!.getResponseHeader("Upload-Offset") ?? start + chunk.size));
          else reject(new Error(`upload_${xhr!.status}`));
        };
        xhr.onerror = () => reject(new Error("network"));
        xhr.onabort = () => reject(new Error("cancelled"));
        xhr.send(chunk);
      });
    }
    try {
      localStorage.removeItem(fingerprint);
    } catch {}
    onProgress(100);
    return { path: target.path };
  })();

  return {
    promise,
    cancel: () => {
      cancelled = true;
      xhr?.abort();
      try {
        localStorage.removeItem(fingerprint);
      } catch {}
    },
  };
}
