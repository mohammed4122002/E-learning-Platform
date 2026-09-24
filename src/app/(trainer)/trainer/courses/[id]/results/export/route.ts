import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getManagedCourse } from "@/lib/data/trainer-course";
import { getResults } from "@/lib/data/trainer-results";

const OUTCOME = { passed: "ناجح", failed: "راسب", below_attendance: "دون حد الحضور" } as const;
const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** «صدّر كشف الدرجات / صدّر كشف النتائج» (438:20310, 276:5002): CSV of the results sheet. */
export async function GET(_req: Request, ctx: RouteContext<"/trainer/courses/[id]/results/export">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const course = await getManagedCourse(id);
  const v = await getResults(course);
  const header = ["المتدرب", "الحضور", "الواجبات", "الاختبارات", "الدرجة النهائية", "النتيجة", "الحالة"];
  const lines = v.rows.map((r) => [
    r.name,
    r.attendance === null ? "—" : `${r.attendance}%`,
    r.maxPoints === null ? "—" : `${r.points ?? 0}/${r.maxPoints}`,
    r.quiz === null ? "—" : `${r.quiz}%`,
    `${r.final}%`,
    OUTCOME[r.outcome],
    v.approval ? "معتمدة" : "مبدئية",
  ]);
  const csv = "﻿" + [header, ...lines].map((r) => r.map(cell).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="results-${course.slug}.csv"`,
      "cache-control": "no-store",
    },
  });
}
