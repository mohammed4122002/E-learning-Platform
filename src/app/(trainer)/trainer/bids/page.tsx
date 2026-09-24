import type { Metadata } from "next";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { ChipLink } from "@/components/ui/Chip";
import { Alert, EmptyState } from "@/components/ui/Feedback";
import { Pagination } from "@/components/ui/Navigation";
import { ListControls } from "@/components/trainer-ops/ListControls";
import { BidCardRow, BidCompactRow, BidStat, RaiseAcceptanceCard, RejectionReasonsCard } from "@/components/trainer-bids/BidListParts";
import { requireTrainer } from "@/lib/auth";
import { getBidStats, listTrainerBids, type TrainerBid } from "@/lib/data/trainer-bids";
import { formatPercent, pluralAr, toArabicDigits } from "@/lib/format";
import { Compass } from "lucide-react";

export const metadata: Metadata = { title: "عروضي", description: "متابعة العروض المقدَّمة على طلبات الجهات" };

/** From this many offers the list switches to the compact «عروض كثيرة» layout (328:12395). */
const MANY = 10;
const PAGE_SIZE = 10;

// 309:10357 (right → left): الكل · لم تُقبل · قيد المراجعة · مقبولة.
const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "rejected", label: "لم تُقبل" },
  { key: "pending", label: "قيد المراجعة" },
  { key: "accepted", label: "مقبولة" },
] as const;
// 328:12580 (right → left): يحتاج إجراءك · أكثر من ٥٬٠٠٠ ر.س · هذا الشهر · لم تُقبل · مقبولة · قيد المراجعة · الكل.
const MANY_FILTERS = [
  { key: "action", label: "يحتاج إجراءك" },
  { key: "over5k", label: "أكثر من ٥٬٠٠٠ ر.س" },
  { key: "month", label: "هذا الشهر" },
  { key: "rejected", label: "لم تُقبل" },
  { key: "accepted", label: "مقبولة" },
  { key: "pending", label: "قيد المراجعة" },
  { key: "all", label: "الكل" },
] as const;
type FilterKey = (typeof MANY_FILTERS)[number]["key"];

const SORTS = [
  { value: "deadline", label: "الأقرب مهلة أولًا" },
  { value: "newest", label: "الأحدث تقديمًا" },
  { value: "price", label: "الأعلى سعرًا" },
];

function riyadhMonth(d: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Asia/Riyadh" }).format(new Date(d));
}

function matches(b: TrainerBid, f: FilterKey): boolean {
  switch (f) {
    case "all":
      return true;
    case "accepted":
      return b.status === "accepted";
    case "pending":
      return b.status === "submitted" || b.status === "shortlisted";
    case "rejected":
      return b.status === "rejected";
    case "action":
      return b.status === "accepted" && !b.contractedAt && b.negotiationStatus !== "awaiting_org";
    case "over5k":
      return b.terms.price > 5000;
    case "month":
      return Boolean(b.submittedAt) && riyadhMonth(b.submittedAt!) === riyadhMonth(new Date());
  }
}

function deadlineOf(b: TrainerBid): string {
  if (b.status === "accepted") return b.contractDueAt ?? "9999";
  if (b.status === "submitted" || b.status === "shortlisted") return b.bidsCloseAt;
  return `9999-${b.updatedAt}`;
}

const arg = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
const word = (n: number, one: string, two: string) => (n === 1 ? one : n === 2 ? two : toArabicDigits(n));

/** TRR-BID-03 · عروضي وحالتها — default 309:10184, filtered / many 328:12395. */
export default async function BidsPage({ searchParams }: PageProps<"/trainer/bids">) {
  await requireTrainer("/trainer/bids");
  const sp = await searchParams;
  const [all, stats] = await Promise.all([listTrainerBids(), getBidStats()]);
  const bids = all.filter((b) => b.status !== "draft");
  const many = bids.length >= MANY;
  const accepted = bids.filter((b) => matches(b, "accepted")).length;
  const pending = bids.filter((b) => matches(b, "pending")).length;
  const rejected = bids.filter((b) => matches(b, "rejected")).length;
  const needAction = bids.filter((b) => matches(b, "action")).length;
  const rate = stats.total ? (stats.accepted / stats.total) * 100 : 0;
  const sent = arg(sp.sent);

  const header = (subtitle: string) => (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">عروضي</h2>
        <p className="type-body-lg text-text-secondary">{subtitle}</p>
      </div>
      <ButtonLink href="/trainer/opportunities" variant="outline" size="l" className="w-full sm:w-auto">
        تصفّح فرصًا جديدة
      </ButtonLink>
    </div>
  );

  if (bids.length === 0) {
    return (
      <>
        <TopBar title="عروضي" subtitle="متابعة العروض المقدَّمة" />
        <PageBody className="gap-6">
          {header("لم تقدّم عروضًا بعد.")}
          <EmptyState
            icon={Compass}
            title="لا عروض بعد"
            description="قدّم عرضًا على طلب تدريب من جهة، وتابع حالته وقرار الجهة من هنا."
            action={<ButtonLink href="/trainer/opportunities">تصفّح الفرص</ButtonLink>}
          />
        </PageBody>
      </>
    );
  }

  const filters = many ? MANY_FILTERS : FILTERS;
  const requested = arg(sp.status) as FilterKey;
  const defaultFilter: FilterKey = many && needAction > 0 ? "action" : "all";
  const filter: FilterKey = filters.some((f) => f.key === requested) ? requested : defaultFilter;
  const q = arg(sp.q).trim();
  const sort = SORTS.some((s) => s.value === arg(sp.sort)) ? arg(sp.sort) : "deadline";
  const searched = q ? bids.filter((b) => `${b.requestTitle} ${b.organizationName}`.toLowerCase().includes(q.toLowerCase())) : bids;
  const filtered = searched
    .filter((b) => matches(b, filter))
    .sort((a, b) => {
      if (sort === "newest") return (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "");
      if (sort === "price") return b.terms.price - a.terms.price;
      return deadlineOf(a).localeCompare(deadlineOf(b));
    });
  const pageCount = many ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)) : 1;
  const page = Math.min(Math.max(1, Number(arg(sp.page)) || 1), pageCount);
  const shown = many ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : filtered;
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { status: filter === defaultFilter ? undefined : filter, q: q || undefined, sort: sort === "deadline" ? undefined : sort, ...patch };
    Object.entries(next).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return `/trainer/bids${s ? `?${s}` : ""}`;
  };
  const chips = (
    <nav aria-label="تصفية العروض" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max items-center gap-2.5 sm:w-auto sm:flex-wrap">
        {filters.map((f) => (
          <li key={f.key}>
            <ChipLink href={href({ status: f.key === defaultFilter ? undefined : f.key, page: undefined })} selected={filter === f.key}>
              {`${f.label} · ${toArabicDigits(searched.filter((b) => matches(b, f.key)).length)}`}
            </ChipLink>
          </li>
        ))}
      </ul>
    </nav>
  );
  const controls = <ListControls sortOptions={SORTS} sort={sort} q={q} searchLabel="ابحث باسم الجهة أو الموضوع" sortWidth="sm:w-[260px]" />;
  const sentAlert = sent ? <Alert tone="success" title="أُرسل عرضك للجهة. تصلك إشعارات بقرارها هنا وفي الإشعارات." /> : null;
  const emptyFilter = (
    <p className="rounded-16 border-[1.5px] border-border-divider bg-bg-page px-6 py-10 text-center type-body text-text-secondary">لا عروض تطابق هذا التصفية.</p>
  );

  if (many) {
    const subtitle = `${pluralAr(bids.length, ["عرض واحد مقدَّم", "عرضان مقدَّمان", "عروض مقدَّمة", "عرضًا مقدَّمًا"])} · ${toArabicDigits(accepted)} بانتظار تعاقدك و${toArabicDigits(pending)} قيد المراجعة. رتّبها بما يهمّك الآن.`;
    return (
      <>
        <TopBar title="عروضي" subtitle={`${pluralAr(bids.length, ["عرض واحد", "عرضان", "عروض", "عرضًا"])} · فلترة وترتيب`} />
        <PageBody className="gap-6">
          {header(subtitle)}
          {sentAlert}
          <ul aria-label="ملخص العروض" className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            <BidStat icon="growth" tone="success" tile="surface" value={formatPercent(rate)} label="نسبة قبولك" />
            <BidStat icon="octagonX" tone="neutral" tile="surface" value={toArabicDigits(rejected)} label="لم تُقبل" />
            <BidStat icon="hourglass" tone="warning" tile="surface" value={toArabicDigits(pending)} label="قيد المراجعة" />
            <BidStat icon="alert" tone="error" tile="surface" value={toArabicDigits(accepted)} label="بانتظار تعاقدك" alert={accepted > 0} />
          </ul>
          {controls}
          {chips}
          {shown.length === 0 ? (
            emptyFilter
          ) : (
            <ul aria-label="العروض" className="flex flex-col gap-3.5">
              {shown.map((b) => (
                <BidCompactRow key={b.id} b={b} />
              ))}
            </ul>
          )}
          <div className="flex justify-center pt-2">
            <Pagination page={page} pageCount={pageCount} hrefFor={(p) => href({ page: p > 1 ? String(p) : undefined })} />
          </div>
        </PageBody>
      </>
    );
  }

  const subtitle = `${pluralAr(bids.length, ["عرض واحد", "عرضان", "عروض", "عرضًا"])} · ${
    accepted === 0 ? "لا عرض مقبول بعد" : `${word(accepted, "واحد مقبول", "اثنان مقبولان")}${accepted > 2 ? " مقبولة" : ""} بانتظار تعاقدك`
  }، و${pending === 0 ? "لا شيء" : word(pending, "واحد", "اثنان")} قيد المراجعة.`;
  return (
    <>
      <TopBar title="عروضي" subtitle="متابعة العروض المقدَّمة" />
      <PageBody className="gap-6">
        {header(subtitle)}
        {sentAlert}
        <ul aria-label="ملخص العروض" className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          <BidStat icon="growth" tone="info" value={formatPercent(rate)} label="نسبة قبولك" />
          <BidStat icon="hourglass" tone="warning" value={toArabicDigits(pending)} label="قيد المراجعة" />
          <BidStat icon="check" tone="success" value={toArabicDigits(accepted)} label="مقبول" />
          <BidStat icon="file" tone="brand" value={toArabicDigits(bids.length)} label={pluralAr(bids.length, ["عرض مقدَّم", "عرضان مقدَّمان", "عروض مقدَّمة", "عرضًا مقدَّمًا"]).replace(/^[٠-٩]+ /, "")} />
        </ul>
        {controls}
        {chips}
        <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {shown.length === 0 ? (
            emptyFilter
          ) : (
            <ul aria-label="العروض" className="flex min-w-0 flex-col gap-6">
              {shown.map((b) => (
                <BidCardRow key={b.id} b={b} />
              ))}
            </ul>
          )}
          <aside className="flex min-w-0 flex-col gap-5">
            <RejectionReasonsCard reasons={stats.reasons} rejected={rejected} />
            <RaiseAcceptanceCard />
          </aside>
        </div>
      </PageBody>
    </>
  );
}
