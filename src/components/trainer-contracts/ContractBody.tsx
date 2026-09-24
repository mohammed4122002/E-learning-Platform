import Link from "next/link";
import { ChevronLeft, CircleCheckBig, Info, Lock, Percent, Reply, Shield, TrendingUp, Wallet } from "lucide-react";
import { ActionButton } from "@/components/trainer-affiliations/ActionButtons";
import { Glyph } from "@/components/ui/Icon";
import type { ContractView } from "@/lib/data/trainer-contracts";
import { formatDayMonth, formatNumber, formatTime, pluralAr } from "@/lib/format";
import { daysUntil } from "@/lib/trainer-affiliations";
import { money2, netOf, roundsOf, termRows, termsCountLabel } from "@/lib/trainer-contracts";

/*
 * Lower part shared by TRR-CTR-01/02/03 (4265:2 · 4265:479 · 4265:859 · 4265:1226): the agreement hero, the final
 * terms, the negotiation log, the net earnings and «الخطوة التالية». Everything comes from the signed-able version.
 */

const signBtn =
  "inline-flex h-12 min-w-[120px] shrink-0 items-center justify-center whitespace-nowrap rounded-12 bg-action-primary px-6 type-button text-text-on-brand shadow-[0_6px_18px_0_rgba(91,60,196,0.28)] hover:bg-action-primary-hover focus-ring";
const disabledBtn = "inline-flex shrink-0 cursor-not-allowed items-center justify-center rounded-12 bg-bg-disabled text-text-disabled";

export function ContractBody({ c }: { c: ContractView }) {
  const t = c.terms;
  const rows = termRows(t);
  const net = netOf(t);
  const canSign = c.status === "sent";
  const history = t.history ?? [];
  const rounds = roundsOf(t);
  const signHref = `/trainer/contracts/${c.id}/sign`;
  const left = c.signDeadline ? daysUntil(c.signDeadline) : null;

  return (
    <>
      {/* 4265:… hero «قبلت الجهة اقتراحك» */}
      <section className="flex w-full flex-col items-start gap-5 rounded-22 border-[3px] border-state-success bg-state-success-bg px-5 pt-[26px] pb-7 sm:flex-row sm:items-center sm:gap-6 sm:px-7">
        <span className="flex size-[68px] shrink-0 items-center justify-center rounded-16 bg-bg-surface text-state-success">
          <Glyph icon={CircleCheckBig} size={32} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {t.hero?.badge && (
              <span className="inline-flex items-center gap-[7px] rounded-full bg-bg-surface px-3.5 py-[9px] type-subtitle text-state-success">
                <Glyph icon={CircleCheckBig} size={20} />
                {t.hero.badge}
              </span>
            )}
            {c.sourceRef && (
              <span className="font-mono text-[14px] leading-[1.5] text-text-muted" dir="ltr">
                {c.sourceRef}
              </span>
            )}
          </div>
          <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">{t.scope ?? c.title}</h2>
          {t.hero?.summary && <p className="type-body-lg text-text-secondary">{t.hero.summary}</p>}
        </div>
        {canSign ? (
          <Link href={signHref} className={signBtn}>
            أكمل التعاقد
          </Link>
        ) : (
          <span aria-disabled className={`${disabledBtn} h-12 min-w-[120px] whitespace-nowrap px-6 type-button`}>
            أكمل التعاقد
          </span>
        )}
      </section>

      <div className="flex w-full flex-col items-start gap-6 lg:flex-row lg:gap-[26px]">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
          <section aria-labelledby="final-terms" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
            <div className="flex w-full flex-wrap items-center gap-3">
              <h2 id="final-terms" className="min-w-0 flex-1 type-h2 text-text-primary">
                الشروط النهائية المتَّفق عليها
              </h2>
              <span className="inline-flex items-center gap-[7px] rounded-full bg-bg-brand-tint px-3.5 py-[9px] type-subtitle text-text-brand">
                <Glyph icon={Info} size={20} />
                {termsCountLabel(rows)}
              </span>
            </div>
            <ul className="flex w-full flex-col gap-5">
              {rows.map((r) =>
                r.negotiable ? (
                  <li key={r.label} className="flex w-full flex-col gap-3.5 rounded-16 border-2 border-state-success bg-state-success-bg px-4 pt-5 pb-[22px] sm:px-[22px]">
                    <div className="flex w-full flex-wrap items-center gap-3.5">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-success">
                        <Glyph icon={CircleCheckBig} size={20} />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                        <p className="type-title text-text-primary">{r.label}</p>
                        <p className="type-caption text-text-muted">قابل للتفاوض</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-bg-surface px-[11px] py-1.5 type-caption text-state-success">
                        <Glyph icon={CircleCheckBig} size={16} />
                        متَّفق عليه
                      </span>
                    </div>
                    <div className="flex w-full items-stretch">
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-12 bg-state-success-bg px-3 pt-3.5 pb-4 sm:px-[18px]">
                        <p className="type-caption text-text-muted">المتَّفق عليه</p>
                        <p className="type-h3 text-state-success">{r.agreed ?? "—"}</p>
                      </div>
                      <span className="flex w-10 shrink-0 items-center justify-center text-text-muted">
                        <Glyph icon={ChevronLeft} size={16} />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-12 bg-bg-surface px-3 pt-3.5 pb-4 text-text-muted sm:px-[18px]">
                        <p className="type-caption">الشرط الأصلي</p>
                        <p className="type-h3">{r.original ?? "—"}</p>
                      </div>
                    </div>
                  </li>
                ) : (
                  <li key={r.label} className="flex w-full flex-wrap items-center gap-3.5 rounded-16 bg-bg-disabled px-4 pt-5 pb-[22px] sm:px-[22px]">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-muted">
                      <Glyph icon={Lock} size={20} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-[3px] text-text-disabled">
                      <p className="type-title">{r.label}</p>
                      {r.note && <p className="type-caption">{r.note}</p>}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-bg-surface px-[11px] py-1.5 type-caption text-text-muted">
                      <Glyph icon={Lock} size={16} />
                      غير قابل للتفاوض
                    </span>
                  </li>
                ),
              )}
            </ul>
            <p className="flex w-full items-start gap-3 rounded-16 bg-state-success-bg px-[18px] pt-[15px] pb-4 type-body-lg text-state-success">
              <Glyph icon={CircleCheckBig} size={20} className="mt-1 shrink-0" />
              <span className="min-w-0 flex-1">هذه الشروط هي التي سيُبنى عليها التعاقد — راجعها قبل التوقيع.</span>
            </p>
          </section>

          <section aria-labelledby="next-step" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
            <h2 id="next-step" className="type-h2 text-text-primary">
              الخطوة التالية
            </h2>
            <p className="type-body text-text-secondary">الاتفاق مسجَّل ومُلزم للطرفين. يتبقى التعاقد.</p>
            <div className="flex flex-col gap-2">
              {canSign ? (
                <Link href={signHref} className="inline-flex h-14 w-full items-center justify-center rounded-12 bg-action-primary px-8 type-body-lg text-text-on-brand shadow-[0_6px_18px_0_rgba(91,60,196,0.28)] hover:bg-action-primary-hover focus-ring">
                  أكمل التعاقد بالشروط الجديدة
                </Link>
              ) : (
                <span aria-disabled className={`${disabledBtn} h-14 w-full px-8 type-body-lg`}>
                  أكمل التعاقد بالشروط الجديدة
                </span>
              )}
              <p className="type-caption text-text-muted">
                {canSign && left !== null
                  ? left <= 0
                    ? "تنتهي مهلة التعاقد اليوم"
                    : `يتبقى ${pluralAr(left, ["يوم واحد", "يومان", "أيام", "يومًا"])} على مهلة التعاقد`
                  : c.status === "active"
                    ? "العقد نافذ — وقّعه الطرفان"
                    : c.status === "signed_by_trainer"
                      ? "وقّعت العقد — بانتظار توقيع الطرف الآخر"
                      : c.status === "expired"
                        ? "انتهت مهلة التعاقد"
                        : "أُنهي العقد"}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href={`/trainer/contracts/${c.id}/document?log=1`}
                className="inline-flex h-14 w-full items-center justify-center rounded-12 border-[1.5px] border-border-default px-8 type-body-lg text-text-primary hover:bg-bg-brand-tint focus-ring"
              >
                نزّل سجل التفاوض PDF
              </Link>
              <p className="type-caption text-text-muted">
                {rounds > 0 ? `يوثّق ${rounds === 2 ? "الجولتين" : pluralAr(rounds, ["الجولة", "الجولتين", "جولات", "جولة"])} والاتفاق النهائي` : "يوثّق الاتفاق النهائي"}
              </p>
            </div>
            <ActionButton
              kind="conversation"
              fields={{ orgId: c.orgId, subject: `العقد ${c.number} · ${c.orgName}` }}
              className="inline-flex h-14 w-full cursor-pointer items-center justify-center rounded-12 px-8 type-body-lg text-text-brand hover:bg-bg-brand-tint focus-ring"
            >
              راسل الجهة
            </ActionButton>
          </section>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-[22px] lg:w-[420px]">
          {history.length > 0 && (
            <section aria-labelledby="log-title" className="flex w-full flex-col gap-4 rounded-22 border border-border-default bg-bg-card px-[26px] pt-[26px] pb-7 shadow-card">
              <div className="flex w-full items-center gap-3">
                <h2 id="log-title" className="min-w-0 flex-1 type-h3 text-text-primary">
                  سجل التفاوض
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-state-success-bg px-[11px] py-1.5 type-caption text-state-success">
                  <Glyph icon={CircleCheckBig} size={16} />
                  انتهى بالاتفاق
                </span>
              </div>
              <ol className="flex w-full flex-col">
                {history.map((h, i) => {
                  const accept = h.kind === "accept";
                  const box = accept ? "bg-state-success-bg" : h.actor === "trainer" ? "bg-state-info-bg" : "bg-state-warning-bg";
                  const who = accept ? "text-state-success" : h.actor === "trainer" ? "text-state-info" : "text-state-warning";
                  const icon = accept ? CircleCheckBig : h.actor === "trainer" ? Info : Reply;
                  return (
                    <li key={`${h.at}-${i}`} className="flex flex-col items-start">
                      {i > 0 && <span aria-hidden className="ms-[22px] h-5 w-0.5 bg-border-default" />}
                      <div className={`flex w-full items-start gap-3 rounded-12 px-4 pt-3.5 pb-[15px] ${box}`}>
                        <span className={`flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${who}`}>
                          <Glyph icon={icon} size={20} />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                          <p className={`type-caption ${who}`}>{h.actor === "trainer" ? "أنت" : "الجهة"}</p>
                          <p className="type-small text-text-primary">{h.text}</p>
                          <p className="type-caption text-text-muted">
                            {formatDayMonth(h.at)} · {formatTime(h.at)}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <p className="flex w-full items-start gap-2.5 rounded-12 bg-bg-page px-3.5 pt-3 pb-[13px] type-caption text-text-secondary">
                <Glyph icon={Shield} size={20} className="shrink-0 text-text-muted" />
                <span className="min-w-0 flex-1">لا يظهر لك عروض المدربين الآخرين ولا أسعارهم — التفاوض بينك وبين الجهة وحدها.</span>
              </p>
            </section>
          )}
          {net && (
            <section aria-labelledby="net-title" className="flex w-full flex-col gap-5 rounded-22 border-2 border-state-success bg-bg-card p-5 shadow-card sm:p-7">
              <h2 id="net-title" className="type-h3 text-text-primary">
                صافي عائدك بعد التفاوض
              </h2>
              {[
                { icon: Wallet, text: `السعر المتَّفق عليه ${money2(t.value as number)}` },
                { icon: Percent, text: `عمولة المنصة ${formatNumber(net.pct)}٪ · قيمة تشغيلية مؤقتة وفق إعدادات المنصة · − ${money2(net.fee).replace(" ر.س", "")}` },
                { icon: CircleCheckBig, text: `يصلك ${money2(net.net)}` },
                ...(net.delta !== null && net.delta !== 0
                  ? [{ icon: TrendingUp, text: `${net.delta > 0 ? "زاد" : "نقص"} ${money2(Math.abs(net.delta))} عن العرض الأصلي` }]
                  : []),
              ].map((r) => (
                <p key={r.text} className="flex w-full items-start gap-2.5 rounded-12 bg-bg-page px-3.5 pt-3 pb-[13px] type-body text-text-primary">
                  <Glyph icon={r.icon} size={20} className="mt-1 shrink-0 text-state-success" />
                  <span className="min-w-0 flex-1">{r.text}</span>
                </p>
              ))}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
