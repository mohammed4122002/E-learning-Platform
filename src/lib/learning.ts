import { toArabicDigits } from "@/lib/format";

/** Shared (server + client) helpers for the learning screens (TRN-MYE-04, TRN-LRN-*). */

const ORDINALS_M = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر"];

/** BR-U1: modules are «محاور». "المحور الثاني" · falls back to "المحور ١١". */
export function moduleLabel(position: number): string {
  return ORDINALS_M[position - 1] ? `المحور ${ORDINALS_M[position - 1]}` : `المحور ${toArabicDigits(position)}`;
}

/** "الدرس ٢" */
export function lessonLabel(position: number): string {
  return `الدرس ${toArabicDigits(position)}`;
}

/** Arabic letters used for answer options in the quiz (أ ب ج د …). */
export const OPTION_LETTERS = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"];

/** BR-L11: a video lesson is complete once watched to 90%. */
export const COMPLETE_AT = 0.9;

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${toArabicDigits(mb.toFixed(1)).replace(".", "٫")} م.ب`;
  return `${toArabicDigits(Math.max(1, Math.round(bytes / 1024)))} ك.ب`;
}

export const ORDINAL_F = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة"];
const COUNT_F = ["واحدة", "اثنتين", "ثلاث", "أربع", "خمس"];

/** "المحاولة الأولى من اثنتين" */
export function attemptLabel(no: number, max: number): string {
  return `المحاولة ${ORDINAL_F[no - 1] ?? toArabicDigits(no)} من ${COUNT_F[max - 1] ?? toArabicDigits(max)}`;
}
