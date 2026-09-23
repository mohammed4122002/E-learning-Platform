import { EyeOff, Landmark, Lock, Trash2 } from "lucide-react";
import { TileRow } from "@/components/profile/bits";

const ROWS = [
  { icon: Lock, title: "مشفّرة من لحظة الرفع", caption: "لا يطّلع عليها إلا فريق التوثيق المختص." },
  { icon: Landmark, title: "لا تُشارك مع أي جهة تدريبية", caption: "الجهة ترى «موثَّق» فقط — لا ترى مستندك ولا رقمه." },
  { icon: Trash2, title: "تُحذف بعد ٩٠ يومًا", caption: "فور اكتمال التحقق يبقى القرار ويُحذف المستند نفسه." },
  { icon: EyeOff, title: "لا تظهر في ملفك", caption: "لا في الملف العام ولا الخاص — فقط شارة «هوية موثَّقة»." },
];

/** TRN-VER-01/02 side card «ماذا يحدث لمستنداتك؟». */
export function DocumentsSafety() {
  return (
    <section aria-labelledby="docs-safety-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
      <h2 id="docs-safety-title" className="type-h3 text-text-primary">
        ماذا يحدث لمستنداتك؟
      </h2>
      <ul className="flex flex-col gap-4">
        {ROWS.map((r) => (
          <li key={r.title}>
            <TileRow icon={r.icon} title={r.title} caption={r.caption} tone="success" iconClass="text-state-success" />
          </li>
        ))}
      </ul>
    </section>
  );
}
