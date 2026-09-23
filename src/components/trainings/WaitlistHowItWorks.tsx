import { Banknote, BellRing, Hourglass, Users } from "lucide-react";
import { HowItWorks } from "./ui";

/** "كيف تعمل قائمة الانتظار؟" (177:8127) — the rules enforced by join_waitlist / invite_next_waitlisted. */
export function WaitlistHowItWorks() {
  return (
    <HowItWorks
      id="waitlist-how"
      title="كيف تعمل قائمة الانتظار؟"
      items={[
        { icon: Banknote, title: "لا دفع مسبق", text: "لا يُخصم أي مبلغ إلا بعد قبولك للمقعد." },
        { icon: Hourglass, title: "مهلة محددة", text: "لك ٢٤ ساعة لقبول المقعد، وبعدها ينتقل للتالي في الترتيب." },
        { icon: BellRing, title: "إشعار فوري", text: "يصلك تنبيه في المنصة فور شغور مقعد." },
        { icon: Users, title: "ترتيب عادل", text: "من انضم أولًا يُعرض عليه المقعد أولًا." },
      ]}
    />
  );
}
