import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { settlementNumber } from "@/lib/trainer-finance";

/*
 * «صدّر تقرير الدخل» / «صدّر كل العمليات» (328:12108): CSV (opens in Excel) from trainer_ledger() and the
 * trainer's own withdrawals — the same rows as the finance pages, nothing else.
 */

const cell = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const KIND: Record<string, string> = { sale: "بيع", refund: "استرداد", chargeback: "استرداد عبر بوابة الدفع" };
const MODE: Record<string, string> = { in_person: "حضوري", live_remote: "مباشر عن بُعد", recorded: "مسجَّل" };
const W_STATUS: Record<string, string> = { pending: "قيد المعالجة", processing: "قيد المعالجة", completed: "مكتمل", failed: "فشل", cancelled: "أُلغي" };
const riyadhMonth = (iso: string) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Asia/Riyadh" }).format(new Date(iso)).slice(0, 7);
const cents = (v: number | string | null) => Math.round(Number(v ?? 0) * 100);
const fmt = (c: number) => (c / 100).toFixed(2);

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/trainer/finance", request.url));
  const type = request.nextUrl.searchParams.get("type") === "income" ? "income" : "all";
  const supabase = await createClient();
  const { data: ledger, error } = await supabase.rpc("trainer_ledger");
  if (error) return new NextResponse("تعذّر إنشاء الملف", { status: 500 });
  const rows = ledger ?? [];
  let lines: string[];

  if (type === "income") {
    // Month × channel: net income, gross (ex VAT), commission, refunds.
    const map = new Map<string, { month: string; source: string; gross: number; commission: number; refunds: number; fees: number; net: number; sales: number }>();
    for (const r of rows) {
      const month = riyadhMonth(r.occurred_at);
      const source = r.course_mode === "recorded" ? "كورس مسجَّل" : r.organization_name ? r.organization_name : "بيع مباشر للأفراد";
      const key = `${month}|${source}`;
      const t = map.get(key) ?? { month, source, gross: 0, commission: 0, refunds: 0, fees: 0, net: 0, sales: 0 };
      if (r.kind === "sale") {
        t.gross += cents(r.gross);
        t.sales += 1;
      } else t.refunds += cents(r.gross);
      t.commission += cents(r.commission);
      t.fees += cents(r.fee);
      t.net += cents(r.net);
      map.set(key, t);
    }
    lines = [["الشهر", "المصدر", "عدد المبيعات", "المبيعات قبل الضريبة", "المستردّ", "عمولة المنصة", "رسوم الاسترداد", "الصافي"].map(cell).join(",")];
    for (const t of [...map.values()].sort((a, b) => b.month.localeCompare(a.month) || a.source.localeCompare(b.source))) {
      lines.push([t.month, t.source, t.sales, fmt(t.gross), fmt(t.refunds), fmt(t.commission), fmt(t.fees), fmt(t.net)].map(cell).join(","));
    }
  } else {
    lines = [
      ["التاريخ", "النوع", "المرجع", "الدورة", "النمط", "المتدرب", "الإجمالي قبل الضريبة", "نسبة العمولة", "العمولة", "الرسوم", "الصافي", "يُفرَج في", "رقم التسوية"]
        .map(cell)
        .join(","),
    ];
    for (const r of rows) {
      lines.push(
        [
          r.occurred_at.slice(0, 10),
          KIND[r.kind] ?? r.kind,
          r.reference ?? "",
          r.course_title,
          MODE[r.course_mode] ?? r.course_mode,
          r.trainee_name,
          fmt(cents(r.gross)),
          `${Number(r.commission_percent)}%`,
          fmt(cents(r.commission)),
          fmt(cents(r.fee)),
          fmt(cents(r.net)),
          r.release_at ? r.release_at.slice(0, 10) : "",
          r.settlement_period ? settlementNumber(r.settlement_period.slice(0, 7)) : "",
        ]
          .map(cell)
          .join(","),
      );
    }
    const { data: withdrawals } = await supabase
      .from("trainer_withdrawals")
      .select("number, amount, fee, net_amount, status, failure_reason, created_at, completed_at")
      .eq("trainer_id", user.id)
      .order("created_at", { ascending: false });
    if (withdrawals && withdrawals.length > 0) {
      lines.push("", ["التاريخ", "طلب السحب", "المبلغ", "رسوم التحويل", "يصل إلى الحساب", "الحالة", "السبب", "تاريخ التحويل"].map(cell).join(","));
      for (const w of withdrawals) {
        lines.push(
          [w.created_at.slice(0, 10), w.number, fmt(cents(w.amount)), fmt(cents(w.fee)), fmt(cents(w.net_amount)), W_STATUS[w.status] ?? w.status, w.failure_reason ?? "", w.completed_at?.slice(0, 10) ?? ""]
            .map(cell)
            .join(","),
        );
      }
    }
  }

  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="trainer-${type === "income" ? "income" : "transactions"}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
