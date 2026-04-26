export default function SectionHeader({ eyebrow, title, children }) {
  return (
    <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-normal text-ink">{title}</h2>
      </div>
      {children ? <div className="text-sm text-slate-500 md:max-w-md">{children}</div> : null}
    </div>
  );
}
