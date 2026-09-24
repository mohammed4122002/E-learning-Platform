/* The «Card» with label/value rows used by the live-course frames (4236:2 · 4236:743): brand-tint + 2px brand
   border for the highlighted card, white + light border otherwise. Rows sit on the end side (label, then value). */

export type InfoRow = { label: string; value: string; tone?: "brand" | "success" | "primary" };

const valueTone = { brand: "text-text-brand", success: "text-state-success", primary: "text-text-primary" } as const;

export function InfoPanel({ title, description, rows, highlight = false }: { title: string; description?: string; rows: InfoRow[]; highlight?: boolean }) {
  return (
    <section className={`flex flex-col gap-2.5 rounded-[14px] p-6 ${highlight ? "border-2 border-action-primary bg-bg-brand-tint" : "border border-border-default bg-bg-card"}`}>
      <h2 className={`text-[20px] font-bold ${highlight ? "text-text-brand" : "text-text-primary"}`}>{title}</h2>
      {description && <p className="text-[15px] text-text-secondary">{description}</p>}
      <dl className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-end gap-2.5 rounded-[10px] border border-border-default bg-bg-page px-4 py-[13px]">
            <dt className="text-[13.5px] text-text-secondary">{r.label}</dt>
            <dd className={`min-w-0 truncate text-[15px] font-bold ${valueTone[r.tone ?? "primary"]}`}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
