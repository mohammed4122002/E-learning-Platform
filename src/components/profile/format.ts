import { formatNumber, toArabicDigits } from "@/lib/format";

type Period = { startDate: string; endDate: string | null; isCurrent: boolean };

/** "٢٠٢٣ – الآن" · "٢٠٢٢ – ٢٠٢٣" */
export function experienceYears(e: Period): string {
  const start = toArabicDigits(e.startDate.slice(0, 4));
  const end = e.isCurrent || !e.endDate ? "الآن" : toArabicDigits(e.endDate.slice(0, 4));
  return `${start} – ${end}`;
}

/** "٣ سنوات" · "سنة واحدة" · "٨ أشهر" */
export function experienceDuration(e: Period, now = new Date()): string {
  const start = new Date(e.startDate);
  const end = e.isCurrent || !e.endDate ? now : new Date(e.endDate);
  const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth());
  const years = Math.round(months / 12);
  if (months < 12) return months === 1 ? "شهر واحد" : months === 2 ? "شهران" : `${toArabicDigits(months)} ${months <= 10 ? "أشهر" : "شهرًا"}`;
  if (years <= 1) return "سنة واحدة";
  if (years === 2) return "سنتان";
  return `${toArabicDigits(years)} ${years <= 10 ? "سنوات" : "سنة"}`;
}

/** "مارس ٢٠٢٣" from an ISO date. */
export function monthYear(iso: string): string {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

/** "٤٢ ساعة" with one decimal at most. */
export function hoursLabel(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return `${formatNumber(rounded)} ساعة`;
}

/** Public profile URL shown as "host/u/<id>". */
export function profileUrlLabel(siteUrl: string, id: string): string {
  const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `${host}/u/${id.slice(0, 8)}…`;
}
