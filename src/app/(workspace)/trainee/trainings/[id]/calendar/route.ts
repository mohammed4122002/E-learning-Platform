import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEnrollmentDetail } from "@/lib/data/trainings";

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** «أضف الجدول للتقويم» — the enrollment's sessions as an iCalendar file (TRN-MYE-02). */
export async function GET(_req: NextRequest, ctx: RouteContext<"/trainee/trainings/[id]/calendar">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("غير مصرّح", { status: 401 });
  const d = await getEnrollmentDetail(user.id, id);
  if (!d) return new NextResponse("غير موجود", { status: 404 });

  const now = stamp(new Date().toISOString());
  const events = d.sessions
    .filter((s) => s.state !== "cancelled")
    .map((s) =>
      [
        "BEGIN:VEVENT",
        `UID:${s.id}@bawaba-training`,
        `DTSTAMP:${now}`,
        `DTSTART:${stamp(s.startsAt)}`,
        `DTEND:${stamp(s.endsAt)}`,
        `SUMMARY:${esc(`${d.course.title} — ${s.title}`)}`,
        s.location ? `LOCATION:${esc(s.location)}` : null,
        `DESCRIPTION:${esc(`${d.course.provider ?? d.course.trainer} · ${d.ref}`)}`,
        "END:VEVENT",
      ]
        .filter(Boolean)
        .join("\r\n"),
    );
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bawaba Training//AR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", ...events, "END:VCALENDAR", ""].join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${d.ref}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
