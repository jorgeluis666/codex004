export default function MetricCard({ label, value, detail, accent = 'bg-pool' }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-4 h-1.5 w-12 rounded-full ${accent}`} />
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-normal text-ink">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </section>
  );
}
