import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  Lightbulb,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Badge from './components/Badge.jsx';
import { mockContent } from './data/mockContent.js';
import {
  fetchMetricoolContent,
  getClientTimezone,
  isMetricoolEnabled,
} from './services/metricoolApi.js';
import {
  buildDashboard,
  categories,
  enrichContent,
  filterContentByDate,
  formatDate,
  formatNumber,
  formatPercent,
  generateRecommendations,
  getContentDateRange,
} from './utils/analytics.js';

const navGroups = [
  {
    title: 'DIAGNÓSTICO',
    items: [
      { id: 'executive', label: 'Resumen ejecutivo' },
      { id: 'channels', label: 'Por canal · IG vs TikTok' },
      { id: 'top', label: 'Top contenido' },
      { id: 'findings', label: 'Hallazgos clave' },
    ],
  },
  {
    title: 'PROPUESTA',
    items: [
      { id: 'assumptions', label: 'Supuestos de venta' },
      { id: 'themes', label: 'Ejes temáticos' },
      { id: 'mix', label: 'Mix por plataforma' },
      { id: 'calendar', label: 'Calendario semanal' },
      { id: 'actions', label: 'Acciones · 30 días' },
    ],
  },
  {
    title: 'DATOS',
    items: [{ id: 'data', label: 'Metricool / datos' }],
  },
];

const platformColors = {
  Instagram: '#f97316',
  TikTok: '#06b6d4',
};

function toInputDate(date) {
  return date.toISOString().slice(0, 10);
}

function dateDaysBefore(value, days) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() - days);
  return toInputDate(date);
}

function getMetricoolDateBounds() {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  return { min: toInputDate(start), max: toInputDate(end) };
}

function getDefaultMetricoolDateRange() {
  const end = toInputDate(new Date());
  return { start: dateDaysBefore(end, 30), end };
}

function sum(items, field) {
  return items.reduce((total, item) => total + (Number(item[field]) || 0), 0);
}

function changeBetweenHalves(items, field) {
  if (items.length < 2) return 0;
  const sorted = [...items].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  const midpoint = Math.ceil(sorted.length / 2);
  const previous = sum(sorted.slice(0, midpoint), field);
  const current = sum(sorted.slice(midpoint), field);
  if (previous === 0) return current > 0 ? 1 : 0;
  return (current - previous) / previous;
}

function signedPercent(value) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(2)}%`;
}

function chartTooltipFormatter(value, name) {
  if (String(name).toLowerCase().includes('interacción')) return formatPercent(value);
  return formatNumber(value);
}

function App() {
  const [activeView, setActiveView] = useState('executive');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [planningItems, setPlanningItems] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const metricoolEnabled = isMetricoolEnabled();
  const metricoolTimezone = getClientTimezone();

  const mockDateRange = useMemo(() => getContentDateRange(mockContent), []);
  const metricoolDateBounds = useMemo(() => getMetricoolDateBounds(), []);
  const availableDateRange = metricoolEnabled ? metricoolDateBounds : mockDateRange;
  const [dateRange, setDateRange] = useState(() => {
    const range = getContentDateRange(mockContent);
    return metricoolEnabled ? getDefaultMetricoolDateRange() : { start: range.min, end: range.max };
  });
  const [metricoolState, setMetricoolState] = useState({
    items: [],
    isLoading: metricoolEnabled,
    message: metricoolEnabled
      ? 'Metricool activado. Consultando API...'
      : 'Usando datos de prueba.',
    error: null,
    fetchedAt: null,
    warnings: [],
  });

  useEffect(() => {
    if (!metricoolEnabled) return undefined;

    const controller = new AbortController();

    async function loadMetricoolData() {
      setMetricoolState((state) => ({
        ...state,
        isLoading: true,
        message: 'Consultando Metricool con el rango seleccionado...',
        error: null,
      }));

      try {
        const payload = await fetchMetricoolContent({
          start: dateRange.start,
          end: dateRange.end,
          timezone: metricoolTimezone,
          signal: controller.signal,
        });

        setMetricoolState({
          items: payload.items ?? [],
          isLoading: false,
          message: `Metricool conectado. ${payload.items?.length ?? 0} publicaciones importadas.`,
          error: null,
          fetchedAt: payload.fetchedAt,
          warnings: payload.warnings ?? [],
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        setMetricoolState({
          items: [],
          isLoading: false,
          message: 'No se pudo cargar Metricool. Revisa credenciales o proxy local.',
          error: error.message,
          fetchedAt: null,
          warnings: [],
        });
      }
    }

    loadMetricoolData();
    return () => controller.abort();
  }, [dateRange.end, dateRange.start, metricoolEnabled, metricoolTimezone, refreshKey]);

  const rawSourceContent = metricoolEnabled ? metricoolState.items : mockContent;
  const sourceContent = useMemo(() => enrichContent(rawSourceContent), [rawSourceContent]);
  const dateFilteredContent = useMemo(
    () => filterContentByDate(sourceContent, dateRange),
    [sourceContent, dateRange],
  );
  const dashboard = useMemo(() => buildDashboard(dateFilteredContent), [dateFilteredContent]);
  const recommendations = useMemo(() => generateRecommendations(dashboard), [dashboard]);

  const filteredContent = dashboard.content.filter((item) => {
    const haystack =
      `${item.platform} ${item.contentType} ${item.category} ${item.hook} ${item.objective}`.toLowerCase();
    const matchesQuery = haystack.includes(query.toLowerCase());
    const matchesCategory = categoryFilter === 'Todas' || item.category === categoryFilter;
    return matchesQuery && matchesCategory;
  });

  const context = {
    activeView,
    availableDateRange,
    categoryFilter,
    dashboard,
    dataStatus: metricoolState,
    dataSource: metricoolEnabled ? 'Metricool API' : 'Datos de prueba',
    dateFilteredContent,
    dateRange,
    filteredContent,
    isLiveSource: metricoolEnabled,
    planningItems,
    query,
    recommendations,
    sourceContent,
    setActiveView,
    setCategoryFilter,
    setQuery,
    updateDateRange: (field, value) => setDateRange((range) => ({ ...range, [field]: value })),
    resetDateRange: () =>
      setDateRange({ start: availableDateRange.min, end: availableDateRange.max }),
    applyRecentDays: (days) =>
      setDateRange({
        start: dateDaysBefore(availableDateRange.max, days),
        end: availableDateRange.max,
      }),
    refreshMetricool: () => setRefreshKey((key) => key + 1),
    addRecommendationToPlan: (recommendation) => {
      const exists = planningItems.some((item) => item.sourceId === recommendation.id);
      if (exists) return;

      setPlanningItems((items) => [
        ...items,
        {
          sourceId: recommendation.id,
          title: recommendation.title,
          hook: recommendation.hook,
          topic: recommendation.topic,
          platform: recommendation.platform,
          script:
            'Problema inicial. Muestra la métrica o el error. Explica la solución en tres pasos. Cierra con un llamado a la acción directo para seguir a Lima Retail.',
          date: '2026-05-06',
          status: 'pendiente',
        },
      ]);
    },
    updatePlanningItem: (index, field, value) => {
      setPlanningItems((items) =>
        items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
      );
    },
  };

  return (
    <div className="min-h-screen bg-[#eef0f4] text-[#14213d]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar context={context} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          <TopContext context={context} />
          <ActiveView context={context} />
        </main>
      </div>
    </div>
  );
}

function Sidebar({ context }) {
  return (
    <aside className="bg-[#0f1729] text-white lg:sticky lg:top-0 lg:h-screen lg:w-[280px] lg:shrink-0 lg:overflow-y-auto">
      <div className="border-b border-white/10 px-6 py-8">
        <h1 className="text-xl font-semibold">Lima Retail</h1>
        <p className="mt-2 text-sm text-slate-400">Plan de Contenidos · Q2 2026</p>
      </div>

      <nav className="space-y-7 px-4 py-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="px-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              {group.title}
            </p>
            <div className="mt-3 space-y-1">
              {group.items.map((item) => {
                const isActive = context.activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => context.setActiveView(item.id)}
                    className={`w-full rounded-lg px-4 py-2.5 text-left text-sm transition ${
                      isActive
                        ? 'bg-blue-600/25 text-blue-200'
                        : 'text-slate-100 hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mx-4 mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Periodo</p>
        <p className="mt-2 text-sm text-slate-300">
          {context.dateRange.start} → {context.dateRange.end}
        </p>
        <p className="mt-3 text-xs text-slate-500">{context.dataSource}</p>
      </div>
    </aside>
  );
}

function TopContext({ context }) {
  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Reporte de rendimiento
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[#14213d]">
            {formatDate(context.dateRange.start)} - {formatDate(context.dateRange.end)}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Badge tone={context.isLiveSource ? 'emerald' : 'carbon'}>{context.dataSource}</Badge>
            <span>
              {context.dataStatus.isLoading ? 'Cargando datos...' : context.dataStatus.message}
            </span>
          </div>
          {context.dataStatus.error ? (
            <p className="mt-2 text-sm font-medium text-rose-600">{context.dataStatus.error}</p>
          ) : null}
        </div>

        <DateControls context={context} compact />
      </div>
    </section>
  );
}

function DateControls({ context, compact = false }) {
  return (
    <div className={`grid gap-3 ${compact ? 'sm:grid-cols-[150px_150px_auto]' : 'md:grid-cols-[1fr_1fr_auto]'}`}>
      <label className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Desde</span>
        <input
          type="date"
          min={context.availableDateRange.min}
          max={context.availableDateRange.max}
          value={context.dateRange.start}
          onChange={(event) => context.updateDateRange('start', event.target.value)}
          className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500"
        />
      </label>
      <label className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Hasta</span>
        <input
          type="date"
          min={context.availableDateRange.min}
          max={context.availableDateRange.max}
          value={context.dateRange.end}
          onChange={(event) => context.updateDateRange('end', event.target.value)}
          className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500"
        />
      </label>
      <div className="flex flex-wrap items-end gap-2">
        <IconButton label="Todo" icon={RefreshCw} onClick={context.resetDateRange} />
        {context.isLiveSource ? (
          <IconButton label="Actualizar" icon={RefreshCw} onClick={context.refreshMetricool} />
        ) : null}
        <button
          type="button"
          onClick={() => context.applyRecentDays(14)}
          className="min-h-10 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
        >
          14 días
        </button>
        <button
          type="button"
          onClick={() => context.applyRecentDays(7)}
          className="min-h-10 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
        >
          7 días
        </button>
      </div>
    </div>
  );
}

function IconButton({ label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#14213d] px-3 text-sm font-semibold text-white hover:bg-[#1f2d4a]"
      title={label}
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </button>
  );
}

function ActiveView({ context }) {
  const views = {
    executive: <ExecutiveSummary context={context} />,
    channels: <ChannelsView dashboard={context.dashboard} />,
    top: <TopContentView context={context} />,
    findings: <FindingsView dashboard={context.dashboard} />,
    assumptions: <AssumptionsView dashboard={context.dashboard} />,
    themes: <ThemesView dashboard={context.dashboard} />,
    mix: <MixView dashboard={context.dashboard} />,
    calendar: <SimpleCalendarView context={context} />,
    actions: <ActionsView context={context} />,
    data: <DataView context={context} />,
  };

  return views[context.activeView] ?? views.executive;
}

function ExecutiveSummary({ context }) {
  const { dashboard } = context;
  if (dashboard.content.length === 0) {
    return <EmptyState title="No hay datos en este periodo" body="Ajusta el rango de fechas o revisa la conexión con Metricool." />;
  }

  const kpis = getKpis(dashboard);
  const bestPlatform = dashboard.byPlatform[0]?.name ?? 'Sin datos';
  const bestTopic = dashboard.byTopic[0]?.name ?? 'Sin datos';

  return (
    <div className="space-y-8">
      <SectionNumber number="1" title="Resumen ejecutivo" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Users} label="Seguidores ganados" value={formatNumber(kpis.followers)} change={kpis.followersChange} color="blue" />
        <KpiCard icon={Eye} label="Impresiones" value={formatNumber(kpis.impressions)} change={kpis.impressionsChange} color="rose" />
        <KpiCard icon={MessageSquare} label="Interacciones" value={formatNumber(kpis.interactions)} change={kpis.interactionsChange} color="emerald" />
        <KpiCard icon={CalendarDays} label="Publicaciones" value={formatNumber(kpis.posts)} change={kpis.postsChange} color="amber" />
      </div>

      <QuickRead>
        <strong>Lectura rápida.</strong> {bestPlatform} concentra el mayor alcance del periodo y{' '}
        {bestTopic} es el eje con más tracción. La estrategia debe repetir lo que combina alcance e
        interacción, mejorar ganchos cuando el tema genera respuesta pero no escala, y corregir
        mensajes cuando hay visibilidad sin acción.
      </QuickRead>

      <ChannelsView dashboard={dashboard} embedded />
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, change, color }) {
  const isPositive = change >= 0;
  const colorMap = {
    blue: 'bg-blue-100 text-blue-700',
    rose: 'bg-rose-100 text-rose-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-blue-700">{value}</p>
          <p className={`mt-2 text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {signedPercent(change)} vs periodo anterior
          </p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${colorMap[color]}`}>
          <Icon size={20} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

function QuickRead({ children }) {
  return (
    <section className="border-l-4 border-blue-600 bg-blue-50 px-5 py-4 text-sm leading-7 text-blue-950">
      {children}
    </section>
  );
}

function ChannelsView({ dashboard, embedded = false }) {
  if (dashboard.content.length === 0) {
    return <EmptyState title="Sin diagnóstico por canal" body="No hay publicaciones para comparar Instagram y TikTok." />;
  }

  return (
    <div className="space-y-5">
      {!embedded ? <SectionNumber number="2" title="Diagnóstico por canal" /> : <SectionNumber number="2" title="Diagnóstico por canal" />}
      <div className="grid gap-5 xl:grid-cols-2">
        <ChannelCard platform="Instagram" dashboard={dashboard} />
        <ChannelCard platform="TikTok" dashboard={dashboard} />
      </div>
    </div>
  );
}

function ChannelCard({ platform, dashboard }) {
  const items = dashboard.content.filter((item) => item.platform === platform);
  const impressions = sum(items, 'impressions');
  const views = sum(items, 'views');
  const interactions = items.reduce((total, item) => total + item.interactions, 0);
  const followers = sum(items, 'followersGained');
  const reach = sum(items, 'reach');
  const engagementRate = reach > 0 ? interactions / reach : 0;
  const avgReach = items.length ? reach / items.length : 0;
  const status = engagementRate >= dashboard.thresholds.averageEngagement ? 'Crece' : 'En caída';
  const statusTone = status === 'Crece' ? 'emerald' : 'rose';

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div
        className="h-1"
        style={{
          background:
            platform === 'Instagram'
              ? 'linear-gradient(90deg,#f59e0b,#ef4444,#d946ef)'
              : 'linear-gradient(90deg,#06b6d4,#0f172a,#d946ef)',
        }}
      />
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-[#0f1729]">{platform}</h3>
            <p className="mt-1 text-sm text-slate-400">@agencialimaretail</p>
          </div>
          <Badge tone={statusTone}>{status}</Badge>
        </div>

        <div className="mt-6 divide-y divide-dashed divide-slate-200">
          <MetricRow label="Seguidores ganados" value={followers} change={changeBetweenHalves(items, 'followersGained')} />
          <MetricRow label={platform === 'TikTok' ? 'Visualizaciones' : 'Impresiones'} value={platform === 'TikTok' ? views : impressions} change={changeBetweenHalves(items, platform === 'TikTok' ? 'views' : 'impressions')} />
          <MetricRow label="Publicaciones" value={items.length} change={changeBetweenHalves(items, 'reach')} suffix=" posts" />
          <MetricRow label="Interacciones" value={interactions} change={changeBetweenHalves(items, 'likes')} />
          <MetricRow label="Engagement" value={formatPercent(engagementRate)} change={engagementRate - dashboard.thresholds.averageEngagement} raw />
          <MetricRow label="Alcance promedio/post" value={avgReach} change={changeBetweenHalves(items, 'reach')} />
        </div>
      </div>
    </section>
  );
}

function MetricRow({ label, value, change, raw = false, suffix = '' }) {
  const isPositive = change >= 0;
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="flex items-center gap-3 font-semibold text-[#0f1729]">
        {raw ? value : formatNumber(value)}
        {suffix ? <span>{suffix}</span> : null}
        <span className={isPositive ? 'text-emerald-600' : 'text-red-600'}>
          {signedPercent(change)}
        </span>
      </span>
    </div>
  );
}

function TopContentView({ context }) {
  const topItems = [...context.filteredContent].sort(
    (a, b) => b.reach + b.interactions * 8 - (a.reach + a.interactions * 8),
  );

  return (
    <div className="space-y-5">
      <SectionNumber number="3" title="Top contenido" />
      <Filters context={context} />
      <div className="grid gap-4 xl:grid-cols-2">
        {topItems.map((item, index) => (
          <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  #{index + 1} · {formatDate(item.publishedAt)}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[#0f1729]">{item.hook}</h3>
              </div>
              <Badge tone={item.decision.tone}>{item.decision.label}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="carbon">{item.platform}</Badge>
              <Badge tone="grape">{item.category}</Badge>
              <Badge tone="emerald">{formatPercent(item.engagementRate)}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <MiniStat label="Alcance" value={formatNumber(item.reach)} />
              <MiniStat label="Vistas" value={formatNumber(item.views)} />
              <MiniStat label="Interacciones" value={formatNumber(item.interactions)} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Filters({ context }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:flex-row">
      <label className="flex min-h-11 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
        <Search size={17} className="text-slate-400" aria-hidden="true" />
        <input
          value={context.query}
          onChange={(event) => context.setQuery(event.target.value)}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          placeholder="Buscar por tema, gancho, objetivo o plataforma"
        />
      </label>
      <select
        value={context.categoryFilter}
        onChange={(event) => context.setCategoryFilter(event.target.value)}
        className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none"
      >
        <option>Todas</option>
        {categories.map((category) => (
          <option key={category}>{category}</option>
        ))}
      </select>
    </div>
  );
}

function FindingsView({ dashboard }) {
  if (dashboard.content.length === 0) {
    return <EmptyState title="Sin hallazgos" body="No hay datos suficientes para generar hallazgos." />;
  }

  return (
    <div className="space-y-5">
      <SectionNumber number="4" title="Hallazgos clave" />
      <div className="grid gap-4 lg:grid-cols-4">
        <DecisionColumn title="Repetir" items={dashboard.repeat} tone="emerald" />
        <DecisionColumn title="Mejorar gancho" items={dashboard.improveHook} tone="amber" />
        <DecisionColumn title="Mejorar mensaje" items={dashboard.improveMessage} tone="sky" />
        <DecisionColumn title="Detener o pivotar" items={dashboard.stop} tone="rose" />
      </div>
    </div>
  );
}

function AssumptionsView({ dashboard }) {
  const bestTopic = dashboard.byTopic[0]?.name ?? 'el tema con mayor alcance';
  const bestEngagement = [...dashboard.byTopic].sort((a, b) => b.engagementRate - a.engagementRate)[0]?.name ?? 'el tema con mayor interacción';
  const bestPlatform = dashboard.byPlatform[0]?.name ?? 'la plataforma con mayor alcance';

  const assumptions = [
    `Si abrimos con un problema concreto de ${bestTopic}, deberíamos sostener el alcance sin depender de formatos promocionales.`,
    `${bestEngagement} debe usarse como eje educativo porque genera señales de valor: guardados, comentarios y compartidos.`,
    `${bestPlatform} puede cargar las piezas de descubrimiento, mientras el otro canal debe recibir versiones más explicativas y orientadas a conversión.`,
    'Las piezas con baja interacción necesitan una promesa más específica, prueba visible y un llamado a la acción más simple.',
  ];

  return (
    <div className="space-y-5">
      <SectionNumber number="5" title="Supuestos de venta" />
      <div className="grid gap-4 md:grid-cols-2">
        {assumptions.map((assumption, index) => (
          <article key={assumption} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-500">
              Supuesto {index + 1}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{assumption}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ThemesView({ dashboard }) {
  return (
    <div className="space-y-5">
      <SectionNumber number="6" title="Ejes temáticos" />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Performance por tema" icon={BarChart3}>
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.byTopic.slice(0, 8)} margin={{ top: 10, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} height={70} />
                <YAxis tickFormatter={formatNumber} width={46} tick={{ fontSize: 12 }} />
                <Tooltip formatter={chartTooltipFormatter} />
                <Bar dataKey="reach" name="Alcance" radius={[6, 6, 0, 0]} fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </Panel>
        <Panel title="Prioridad editorial" icon={Target}>
          <div className="space-y-3">
            {dashboard.byTopic.slice(0, 8).map((topic, index) => (
              <div key={topic.name} className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#0f1729]">{index + 1}. {topic.name}</p>
                  <span className="text-sm text-slate-500">{formatNumber(topic.reach)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatPercent(topic.engagementRate)} interacción · {topic.posts} publicaciones
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function MixView({ dashboard }) {
  return (
    <div className="space-y-5">
      <SectionNumber number="7" title="Mix por plataforma" />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Rendimiento por plataforma" icon={BarChart3}>
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.byPlatform} margin={{ top: 10, right: 12, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatNumber} width={46} tick={{ fontSize: 12 }} />
                <Tooltip formatter={chartTooltipFormatter} />
                <Legend />
                <Bar dataKey="reach" name="Alcance" radius={[6, 6, 0, 0]}>
                  {dashboard.byPlatform.map((entry) => (
                    <Cell key={entry.name} fill={platformColors[entry.name]} />
                  ))}
                </Bar>
                <Bar dataKey="followersGained" name="Seguidores ganados" radius={[6, 6, 0, 0]} fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </Panel>
        <Panel title="Matriz de decisión" icon={Target}>
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 18, bottom: 16, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="reach" name="Alcance" tickFormatter={formatNumber} tick={{ fontSize: 12 }} type="number" />
                <YAxis dataKey="engagementRate" name="Interacción" tickFormatter={formatPercent} tick={{ fontSize: 12 }} type="number" />
                <Tooltip formatter={(value, name) => (name === 'Interacción' ? formatPercent(value) : formatNumber(value))} labelFormatter={(_, payload) => payload?.[0]?.payload?.hook ?? ''} />
                <Scatter data={dashboard.content} name="Contenido">
                  {dashboard.content.map((entry) => (
                    <Cell key={entry.id} fill={platformColors[entry.platform]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </ChartFrame>
        </Panel>
      </div>
    </div>
  );
}

function SimpleCalendarView({ context }) {
  const hasPlan = context.planningItems.length > 0;
  const rows = hasPlan
    ? context.planningItems.map((item, index) => ({ ...item, index, isPlanned: true }))
    : buildSuggestedCalendarRows(context.recommendations, context.dateRange);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <SectionNumber number="8" title="Calendario semanal" />
          <p className="mt-2 text-sm text-slate-500">
            Tabla editorial simple para ordenar fecha, plataforma, idea, gancho y estado.
          </p>
        </div>
        <button
          type="button"
          onClick={() => context.recommendations.forEach(context.addRecommendationToPlan)}
          className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${
            hasPlan
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-[#14213d] text-white hover:bg-[#1f2d4a]'
          }`}
        >
          <Plus size={16} aria-hidden="true" />
          {hasPlan ? 'Agregar ideas' : 'Usar sugerencias'}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MiniStat label="Ideas" value={formatNumber(rows.length)} />
        <MiniStat
          label="Instagram"
          value={formatNumber(rows.filter((row) => row.platform === 'Instagram').length)}
        />
        <MiniStat
          label="TikTok"
          value={formatNumber(rows.filter((row) => row.platform === 'TikTok').length)}
        />
        <MiniStat label="Estado" value={hasPlan ? 'Editable' : 'Sugerido'} />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-white px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#0f1729]">
                {hasPlan ? 'Plan semanal editable' : 'Plan sugerido'}
              </h3>
              <p className="text-sm text-slate-500">
                {hasPlan
                  ? 'Edita solo lo necesario sin abrir tarjetas grandes.'
                  : 'Vista previa generada con las recomendaciones del periodo.'}
              </p>
            </div>
            <Badge tone={hasPlan ? 'emerald' : 'amber'}>
              {hasPlan ? 'En planificación' : 'Sin guardar'}
            </Badge>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Sin ideas para calendarizar"
              body="Selecciona un periodo con datos o revisa las recomendaciones."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Día</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Plataforma</th>
                  <th className="px-4 py-3">Eje</th>
                  <th className="px-4 py-3">Reel</th>
                  <th className="px-4 py-3">Gancho</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, rowIndex) => (
                  <tr key={row.sourceId ?? row.id ?? rowIndex} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <span className="font-semibold capitalize text-[#0f1729]">
                        {getWeekdayLabel(row.date)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.isPlanned ? (
                        <input
                          type="date"
                          value={row.date}
                          onChange={(event) =>
                            context.updatePlanningItem(row.index, 'date', event.target.value)
                          }
                          className="min-h-10 w-[150px] rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                        />
                      ) : (
                        <span className="text-slate-600">{formatDate(row.date)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.isPlanned ? (
                        <select
                          value={row.platform}
                          onChange={(event) =>
                            context.updatePlanningItem(row.index, 'platform', event.target.value)
                          }
                          className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                        >
                          <option>Instagram</option>
                          <option>TikTok</option>
                        </select>
                      ) : (
                        <Badge tone="carbon">{row.platform}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone="grape">{row.topic}</Badge>
                    </td>
                    <td className="max-w-[260px] px-4 py-4 font-semibold text-[#0f1729]">
                      {row.title}
                    </td>
                    <td className="px-4 py-3">
                      {row.isPlanned ? (
                        <input
                          value={row.hook}
                          onChange={(event) =>
                            context.updatePlanningItem(row.index, 'hook', event.target.value)
                          }
                          className="min-h-10 w-[300px] rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                        />
                      ) : (
                        <span className="block max-w-[300px] leading-6 text-slate-600">
                          {row.hook}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.isPlanned ? (
                        <select
                          value={row.status}
                          onChange={(event) =>
                            context.updatePlanningItem(row.index, 'status', event.target.value)
                          }
                          className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold capitalize text-slate-700 outline-none focus:border-blue-500"
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="en progreso">En progreso</option>
                          <option value="publicado">Publicado</option>
                        </select>
                      ) : (
                        <Badge tone="amber">Sugerido</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!hasPlan && rows.length > 0 ? (
        <QuickRead>
          <strong>Tip.</strong> Usa estas sugerencias como punto de partida. Al hacer clic en
          “Usar sugerencias”, la tabla se vuelve editable.
        </QuickRead>
      ) : null}
    </div>
  );
}

function buildSuggestedCalendarRows(recommendations, dateRange) {
  const base = new Date(`${dateRange.end}T00:00:00`);
  base.setDate(base.getDate() + 1);

  return recommendations.map((recommendation, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index * 2);
    return {
      ...recommendation,
      date: toInputDate(date),
      status: 'sugerido',
      isPlanned: false,
    };
  });
}

function getWeekdayLabel(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('es-PE', { weekday: 'short' }).format(date);
}

function ActionsView({ context }) {
  const actions = [
    ['Semana 1', 'Repetir los contenidos con alto alcance y alta interacción como serie de 3 piezas.'],
    ['Semana 2', 'Reescribir ganchos de piezas con buena interacción y bajo alcance.'],
    ['Semana 3', 'Convertir los temas con alcance alto y baja interacción en guías más accionables.'],
    ['Semana 4', 'Pausar o pivotar los formatos con bajo alcance y baja interacción.'],
  ];

  return (
    <div className="space-y-5">
      <SectionNumber number="9" title="Acciones · 30 días" />
      <div className="grid gap-4 md:grid-cols-2">
        {actions.map(([week, action]) => (
          <article key={week} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 text-emerald-500" size={20} aria-hidden="true" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{week}</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{action}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      <QuickRead>
        <strong>Foco operativo.</strong> El plan debe producir {context.recommendations.length} ideas
        nuevas desde datos del periodo, con prioridad para ganchos de diagnóstico, comparaciones y
        errores costosos.
      </QuickRead>
    </div>
  );
}

function DataView({ context }) {
  return (
    <div className="space-y-5">
      <SectionNumber number="10" title="Metricool / datos" />
      <Panel title="Fuente y filtros automáticos" icon={FileSpreadsheet}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={context.isLiveSource ? 'emerald' : 'carbon'}>{context.dataSource}</Badge>
            <span className="text-sm text-slate-500">{context.dataStatus.message}</span>
          </div>
          {context.dataStatus.error ? (
            <p className="text-sm font-medium text-rose-600">{context.dataStatus.error}</p>
          ) : null}
          <DateControls context={context} />
        </div>
      </Panel>
      <Filters context={context} />
      <ContentTable content={context.filteredContent} />
    </div>
  );
}

function ContentTable({ content }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1240px] divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Plataforma</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Gancho</th>
              <th className="px-4 py-3">Objetivo</th>
              <th className="px-4 py-3">Alcance</th>
              <th className="px-4 py-3">Vistas</th>
              <th className="px-4 py-3">Interacción</th>
              <th className="px-4 py-3">Seguidores</th>
              <th className="px-4 py-3">Decisión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {content.map((item) => (
              <tr key={item.id} className="align-top hover:bg-slate-50">
                <td className="px-4 py-4 text-slate-600">{formatDate(item.publishedAt)}</td>
                <td className="px-4 py-4 font-semibold text-[#0f1729]">{item.platform}</td>
                <td className="px-4 py-4 capitalize text-slate-600">{item.contentType}</td>
                <td className="px-4 py-4">
                  <Badge tone="grape">{item.category}</Badge>
                </td>
                <td className="max-w-[260px] px-4 py-4 font-medium text-[#0f1729]">{item.hook}</td>
                <td className="max-w-[280px] px-4 py-4 text-slate-600">{item.objective}</td>
                <td className="px-4 py-4">{formatNumber(item.reach)}</td>
                <td className="px-4 py-4">{formatNumber(item.views)}</td>
                <td className="px-4 py-4">{formatPercent(item.engagementRate)}</td>
                <td className="px-4 py-4">{formatNumber(item.followersGained ?? 0)}</td>
                <td className="px-4 py-4">
                  <Badge tone={item.decision.tone}>{item.decision.label}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {content.length === 0 ? (
        <div className="p-6">
          <EmptyState title="No hay filas para mostrar" body="Prueba con otro rango de fechas, categoría o término de búsqueda." />
        </div>
      ) : null}
    </div>
  );
}

function DecisionColumn({ title, items, tone }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <Badge tone={tone}>{title}</Badge>
      <div className="mt-3 space-y-3">
        {items.slice(0, 4).map((item) => (
          <article key={item.id} className="rounded-lg bg-slate-50 p-3">
            <p className="text-sm font-semibold text-[#0f1729]">{item.hook}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{item.decision.reason}</p>
          </article>
        ))}
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
            Sin piezas en este cuadrante.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-[#14213d]">
          <Icon size={18} aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-[#0f1729]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function SectionNumber({ number, title }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
      <span>{number}</span>
      <span>·</span>
      <span>{title}</span>
    </div>
  );
}

function ChartFrame({ children }) {
  return <div className="h-[340px] min-h-[280px] w-full">{children}</div>;
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-[#0f1729]">{value}</p>
    </div>
  );
}

function getKpis(dashboard) {
  const items = dashboard.content;
  return {
    followers: sum(items, 'followersGained'),
    followersChange: changeBetweenHalves(items, 'followersGained'),
    impressions: sum(items, 'impressions'),
    impressionsChange: changeBetweenHalves(items, 'impressions'),
    interactions: items.reduce((total, item) => total + item.interactions, 0),
    interactionsChange: changeBetweenHalves(items, 'likes'),
    posts: items.length,
    postsChange: changeBetweenHalves(items, 'reach'),
  };
}

function EmptyState({ title, body }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <ClipboardList className="mx-auto text-slate-500" size={28} aria-hidden="true" />
      <h3 className="mt-4 text-xl font-semibold text-[#0f1729]">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{body}</p>
    </div>
  );
}

export default App;
