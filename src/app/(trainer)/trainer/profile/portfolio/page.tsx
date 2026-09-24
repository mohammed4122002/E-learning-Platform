import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { BookOpen, FileText, Tv, X } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { PortfolioManager } from "@/components/trainer/PortfolioManager";
import { requireTrainer } from "@/lib/auth";
import { getPortfolio } from "@/lib/data/trainer-profile";

export const metadata: Metadata = { title: "معرض الأعمال", description: "أعمال حقيقية تنظر إليها الجهات قبل قبول عرضك" };

const COUNTS: { icon: LucideIcon; text: string; cls: string }[] = [
  { icon: Tv, text: "ورشة أو دورة نفّذتها", cls: "text-state-success" },
  { icon: FileText, text: "مادة تدريبية أعددتها", cls: "text-state-info" },
  { icon: BookOpen, text: "برنامج بنيته لجهة", cls: "text-text-brand" },
  { icon: X, text: "لا ترفع مواد لا تملك حقوقها", cls: "text-state-error" },
];

/** TRR-PRF-03 · معرض الأعمال — empty (464:34920) · default (464:35114) · saving (464:35384) · error (464:35658). */
export default async function PortfolioPage() {
  const user = await requireTrainer("/trainer/profile/portfolio");
  const items = await getPortfolio(user.id);
  return (
    <>
      <TopBar title="الملف المهني" subtitle="معرض الأعمال" />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "ملفي المهني", href: "/trainer/profile" }, { label: "معرض الأعمال" }]} />
        <div className="flex flex-col gap-[26px] lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <PortfolioManager userId={user.id} items={items} />
          </div>
          <aside className="flex w-full flex-col gap-[22px] lg:w-[400px] lg:shrink-0">
            <section id="what-counts" aria-labelledby="counts-title" className="flex scroll-mt-24 flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-7 shadow-card">
              <h2 id="counts-title" className="type-h3 text-text-primary">
                ما الذي يصلح كعمل؟
              </h2>
              <ul className="flex flex-col gap-5">
                {COUNTS.map((c) => (
                  <li key={c.text} className="flex items-start gap-2.5 rounded-12 bg-bg-page px-3.5 pt-3 pb-[13px] type-body text-text-primary">
                    <Glyph icon={c.icon} size={20} className={`mt-1 ${c.cls}`} />
                    <span className="flex-1">{c.text}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="impact-title" className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-7 shadow-card">
              <h2 id="impact-title" className="type-h3 text-text-primary">
                أثر المعرض
              </h2>
              <p className={`type-body ${items.length ? "text-text-secondary" : "text-state-warning"}`}>
                {items.length ? "معرضك يظهر في ملفك العام وفي كل عرض تقدّمه." : "ملفك بلا أعمال — الجهات تراه أقل إقناعًا من منافسيك."}
              </p>
              <ButtonLink href="/trainer/profile" variant="outline" fullWidth>
                عاين ملفي العام
              </ButtonLink>
            </section>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
