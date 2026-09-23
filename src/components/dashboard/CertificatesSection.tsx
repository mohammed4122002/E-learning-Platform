import { certificatesSection } from "@/lib/dashboard-data";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AchievementsCard } from "./AchievementsCard";
import { CertificateCard } from "./CertificateCard";

export function CertificatesSection() {
  const { title, link, achievementsTitle, certificates, achievements } = certificatesSection;
  return (
    <section aria-labelledby="certificates-title" className="flex flex-col gap-[18px]">
      <SectionHeader id="certificates-title" title={title} linkLabel={link} />
      <div className="flex w-full flex-col items-start gap-5 xl:flex-row">
        <AchievementsCard title={achievementsTitle} achievements={achievements} />
        <div className="grid w-full min-w-0 flex-1 grid-cols-1 items-start gap-5 md:grid-cols-2">
          {certificates.map((certificate) => (
            <CertificateCard key={certificate.id} certificate={certificate} />
          ))}
        </div>
      </div>
    </section>
  );
}
