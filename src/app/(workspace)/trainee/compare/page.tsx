import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Award, Banknote, CircleCheck, CircleX, Clock, FileCheck, Gauge, GitCompareArrows, Info, MapPin, RefreshCw, Star, Users } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/ui/Navigation";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { requireTrainee } from "@/lib/auth";
import { getComparison, type CompareColumn } from "@/lib/data/compare";
import { COMPARE_MAX, COMPARE_MIN, DISCOVER_PATH, MODE_FILTER_LABELS, isUuid } from "@/lib/discover-params";
import { LEVEL_LABELS } from "@/lib/labels";
import { formatHours, formatPrice, formatRating, pluralAr, toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "مقارنة البرامج", description: "قارن حتى ثلاثة برامج جنبًا إلى جنب" };

type RowDef = { label: string; icon: LucideIcon; value: (c: CompareColumn) => string; yesNo?: (c: CompareColumn) => boolean };

const ROWS: RowDef[] = [
  { label: "السعر", icon: Banknote, value: (c) => (c.price === 0 ? "مجانية" : formatPrice(c.price, c.currency)) },
  { label: "المدة", icon: Clock, value: (c) => (c.hours ? formatHours(c.hours) : "—") },
  { label: "المستوى", icon: Gauge, value: (c) => LEVEL_LABELS[c.level] },
  { label: "التقييم", icon: Star, value: (c) => (c.ratingCount > 0 ? `${formatRating(c.rating)} (${toArabicDigits(c.ratingCount)})` : "لا تقييمات بعد") },
  { label: "نمط التقديم", icon: MapPin, value: (c) => MODE_FILTER_LABELS[c.mode] },
  {
    label: "المقاعد",
    icon: Users,
    value: (c) => (c.capacity === null || c.seatsLeft === null ? "بلا حد" : c.seatsLeft === 0 ? "اكتمل العدد" : `${toArabicDigits(c.seatsLeft)} من ${toArabicDigits(c.capacity)}`),
  },
  { label: "شهادة معتمدة", icon: Award, value: (c) => (c.certificate ? "نعم" : "لا"), yesNo: (c) => c.certificate },
  { label: "واجب عملي", icon: FileCheck, value: (c) => (c.assignment ? "نعم" : "لا"), yesNo: (c) => c.assignment },
  { label: "مهلة الاسترداد", icon: RefreshCw, value: (c) => c.refund },
];

function Cell({ best, children, strong }: { best: boolean; children: ReactNode; strong: boolean }) {
  return (
    <td className={`min-w-[180px] px-[18px] py-4 align-middle ${best ? "bg-bg-card" : "bg-bg-page"}`}>
      <span className={`flex items-center gap-2 ${strong ? "type-subtitle text-text-primary" : "type-body text-text-secondary"}`}>{children}</span>
    </td>
  );
}

/** TRN-CMP-01 · مقارنة البرامج — Figma 219:12949. Rows that differ between the columns are emphasised (Medium, text/primary). */
export default async function ComparePage({ searchParams }: PageProps<"/trainee/compare">) {
  const user = await requireTrainee("/trainee/compare");
  const sp = await searchParams;
  const raw = typeof sp.ids === "string" ? sp.ids : Array.isArray(sp.ids) ? sp.ids.join(",") : "";
  const ids = [...new Set(raw.split(",").map((s) => s.trim()).filter(isUuid))].slice(0, COMPARE_MAX);
  const columns = await getComparison(ids, user.id);

  const top = (
    <>
      <TopBar title="مقارنة البرامج" subtitle="قارن حتى ثلاثة برامج جنبًا إلى جنب" />
    </>
  );

  if (columns.length < COMPARE_MIN) {
    return (
      <>
        {top}
        <PageBody className="!gap-6">
          <Breadcrumb items={[{ label: "اكتشف دورة", href: DISCOVER_PATH }, { label: "المقارنة" }]} />
          <EmptyState
            icon={GitCompareArrows}
            title="اختر برنامجين على الأقل للمقارنة"
            description="من صفحة الاكتشاف، اضغط «قارن» على بطاقتين أو ثلاث ثم افتح المقارنة من الشريط السفلي."
            action={<ButtonLink href={columns.length ? `${DISCOVER_PATH}?compare=${columns.map((c) => c.id).join(",")}` : DISCOVER_PATH}>اختر البرامج</ButtonLink>}
          />
        </PageBody>
      </>
    );
  }

  const categories = new Set(columns.map((c) => c.categoryName));
  const sameCategory = categories.size === 1 && columns[0].categoryName;
  const count = pluralAr(columns.length, ["برنامج واحد", "برنامجان", "برامج", "برنامجًا"]);
  const addHref = `${DISCOVER_PATH}?compare=${columns.map((c) => c.id).join(",")}`;

  return (
    <>
      {top}
      <PageBody className="!gap-6">
        <Breadcrumb items={[{ label: "اكتشف دورة", href: DISCOVER_PATH }, { label: "المقارنة" }]} />
        <header className="flex flex-col gap-1.5">
          <h1 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">مقارنة البرامج</h1>
          <p className="type-body-lg text-text-secondary">
            {columns.length === 3 ? "ثلاثة برامج" : count}
            {sameCategory ? ` في مجال ${sameCategory}` : ""}. الفروق الجوهرية مميّزة تلقائيًا لتسهيل القرار.
          </p>
        </header>

        <div className="w-full overflow-x-auto rounded-16 border border-border-default bg-bg-card shadow-card">
          <table className="w-full border-collapse text-start">
            <caption className="sr-only">مقارنة {count}</caption>
            <thead>
              <tr className="bg-bg-page align-top">
                <th scope="col" className="w-[220px] min-w-[150px] p-5 text-start type-subtitle text-text-muted">
                  عنصر المقارنة
                </th>
                {columns.map((c) => (
                  <th key={c.id} scope="col" className={`min-w-[180px] p-[18px] text-start font-normal ${c.best ? "bg-bg-brand-tint" : "bg-bg-page"}`}>
                    <div className="flex flex-col gap-2.5">
                      {c.best && (
                        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-text-brand">
                          <Glyph icon={CircleCheck} size={16} />
                          الأنسب لمسارك
                        </span>
                      )}
                      <span className="type-title text-text-primary">{c.title}</span>
                      <span className="type-caption text-text-muted">{c.provider}</span>
                      <ButtonLink href={`/trainee/programs/${c.programSlug}`} size="s" fullWidth variant={c.best ? "primary" : "outline"}>
                        اعرض البرنامج
                      </ButtonLink>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => {
                const values = columns.map(row.value);
                const differs = new Set(values).size > 1;
                return (
                  <tr key={row.label}>
                    <th scope="row" className={`px-5 py-4 text-start font-normal ${i % 2 === 0 ? "bg-bg-surface" : "bg-bg-page"}`}>
                      <span className="flex items-center gap-2.5 type-body text-text-secondary">
                        <Glyph icon={row.icon} size={16} />
                        {row.label}
                        {differs && <span className="sr-only"> (يختلف بين البرامج)</span>}
                      </span>
                    </th>
                    {columns.map((c, j) => (
                      <Cell key={c.id} best={c.best} strong={differs}>
                        {row.yesNo &&
                          (row.yesNo(c) ? (
                            <Glyph icon={CircleCheck} size={20} className="text-state-success" />
                          ) : (
                            <Glyph icon={CircleX} size={20} className="text-text-muted" />
                          ))}
                        {values[j]}
                      </Cell>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-start gap-5 rounded-12 bg-bg-page px-5 py-4 sm:flex-row sm:items-center">
          <Glyph icon={Info} size={20} className="text-text-brand max-sm:hidden" />
          <p className="min-w-0 flex-1 type-body text-text-secondary">
            الصفوف المميّزة بخط أغمق هي التي تختلف فعليًا بين البرامج — ركّز عليها في قرارك. يمكنك مقارنة ثلاثة برامج كحد أقصى.
          </p>
          <ButtonLink href={addHref} variant="outline" disabled={columns.length >= COMPARE_MAX}>
            أضف برنامجًا للمقارنة
          </ButtonLink>
        </div>
      </PageBody>
    </>
  );
}
