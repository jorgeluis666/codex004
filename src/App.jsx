import { useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit3,
  FileSpreadsheet,
  Lightbulb,
  LineChart,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
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
import MetricCard from './components/MetricCard.jsx';
import SectionHeader from './components/SectionHeader.jsx';
import { mockContent } from './data/mockContent.js';
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

const navItems = [
  { id: 'dashboard', label: 'Panel', icon: BarChart3 },
  { id: 'content', label: 'Contenido', icon: FileSpreadsheet },
  { id: 'recommendations', label: 'Ideas', icon: Lightbulb },
  { id: 'planning', label: 'Próximos Reels', icon: CalendarDays },
];

const platformColors = {
  Instagram: '#ff6b57',
  TikTok: '#2bbbd8',
};

function chartTooltipFormatter(value, name) {
  if (String(name).toLowerCase().includes('interacción')) return formatPercent(value);
  return formatNumber(value);
}

function toInputDate(date) {
  return date.toISOString().slice(0, 10);
}

function dateDaysBefore(value, days) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() - days);
  return toInputDate(date);
}

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [planningItems, setPlanningItems] = useState([]);

  const sourceContent = useMemo(() => enrichContent(mockContent), []);
  const availableDateRange = useMemo(() => getContentDateRange(sourceContent), [sourceContent]);
  const [dateRange, setDateRange] = useState(() => {
    const range = getContentDateRange(mockContent);
    return { start: range.min, end: range.max };
  });

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

  function updateDateRange(field, value) {
    setDateRange((range) => ({ ...range, [field]: value }));
  }

  function resetDateRange() {
    setDateRange({ start: availableDateRange.min, end: availableDateRange.max });
  }

  function applyRecentDays(days) {
    setDateRange({
      start: dateDaysBefore(availableDateRange.max, days),
      end: availableDateRange.max,
    });
  }

  function addRecommendationToPlan(recommendation) {
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
  }

  function updatePlanningItem(index, field, value) {
    setPlanningItems((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  }

  return (
    <div className="min-h-screen bg-paper text-carbon">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-ink text-lime">
                  <TrendingUp size={22} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-coral">
                    Lima Retail
                  </p>
                  <h1 className="text-3xl font-semibold tracking-normal text-ink">
                    Planificador de Crecimiento de Contenido
                  </h1>
                </div>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Panel de decisión para convertir ideas de Google Sheets y reportes de Metricool en
                una estrategia repetible para TikTok e Instagram.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:min-w-[520px]">
              <QuickSignal label="Repetir" value={dashboard.repeat.length} tone="bg-emerald-500" />
              <QuickSignal
                label="Ganchos"
                value={dashboard.improveHook.length}
                tone="bg-amber-500"
              />
              <QuickSignal
                label="Mensajes"
                value={dashboard.improveMessage.length}
                tone="bg-sky-500"
              />
              <QuickSignal label="Detener" value={dashboard.stop.length} tone="bg-rose-500" />
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-ink text-white shadow-soft'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={item.label}
                >
                  <Icon size={17} aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeView !== 'planning' ? (
          <DateFilterBar
            availableDateRange={availableDateRange}
            dateRange={dateRange}
            filteredCount={dateFilteredContent.length}
            totalCount={sourceContent.length}
            onDateChange={updateDateRange}
            onRecentDays={applyRecentDays}
            onReset={resetDateRange}
          />
        ) : null}

        {activeView === 'dashboard' ? <DashboardView dashboard={dashboard} /> : null}
        {activeView === 'content' ? (
          <ContentView
            content={filteredContent}
            query={query}
            setQuery={setQuery}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
          />
        ) : null}
        {activeView === 'recommendations' ? (
          <RecommendationView
            recommendations={recommendations}
            planningItems={planningItems}
            onAdd={addRecommendationToPlan}
          />
        ) : null}
        {activeView === 'planning' ? (
          <PlanningView
            items={planningItems}
            onUpdate={updatePlanningItem}
            onSeed={() => {
              recommendations.forEach(addRecommendationToPlan);
            }}
          />
        ) : null}
      </main>
    </div>
  );
}

function QuickSignal({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className={`mb-2 h-1 w-8 rounded-full ${tone}`} />
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function DateFilterBar({
  availableDateRange,
  dateRange,
  filteredCount,
  totalCount,
  onDateChange,
  onRecentDays,
  onReset,
}) {
  return (
    <section className="mb-8 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-coral">
            <CalendarDays size={18} aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-[0.16em]">Filtro de fechas</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold text-ink">
            Periodo analizado: {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Mostrando {filteredCount} de {totalCount} publicaciones disponibles entre{' '}
            {formatDate(availableDateRange.min)} y {formatDate(availableDateRange.max)}.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] xl:min-w-[620px]">
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Desde
            </span>
            <input
              type="date"
              min={availableDateRange.min}
              max={availableDateRange.max}
              value={dateRange.start}
              onChange={(event) => onDateChange('start', event.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-pool"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Hasta
            </span>
            <input
              type="date"
              min={availableDateRange.min}
              max={availableDateRange.max}
              value={dateRange.end}
              onChange={(event) => onDateChange('end', event.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-pool"
            />
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-ink px-3 text-sm font-semibold text-white hover:bg-carbon"
              title="Ver todo el periodo"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Todo
            </button>
            <button
              type="button"
              onClick={() => onRecentDays(14)}
              className="min-h-11 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Últimos 14 días
            </button>
            <button
              type="button"
              onClick={() => onRecentDays(7)}
              className="min-h-11 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Últimos 7 días
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardView({ dashboard }) {
  if (dashboard.content.length === 0) {
    return (
      <div className="space-y-8">
        <SectionHeader eyebrow="Centro de decisión" title="Panel de rendimiento">
          Ajusta el rango de fechas para volver a cargar los indicadores.
        </SectionHeader>
        <EmptyState title="No hay datos en este periodo" body="Elige un rango con publicaciones para calcular el panel." />
      </div>
    );
  }

  const totalReach = dashboard.content.reduce((total, item) => total + item.reach, 0);
  const totalEngagement = dashboard.content.reduce((total, item) => total + item.interactions, 0);
  const totalFollowers = dashboard.content.reduce(
    (total, item) => total + (item.followersGained ?? 0),
    0,
  );
  const bestTopicByReach = dashboard.byTopic[0];
  const bestTopicByEngagement = [...dashboard.byTopic].sort(
    (a, b) => b.engagementRate - a.engagementRate,
  )[0];
  const bestPlatform = dashboard.byPlatform[0];
  const topicChartData = dashboard.byTopic.slice(0, 8).map((item) => ({
    ...item,
    'Tasa de interacción': item.engagementRate,
  }));
  const platformChartData = dashboard.byPlatform.map((item) => ({
    ...item,
    'Tasa de interacción': item.engagementRate,
  }));
  const scatterData = dashboard.content.map((item) => ({
    ...item,
    x: item.reach,
    y: item.engagementRate,
    z: item.followersGained,
  }));

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Centro de decisión" title="Panel de rendimiento">
        El alcance muestra qué notó el mercado. La interacción muestra qué fue suficientemente
        valioso para reaccionar, guardar o compartir.
      </SectionHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Alcance total"
          value={formatNumber(totalReach)}
          detail={`${dashboard.content.length} publicaciones analizadas con datos tipo Metricool`}
          accent="bg-pool"
        />
        <MetricCard
          label="Interacciones totales"
          value={formatNumber(totalEngagement)}
          detail={`Promedio de interacción ${formatPercent(dashboard.thresholds.averageEngagement)}`}
          accent="bg-coral"
        />
        <MetricCard
          label="Seguidores ganados"
          value={formatNumber(totalFollowers)}
          detail="Señal de crecimiento incluida en cada recomendación"
          accent="bg-lime"
        />
        <MetricCard
          label="Mejor plataforma"
          value={bestPlatform.name}
          detail={`${formatNumber(bestPlatform.reach)} de alcance con ${formatPercent(
            bestPlatform.engagementRate,
          )} de interacción`}
          accent="bg-grape"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Mejores temas por alcance" icon={LineChart}>
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicChartData} margin={{ top: 10, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} height={70} />
                <YAxis tickFormatter={formatNumber} width={46} tick={{ fontSize: 12 }} />
                <Tooltip formatter={chartTooltipFormatter} />
                <Bar dataKey="reach" name="Alcance" radius={[6, 6, 0, 0]} fill="#2bbbd8" />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </Panel>

        <Panel title="Mejores ganchos" icon={Megaphone}>
          <div className="space-y-3">
            {dashboard.bestHooks.map((item, index) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{item.hook}</p>
                  <span className="text-xs font-bold text-coral">#{index + 1}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="carbon">{item.platform}</Badge>
                  <Badge tone="grape">{item.category}</Badge>
                  <Badge tone={item.decision.tone}>{formatPercent(item.engagementRate)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Rendimiento por plataforma" icon={BarChart3}>
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformChartData} margin={{ top: 10, right: 12, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatNumber} width={46} tick={{ fontSize: 12 }} />
                <Tooltip formatter={chartTooltipFormatter} />
                <Legend />
                <Bar dataKey="reach" name="Alcance" radius={[6, 6, 0, 0]}>
                  {platformChartData.map((entry) => (
                    <Cell key={entry.name} fill={platformColors[entry.name]} />
                  ))}
                </Bar>
                <Bar
                  dataKey="followersGained"
                  name="Seguidores ganados"
                  radius={[6, 6, 0, 0]}
                  fill="#6f5bd7"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </Panel>

        <Panel title="Matriz de alcance e interacción" icon={Target}>
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 18, bottom: 16, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="x"
                  name="Alcance"
                  tickFormatter={formatNumber}
                  tick={{ fontSize: 12 }}
                  type="number"
                  domain={['dataMin - 2000', 'dataMax + 2000']}
                />
                <YAxis
                  dataKey="y"
                  name="Interacción"
                  tickFormatter={formatPercent}
                  tick={{ fontSize: 12 }}
                  type="number"
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value, name) =>
                    name === 'Interacción' ? formatPercent(value) : formatNumber(value)
                  }
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.hook ?? ''}
                />
                <Scatter data={scatterData} name="Contenido">
                  {scatterData.map((entry) => (
                    <Cell key={entry.id} fill={platformColors[entry.platform]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
            <p>Buena interacción + bajo alcance: mejorar ganchos.</p>
            <p>Alto alcance + baja interacción: mejorar mensaje.</p>
            <p>Alto alcance + alta interacción: repetir contenido.</p>
            <p>Bajo alcance + baja interacción: detener o pivotar.</p>
          </div>
        </Panel>
      </div>

      <Panel title="Decisiones estratégicas" icon={CheckCircle2}>
        <div className="grid gap-4 lg:grid-cols-4">
          <DecisionColumn title="Repetir" items={dashboard.repeat} tone="emerald" />
          <DecisionColumn title="Mejorar gancho" items={dashboard.improveHook} tone="amber" />
          <DecisionColumn title="Mejorar mensaje" items={dashboard.improveMessage} tone="sky" />
          <DecisionColumn title="Detener o pivotar" items={dashboard.stop} tone="rose" />
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <InsightCard
          label="Mejor tema por alcance"
          title={bestTopicByReach.name}
          body={`${formatNumber(bestTopicByReach.reach)} de alcance en ${bestTopicByReach.posts} publicaciones. Usa este tema para ganar atención y luego ajusta llamado a la acción, prueba y oferta.`}
        />
        <InsightCard
          label="Mejor tema por interacción"
          title={bestTopicByEngagement.name}
          body={`${formatPercent(bestTopicByEngagement.engagementRate)} de interacción. Es la señal más clara para profundizar, generar guardados y crear seguimientos.`}
        />
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-ink">
          <Icon size={18} aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold tracking-normal text-ink">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ChartFrame({ children }) {
  return <div className="h-[340px] min-h-[280px] w-full">{children}</div>;
}

function DecisionColumn({ title, items, tone }) {
  return (
    <div>
      <Badge tone={tone}>{title}</Badge>
      <div className="mt-3 space-y-3">
        {items.slice(0, 4).map((item) => (
          <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-ink">{item.hook}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{item.decision.reason}</p>
          </article>
        ))}
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
            No hay contenido en este cuadrante.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function InsightCard({ label, title, body }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral">{label}</p>
      <h3 className="mt-2 text-xl font-semibold text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </section>
  );
}

function ContentView({ content, query, setQuery, categoryFilter, setCategoryFilter }) {
  return (
    <div>
      <SectionHeader eyebrow="Capa de datos" title="Tabla de rendimiento de contenido">
        Los datos de prueba tienen la misma estructura esperada para importar ideas de Google Sheets y
        reportes de Metricool.
      </SectionHeader>

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <label className="flex min-h-11 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
          <Search size={17} className="text-slate-400" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="Buscar por tema, gancho, objetivo o plataforma"
          />
        </label>
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none"
        >
          <option>Todas</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </div>

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
                  <td className="px-4 py-4 font-semibold text-ink">{item.platform}</td>
                  <td className="px-4 py-4 capitalize text-slate-600">{item.contentType}</td>
                  <td className="px-4 py-4">
                    <Badge tone="grape">{item.category}</Badge>
                  </td>
                  <td className="max-w-[260px] px-4 py-4 font-medium text-ink">{item.hook}</td>
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
            <EmptyState
              title="No hay filas para mostrar"
              body="Prueba con otro rango de fechas, categoría o término de búsqueda."
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RecommendationView({ recommendations, planningItems, onAdd }) {
  return (
    <div>
      <SectionHeader eyebrow="Motor de recomendaciones" title="Nuevas ideas de reels">
        Las ideas se recalculan con el periodo filtrado y nacen de señales reales: repetir,
        mejorar gancho, mejorar mensaje o detener.
      </SectionHeader>

      {recommendations.length === 0 ? (
        <EmptyState
          title="No hay recomendaciones para este periodo"
          body="Selecciona un rango con publicaciones para generar ideas nuevas."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {recommendations.map((recommendation) => {
            const isPlanned = planningItems.some((item) => item.sourceId === recommendation.id);
            return (
              <article
                key={recommendation.id}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge tone="grape">{recommendation.topic}</Badge>
                    <h3 className="mt-3 text-xl font-semibold tracking-normal text-ink">
                      {recommendation.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAdd(recommendation)}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                      isPlanned
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-ink text-white hover:bg-carbon'
                    }`}
                    title={isPlanned ? 'Ya está planificado' : 'Agregar a Próximos Reels'}
                  >
                    {isPlanned ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                    {isPlanned ? 'Planificado' : 'Planear'}
                  </button>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <Info label="Gancho" value={recommendation.hook} />
                  <Info label="Plataforma" value={recommendation.platform} />
                  <Info label="Objetivo" value={recommendation.objective} />
                  <Info label="Razón basada en datos" value={recommendation.reason} wide />
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Info({ label, value, wide = false }) {
  return (
    <div className={`rounded-lg bg-slate-50 p-3 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</dt>
      <dd className="mt-1 leading-6 text-slate-700">{value}</dd>
    </div>
  );
}

function PlanningView({ items, onUpdate, onSeed }) {
  return (
    <div>
      <SectionHeader eyebrow="Vista de planificación" title="Próximos Reels">
        Convierte recomendaciones en una cola de producción con ganchos editables, guion, fecha,
        plataforma y estado.
      </SectionHeader>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-ink">
            <ClipboardList size={22} aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-ink">Aún no hay reels planificados</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Agrega ideas desde el motor de recomendaciones o carga el plan con las sugerencias del
            periodo analizado.
          </p>
          <button
            type="button"
            onClick={onSeed}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-carbon"
            title="Cargar plan"
          >
            <RefreshCw size={17} aria-hidden="true" />
            Cargar plan
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item, index) => (
            <article
              key={item.sourceId}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="grape">{item.topic}</Badge>
                    <Badge tone="carbon">{item.platform}</Badge>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-ink">{item.title}</h3>
                </div>
                <select
                  value={item.status}
                  onChange={(event) => onUpdate(index, 'status', event.target.value)}
                  className="min-h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold capitalize text-slate-700"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en progreso">En progreso</option>
                  <option value="publicado">Publicado</option>
                </select>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_180px_180px]">
                <label className="space-y-2">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    <Edit3 size={14} aria-hidden="true" />
                    Gancho
                  </span>
                  <input
                    value={item.hook}
                    onChange={(event) => onUpdate(index, 'hook', event.target.value)}
                    className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-pool"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Guion
                  </span>
                  <textarea
                    value={item.script}
                    onChange={(event) => onUpdate(index, 'script', event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 outline-none focus:border-pool"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Fecha
                  </span>
                  <input
                    type="date"
                    value={item.date}
                    onChange={(event) => onUpdate(index, 'date', event.target.value)}
                    className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-pool"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Plataforma
                  </span>
                  <select
                    value={item.platform}
                    onChange={(event) => onUpdate(index, 'platform', event.target.value)}
                    className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-pool"
                  >
                    <option>Instagram</option>
                    <option>TikTok</option>
                  </select>
                </label>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-ink">
        <ClipboardList size={22} aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-xl font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{body}</p>
    </div>
  );
}

export default App;
