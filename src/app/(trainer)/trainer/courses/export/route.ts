import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const STATUS: Record<string, string> = {
  pending_provider: "بانتظار الجهة",
  confirmed: "مسجَّل",
  in_progress: "جارية",
  completed: "مكتملة",
  withdrawn: "منسحب",
  cancelled: "ملغاة",
  access_revoked: "سُحب الوصول",
  pending_payment: "بانتظار الدفع",
};

const cell = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/**
 * «صدّر كشوفًا» / «صدّر كشوف الدورة» / «صدّر قائمة المشترين» (TRR-CRS-01/05/07): CSV roster of the chosen courses.
 * Names come from course_sales(), which only returns rows of courses the caller manages.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/trainer/courses", request.url));
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
    .slice(0, 50);
  if (ids.length === 0) return new NextResponse("لا دورات محدّدة", { status: 400 });
  const supabase = await createClient();
  const { data: courses } = await supabase.from("courses").select("id, title").in("id", ids);
  const lines = [["الدورة", "المتدرب", "الحالة", "تاريخ التسجيل", "المبلغ المدفوع", "رقم الإيصال"].map(cell).join(",")];
  for (const c of courses ?? []) {
    const { data, error } = await supabase.rpc("course_sales", { p_course: c.id });
    if (error) continue;
    for (const r of data ?? []) {
      lines.push(
        [c.title, r.trainee_name, STATUS[r.enrollment_status] ?? r.enrollment_status, (r.confirmed_at ?? r.created_at).slice(0, 10), Number(r.price_paid), r.receipt_number ?? ""]
          .map(cell)
          .join(","),
      );
    }
  }
  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="course-rosters-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
