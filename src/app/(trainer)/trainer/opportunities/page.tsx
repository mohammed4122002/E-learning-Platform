import type { Metadata } from "next";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { ChipLink } from "@/components/ui/Chip";
import { ListControls } from "@/components/trainer-ops/ListControls";
import { EmptyOpportunities, MatchExplainer, MyBidsCard, OpportunityCard } from "@/components/trainer-bids/OpportunityParts";
import { requireTrainer } from "@/lib/auth";
import { getBidStats, listOpportunities, listTrainerBids, type Opportunity } from "@/lib/data/trainer-bids";
import { pluralAr, toArabicDigits } from "@/lib/format";
import { HIGH_MATCH_SCORE } from "@/lib/trainer-bids";

export const metadata: Metadata = { title: "الفرص", description: "طلبات تدريب من الجهات — مطابقة لتخصصك وتوفّرك" };

// Visual order in 280:6549 (right → left): مطابقة عالية · تنتهي قريبًا · عن بُعد · حضوري · كل الطلبات.
const FILTERS = [
  { key: "high", label: "مطابقة عالية" },
  { key: "soon", label: "تنتهي قريبًا" },
  { key: "remote", label: "عن بُعد" },
  { key: "in_person", label: "حضوري" },
  { key: "all", label: "كل الطلبات" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const SORTS = [
  { value: "deadline", label: "الأقرب مهلة أولًا" },
  { value: "match", label: "الأعلى مطابقة" },
  { value: "newest", label: "الأحدث نشرًا" },
];

const SOON_DAYS = 7;

function matches(o: Opportunity, f: FilterKey): boolean {
  if (f === "all") return true;
  if (f === "high") return o.scoreSpecialty > 0 && o.score >= HIGH_MATCH_SCORE;
  if (f === "soon") return new Date(o.bidsCloseAt).getTime() - Date.now() <= SOON_DAYS * 86_400_000;
  if (f === "remote") return o.mode === "live_remote";
  return o.mode === "in_person";
}

const arg = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

function countWord(n: number): string {
  if (n === 1) return "واحد";
  if (n === 2) return "اثنان";
  return toArabicDigits(n);
}

/** TRR-BID-01 · طلبات التدريب المتاحة — default 280:6393, empty 313:10693 (loading 464:36381 in loading.tsx). */
export default async function OpportunitiesPage({ searchParams }: PageProps<"/trainer/opportunities">) {
  await requireTrainer("/trainer/opportunities");
  const sp = await searchParams;
  const [all, bids, stats] = await Promise.all([listOpportunities(), listTrainerBids(), getBidStats()]);
  // Requests the trainer already bid on live in «عروضي»; a saved draft stays here to be completed.
  const open = all.filter((o) => !o.myBidStatus || o.myBidStatus === "draft");
  const matching = open.filter((o) => o.scoreSpecialty > 0);
  const high = open.filter((o) => matches(o, "high"));
  const requested = arg(sp.f) as FilterKey;
  const filter: FilterKey = FILTERS.some((f) => f.key === requested) ? requested : "high";

  if (matching.length === 0 && !FILTERS.some((f) => f.key === requested)) {
    return (
      <>
        <TopBar title="الفرص" subtitle="لا فرص مطابقة الآن" />
        <PageBody className="gap-6">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">تصفّح الفرص</h2>
            <p className="type-body-lg text-text-secondary">طلبات تدريب تنشرها الجهات — تُطابَق معك حسب تخصصك وتقييمك وتوفّرك.</p>
          </div>
          <EmptyOpportunities openCount={open.length} />
        </PageBody>
      </>
    );
  }

  const q = arg(sp.q).trim();
  const sort = SORTS.some((s) => s.value === arg(sp.sort)) ? arg(sp.sort) : "deadline";
  const searched = q ? open.filter((o) => `${o.title} ${o.organizationName}`.toLowerCase().includes(q.toLowerCase())) : open;
  const list = searched
    .filter((o) => matches(o, filter))
    .sort((a, b) => {
      if (sort === "match") return b.score - a.score;
      if (sort === "newest") return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
      return a.bidsCloseAt.localeCompare(b.bidsCloseAt);
    });
  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, searched.filter((o) => matches(o, f.key)).length])) as Record<FilterKey, number>;
  const href = (f: FilterKey) => {
    const p = new URLSearchParams();
    if (f !== "high") p.set("f", f);
    if (q) p.set("q", q);
    if (sort !== "deadline") p.set("sort", sort);
    const s = p.toString();
    return `/trainer/opportunities${s ? `?${s}` : ""}`;
  };
  const intro = `${pluralAr(open.length, ["طلب واحد مفتوح", "طلبان مفتوحان", "طلبات مفتوحة", "طلبًا مفتوحًا"])}، ${
    high.length === 0 ? "لا يطابقك أيٌّ منها بنسبة عالية" : `${countWord(high.length)} منها مطابقة لك بنسبة عالية`
  }. المطابقة تعتمد على تخصصك وتقييمك وتوفّرك في تقويمك.`;

  return (
    <>
      <TopBar title="الفرص" subtitle="طلبات تدريب من الجهات — مطابقة لتخصصك وتوفّرك" />
      <PageBody className="gap-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">الفرص المؤسسية</h2>
            <p className="type-body-lg text-text-secondary">{intro}</p>
          </div>
          <ButtonLink href="/trainer/bids" variant="outline" size="l" className="w-full sm:w-auto sm:min-w-[120px] sm:px-8">
            {`عروضي · ${toArabicDigits(stats.total)}`}
          </ButtonLink>
        </div>

        <nav aria-label="تصفية الطلبات" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex w-max items-center gap-2.5 sm:w-auto sm:flex-wrap">
            {FILTERS.map((f) => (
              <li key={f.key}>
                <ChipLink href={href(f.key)} selected={filter === f.key}>
                  {`${f.label} · ${toArabicDigits(counts[f.key])}`}
                </ChipLink>
              </li>
            ))}
          </ul>
        </nav>

        <ListControls sortOptions={SORTS} sort={sort} q={q} searchLabel="ابحث باسم الجهة أو الموضوع" sortWidth="sm:w-[260px]" />

        <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_343px]">
          {list.length === 0 ? (
            <p className="rounded-16 border-[1.5px] border-border-divider bg-bg-page px-6 py-10 text-center type-body text-text-secondary">
              لا طلبات تطابق هذا التصفية.
            </p>
          ) : (
            <ul aria-label="طلبات التدريب" className="flex min-w-0 flex-col gap-6">
              {list.map((o) => (
                <OpportunityCard key={o.id} o={o} top={o.score >= 70 && !o.conflict && o.scoreSpecialty > 0} />
              ))}
            </ul>
          )}
          <aside className="flex min-w-0 flex-col gap-5">
            <MatchExplainer />
            <MyBidsCard bids={bids.filter((b) => b.status !== "draft")} />
          </aside>
        </div>
      </PageBody>
    </>
  );
}
