import type { Metadata } from "next";
import { Bell, Bookmark } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { ChipLink } from "@/components/ui/Chip";
import { Alert, EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { PageHeading } from "@/components/ui/PageHeading";
import { CourseCard } from "@/components/course/CourseCard";
import { FavoriteButton } from "@/components/course/FavoriteButton";
import { requireTrainee } from "@/lib/auth";
import { getFavorites, type FavoriteAvailability } from "@/lib/data/favorites";
import { pluralAr, toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "المفضلة", description: "البرامج التي حفظتها — ننبّهك عند فتح دورة جديدة أو تغيّر السعر." };

const FILTERS: { key: "all" | FavoriteAvailability; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "available", label: "فيها دورات متاحة" },
  { key: "full", label: "مكتملة المقاعد" },
  { key: "unscheduled", label: "بلا دورات مجدولة" },
];

/** TRN-FAV-01 · المفضلة — Figma 217:12252. */
export default async function FavoritesPage({ searchParams }: PageProps<"/trainee/favorites">) {
  const user = await requireTrainee("/trainee/favorites");
  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.key === sp.filter) ? (sp.filter as (typeof FILTERS)[number]["key"]) : "all";
  const items = await getFavorites(user.id);
  const count = (k: (typeof FILTERS)[number]["key"]) => (k === "all" ? items.length : items.filter((i) => i.availability === k).length);
  const shown = filter === "all" ? items : items.filter((i) => i.availability === filter);

  const limited = items.filter((i) => i.availability === "available" && i.seatsLeft !== null && i.seatsLeft <= 5);
  const full = items.filter((i) => i.availability === "full");
  const updates = [
    ...limited.map((i) => `قاربت مقاعد «${i.card.title}» على الاكتمال (${pluralAr(i.seatsLeft!, ["مقعد واحد", "مقعدان", "مقاعد", "مقعدًا"])} متبقية).`),
    ...full.map((i) => `اكتملت مقاعد «${i.card.title}» — انضم لقائمة الانتظار من صفحتها.`),
  ];

  return (
    <>
      <TopBar title="المفضلة" subtitle="البرامج التي حفظتها" />
      <PageBody className="gap-6">
        <PageHeading
          title="المفضلة"
          description={
            items.length
              ? `${pluralAr(items.length, ["برنامج واحد محفوظ", "برنامجان محفوظان", "برامج محفوظة", "برنامجًا محفوظًا"])}. سنُنبّهك عند فتح دورة جديدة أو تغيّر السعر في أي منها.`
              : "احفظ البرامج التي تهمّك لتعود إليها لاحقًا — سنُنبّهك عند فتح دورة جديدة أو تغيّر السعر."
          }
        />

        {items.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="لا برامج محفوظة بعد"
            description="اضغط رمز الحفظ على أي دورة لتظهر هنا، وتصلك التنبيهات بأي جديد فيها."
            action={<ButtonLink href="/trainee/discover">اكتشف دورة</ButtonLink>}
          />
        ) : (
          <>
            {updates.length > 0 && (
              <Alert tone="info" title={updates.length === 1 ? "تحديث في مفضلتك" : `${pluralAr(updates.length, ["تحديث", "تحديثان", "تحديثات", "تحديثًا"])} في مفضلتك`}>
                {updates.join(" ")}
              </Alert>
            )}
            <nav aria-label="تصفية المفضلة" className="flex w-full flex-wrap items-center gap-2.5">
              {FILTERS.map((f) => (
                <ChipLink key={f.key} href={f.key === "all" ? "/trainee/favorites" : `/trainee/favorites?filter=${f.key}`} selected={filter === f.key} className={f.key === "all" ? "min-w-[120px]" : ""}>
                  {f.label} · {toArabicDigits(count(f.key))}
                </ChipLink>
              ))}
            </nav>
            {shown.length ? (
              <ul className="grid w-full grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
                {shown.map((i) => (
                  <li key={i.card.id} className="relative flex">
                    <CourseCard course={i.card} />
                    <FavoriteButton courseId={i.card.id} courseTitle={i.card.title} initialSaved className="absolute top-3 left-3" />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Bookmark} title="لا برامج في هذا التصنيف" description="غيّر التصفية لعرض بقية برامجك المحفوظة." action={<ButtonLink href="/trainee/favorites" variant="outline">اعرض الكل</ButtonLink>} />
            )}
          </>
        )}

        <div className="flex w-full flex-col items-start gap-3 rounded-12 bg-bg-page px-[18px] py-4 sm:flex-row sm:items-center">
          <Glyph icon={Bell} size={20} className="hidden text-text-secondary sm:block" />
          <p className="min-w-0 flex-1 type-body text-text-secondary">نُنبّهك تلقائيًا عند فتح دورة جديدة · تغيّر السعر · قرب اكتمال المقاعد في أي برنامج محفوظ.</p>
          <ButtonLink href="/account?tab=notifications" variant="outline" className="w-full sm:w-auto sm:min-w-[120px]">
            أدر التنبيهات
          </ButtonLink>
        </div>
      </PageBody>
    </>
  );
}
