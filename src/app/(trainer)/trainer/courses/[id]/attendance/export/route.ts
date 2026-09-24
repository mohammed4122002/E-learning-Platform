import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getManagedCourse } from "@/lib/data/trainer-course";
import { getAttendanceSheetExport } from "@/lib/data/trainer-attendance";

const LABEL: Record<string, string> = { present: "حاضر", late: "متأخر", excused: "غائب بعذر", absent: "غائب" };

const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** «صدّر كشف الحضور» (436:20488 / 272:4913): CSV (UTF-8 with BOM, opens in Excel) of the course attendance. */
export async function GET(_req: Request, ctx: RouteContext<"/trainer/courses/[id]/attendance/export">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const course = await getManagedCourse(id);
  const { sessions, people, enrollments, marks, attendance } = await getAttendanceSheetExport(course);
  const header = ["المتدرب", ...sessions.map((s) => `الجلسة ${s.position} · ${s.title}`), "نسبة الحضور"];
  const lines = enrollments.map((e) => {
    let attended = 0;
    const cells = sessions.map((s) => {
      const mark = marks.find((m) => m.session_id === s.id && m.trainee_id === e.trainee_id)?.status;
      const came = attendance.some((a) => a.session_id === s.id && a.trainee_id === e.trainee_id);
      if (came) attended += 1;
      return mark ? LABEL[mark] : came ? "حاضر" : "—";
    });
    const pct = sessions.length ? Math.round((attended / sessions.length) * 100) : 0;
    return [people.get(e.trainee_id)?.name ?? "متدرب", ...cells, `${pct}%`];
  });
  const csv = "﻿" + [header, ...lines].map((r) => r.map(cell).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="attendance-${course.slug}.csv"`,
      "cache-control": "no-store",
    },
  });
}
