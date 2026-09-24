import type { Metadata } from "next";
import { CircleCheckBig, Hourglass, Landmark, Star } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { LabeledProgress } from "@/components/trainings/ui";
import { DashCard } from "@/components/trainer/DashboardParts";
import { ExperienceSection, PhotoAndBio, ProgramsVisibility, QualificationsSection, VisibilityCard, type VisibilityRow } from "@/components/trainer/ProfileEditor";
import { PHASE_LABEL, type ProgramPhase } from "@/lib/trainer-programs";
import { requireTrainer } from "@/lib/auth";
import { getTrainerOverview, profileStrength, type TrainerOverview } from "@/lib/data/trainer";
import { getTrainerOrganizations, visibilityOf } from "@/lib/data/trainer-profile";
import { avatarUrl } from "@/lib/storage";
import { formatDate, formatRating, pluralAr, toArabicDigits } from "@/lib/format";
import { AUDIENCES, EXPERIENCE_BANDS, MODE_SHORT, fieldTitle, joinArabic } from "@/lib/trainer";

export const metadata: Metadata = { title: "إدارة الملف المهني", description: "عدّل ما يظهر للجهات في ملفك المهني" };

/** «اقترح نبذة لي»: a first draft built from the onboarding answers — the trainer reviews it before it is saved. */
function suggestBio(o: TrainerOverview): string {
  const p = o.profile;
  if (!p) return "";
  const fields = joinArabic(p.specialties.map(fieldTitle));
  const band = EXPERIENCE_BANDS.find((b) => b.value === p.experience_band)?.title;
  const modes = joinArabic((["in_person", "live_remote", "recorded"] as const).filter((m) => p.delivery_modes.includes(m)).map((m) => MODE_SHORT[m]));
  const audience = AUDIENCES.find((a) => a.value === p.audience)?.value;
  return [
    fields ? `مدرب في ${fields}${band ? ` بخبرة تدريبية ${band.startsWith("أ") ? band : `${band}`}` : ""}.` : "",
    modes ? `أقدّم برامج ${modes}${audience === "organizations" ? " للجهات التدريبية" : audience === "individuals" ? " للمتدربين الأفراد" : " للأفراد والجهات"}.` : "",
    "أركّز على التطبيق العملي: كل جلسة تنتهي بمخرَج يستخدمه المتدرب في عمله مباشرة.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Only published programs can be shown; others say why not (their lifecycle label comes from status + review_state). */
const programCaption = (courses: number, rating: number | null, phase: ProgramPhase) =>
  phase !== "published" ? `${PHASE_LABEL[phase]} · لا تظهر قبل النشر` : `${pluralAr(courses, ["دورة واحدة", "دورتان", "دورات", "دورة"])}${rating ? ` · ${formatRating(rating)} تقييم` : ""}`;

/** TRR-PRF-02 · إدارة الملف المهني (290:7769). */
export default async function TrainerProfileEditPage(props: PageProps<"/trainer/profile/edit">) {
  const user = await requireTrainer("/trainer/profile/edit");
  const sp = await props.searchParams;
  const [o, orgs] = await Promise.all([getTrainerOverview(user.id), getTrainerOrganizations(user.id)]);
  const vis = visibilityOf(o);
  const strength = profileStrength(o);
  const hidden = new Set(o.profile?.hidden_program_ids ?? []);
  const suggestion = sp.suggest === "bio" && !o.account.bio?.trim() ? suggestBio(o) : null;
  const rows: VisibilityRow[] = [
    { key: "profile", label: "الصورة والاسم والنبذة", level: vis.profile },
    { key: "credentials", label: "الاعتمادات والمؤهلات", level: vis.credentials },
    { key: "experience", label: "الخبرات والسيرة الذاتية", level: vis.experience },
    { key: "availability", label: "التوفّر وأقرب موعد", level: vis.availability },
    { key: "trainees", label: "عدد متدربيك", level: vis.trainees },
  ];
  const s = o.stats;

  return (
    <>
      <TopBar title="إدارة ملفي المهني" subtitle="عدّل ما يظهر للجهات" />
      <PageBody className="gap-6">
        <div className="flex flex-col gap-4 rounded-22 bg-bg-brand-tint px-5 py-[18px] sm:flex-row sm:items-center sm:px-[22px]">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">إدارة ملفي المهني</h2>
            <p className="type-body-lg text-text-secondary">كل قسم موسوم بمن يراه. اضغط «عاين ملفي العام» في أي وقت لترى النتيجة بعيني الجهة.</p>
          </div>
          <ButtonLink href="/trainer/profile?view=preview" size="l" className="w-full sm:w-auto">
            عاين ملفي العام
          </ButtonLink>
          <p className="flex items-center gap-2 type-subtitle text-state-success">
            <Glyph icon={CircleCheckBig} size={20} />
            كل تعديل يُحفظ فورًا
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <PhotoAndBio
              userId={user.id}
              fullName={o.account.fullName || user.fullName}
              avatarSrc={avatarUrl(o.account.avatarPath)}
              headline={o.account.headline ?? ""}
              bio={o.account.bio ?? ""}
              suggestion={suggestion}
              level={vis.profile}
            />
            <QualificationsSection
              userId={user.id}
              verified={o.identityStatus === "verified"}
              verifiedLabel={`متحقَّق من المنصة · لا يُعدَّل${o.identityVerifiedAt ? ` · ${formatDate(o.identityVerifiedAt)}` : ""}`}
              items={o.qualifications.map((q) => ({ id: q.id, kind: q.kind, title: q.title, issuer: q.issuer, year: q.year, hasFile: q.hasFile }))}
              level={vis.credentials}
            />
            <ExperienceSection
              userId={user.id}
              items={o.experiences.map((e) => ({ id: e.id, title: e.title, organization: e.organization, startMonth: e.startDate.slice(0, 7), endMonth: e.endDate?.slice(0, 7) ?? null, isCurrent: e.isCurrent }))}
              cv={o.profile?.cv_path ? { name: o.profile.cv_name ?? "السيرة_الذاتية.pdf", size: o.profile.cv_size ?? 0 } : null}
              level={vis.experience}
            />
            <ProgramsVisibility
              level="public"
              programs={o.programs
                .filter((p) => p.phase !== "suspended")
                .map((p) => ({ id: p.id, title: p.title, caption: programCaption(p.coursesCount, p.ratingAvg, p.phase), visible: p.phase === "published" && !hidden.has(p.id), disabled: p.phase !== "published" }))}
            />
          </div>

          <aside className="flex w-full flex-col gap-5 lg:w-[400px] lg:shrink-0">
            <VisibilityCard rows={rows} />
            <DashCard radius={22} labelledBy="strength-title" className="gap-[18px]">
              <h2 id="strength-title" className="type-h2 text-text-primary">
                قوة ملفك
              </h2>
              <LabeledProgress label={`${toArabicDigits(strength.done)} من ${toArabicDigits(strength.total)} عناصر مكتملة`} percent={strength.percent} />
              <ul className="flex flex-col gap-[18px]">
                {strength.items.map((i) => (
                  <li key={i.key} className={`flex items-center gap-2.5 rounded-12 px-3.5 py-[11px] type-subtitle ${i.done ? "bg-state-success-bg text-state-success" : "bg-bg-page text-text-secondary"}`}>
                    <Glyph icon={i.done ? CircleCheckBig : Hourglass} size={20} className={i.done ? "" : "text-text-muted"} />
                    <span className="flex-1">{i.label}</span>
                  </li>
                ))}
              </ul>
            </DashCard>
            <DashCard radius={22} labelledBy="ratings-title" className="gap-[18px]">
              <h2 id="ratings-title" className="type-h2 text-text-primary">
                إدارة تقييماتك
              </h2>
              <div className="flex items-center gap-3 rounded-12 bg-state-error-bg px-4 py-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-error">
                  <Glyph icon={Star} size={20} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <p className="type-subtitle text-state-error">
                    {s.ratingCount === 0 ? "لا تقييمات بعد" : s.lowRatings > 0 ? `${pluralAr(s.lowRatings, ["تقييم منخفض واحد", "تقييمان منخفضان", "تقييمات منخفضة", "تقييمًا منخفضًا"])} هذا الشهر` : `${pluralAr(s.ratingCount, ["تقييم واحد", "تقييمان", "تقييمات", "تقييمًا"])} · ${formatRating(s.ratingTrainer ?? 0)}`}
                  </p>
                  <p className="type-caption text-text-muted">الرد المهني يرفع ثقة القرّاء</p>
                </div>
              </div>
              <ButtonLink href="/trainer/profile#reviews" size="l" fullWidth>
                ردّ على التقييمات
              </ButtonLink>
              <ButtonLink href="/trainer/help/trainer-raise-rating" variant="outline" size="l" fullWidth>
                حلّل اتجاه تقييمي
              </ButtonLink>
            </DashCard>
            <DashCard radius={22} labelledBy="orgs-title" className="gap-[18px]">
              <h2 id="orgs-title" className="scroll-mt-24 type-h2 text-text-primary">
                <span id="organizations" />
                الجهات المرتبطة
              </h2>
              <p className="type-body text-text-muted">تظهر في ملفك العام كإشارة ثقة.</p>
              {orgs.length === 0 ? (
                <p className="rounded-12 bg-bg-page px-4 py-4 type-small text-text-muted">لا جهات مرتبطة بعد — تظهر هنا عند ارتباطك بجهة تدريبية.</p>
              ) : (
                <ul className="flex flex-col gap-[18px]">
                  {orgs.map((g) => (
                    <li key={g.id} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-success">
                        <Glyph icon={Landmark} size={20} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="type-subtitle text-text-primary">{g.name}</span>
                        <span className="type-caption text-state-success">نشط منذ {toArabicDigits(new Date(g.since).getFullYear())}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <ButtonLink href="/trainer/affiliations" variant="outline" size="l" fullWidth>
                أدر الارتباطات
              </ButtonLink>
            </DashCard>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
