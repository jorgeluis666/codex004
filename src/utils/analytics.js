export const categories = [
  'Google Ads',
  'Meta Ads',
  'TikTok Ads',
  'Comparaciones',
  'Errores',
  'Inversión',
  'ROAS / Analítica',
  'Comercio electrónico',
  'Prospectos / WhatsApp',
  'Casos de éxito',
  'Educativo',
  'Servicios de agencia',
];

const categoryMatchers = [
  ['Google Ads', ['google', 'search ads', 'keywords', 'pmax']],
  ['Meta Ads', ['meta', 'facebook', 'instagram ads', 'campaña']],
  ['TikTok Ads', ['tiktok', 'primeros tres segundos', 'tres segundos']],
  ['Comparaciones', [' vs ', 'versus', 'cuál usar', 'comparar']],
  ['Errores', ['error', 'falla', 'mal', 'matando', 'equivocado']],
  ['Inversión', ['invertir', 'inversión', 'presupuesto', 'gasto']],
  ['ROAS / Analítica', ['roas', 'analítica', 'atribución', 'cpa']],
  ['Comercio electrónico', ['ecommerce', 'comercio electrónico', 'tienda', 'producto']],
  ['Prospectos / WhatsApp', ['lead', 'prospecto', 'whatsapp', 'ventas']],
  ['Casos de éxito', ['caso', 'bajamos', 'evidencia']],
  ['Educativo', ['cómo', 'por qué', 'entender', 'enseñar', 'ajustes']],
  ['Servicios de agencia', ['equipo de crecimiento', 'agencia', 'socio estratégico']],
];

export function classifyContent(item) {
  if (categories.includes(item.topic)) {
    return item.topic;
  }

  const source = `${item.topic} ${item.hook} ${item.objective}`.toLowerCase();
  const match = categoryMatchers.find(([, keywords]) =>
    keywords.some((keyword) => source.includes(keyword)),
  );

  return match?.[0] ?? item.topic ?? 'Educativo';
}

export function enrichContent(items) {
  return items.map((item) => {
    const interactions = item.likes + item.comments + item.saves + item.shares;
    const engagementRate = item.reach > 0 ? interactions / item.reach : 0;
    return {
      ...item,
      category: classifyContent(item),
      interactions,
      engagementRate,
      reachRate: item.impressions > 0 ? item.reach / item.impressions : 0,
    };
  });
}

export function formatNumber(value) {
  return new Intl.NumberFormat('es-PE', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 10000 ? 1 : 0,
  }).format(value);
}

export function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDate(value) {
  if (!value) return 'Sin fecha';

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function getContentDateRange(items) {
  const dates = items.map((item) => item.publishedAt).filter(Boolean).sort();

  return {
    min: dates[0] ?? '',
    max: dates[dates.length - 1] ?? '',
  };
}

export function filterContentByDate(items, dateRange) {
  return items.filter((item) => {
    const afterStart = !dateRange.start || item.publishedAt >= dateRange.start;
    const beforeEnd = !dateRange.end || item.publishedAt <= dateRange.end;
    return afterStart && beforeEnd;
  });
}

export function groupBy(items, key) {
  return items.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    groups[groupKey] = groups[groupKey] ?? [];
    groups[groupKey].push(item);
    return groups;
  }, {});
}

function summarizeGroup(label, items) {
  const reach = items.reduce((total, item) => total + item.reach, 0);
  const impressions = items.reduce((total, item) => total + item.impressions, 0);
  const interactions = items.reduce((total, item) => total + item.interactions, 0);
  const followersGained = items.reduce((total, item) => total + (item.followersGained ?? 0), 0);

  return {
    name: label,
    posts: items.length,
    reach,
    impressions,
    interactions,
    followersGained,
    engagementRate: reach > 0 ? interactions / reach : 0,
    avgReach: reach / items.length,
  };
}

export function summarizeBy(items, key) {
  return Object.entries(groupBy(items, key))
    .map(([label, groupItems]) => summarizeGroup(label, groupItems))
    .sort((a, b) => b.reach - a.reach);
}

export function getThresholds(items) {
  if (items.length === 0) {
    return { averageReach: 0, averageEngagement: 0 };
  }

  const averageReach = items.reduce((total, item) => total + item.reach, 0) / items.length;
  const averageEngagement =
    items.reduce((total, item) => total + item.engagementRate, 0) / items.length;
  return { averageReach, averageEngagement };
}

export function decisionFor(item, thresholds) {
  const highReach = item.reach >= thresholds.averageReach;
  const highEngagement = item.engagementRate >= thresholds.averageEngagement;

  if (highReach && highEngagement) {
    return {
      label: 'Repetir',
      tone: 'emerald',
      reason: 'Alto alcance y alta interacción. Convierte este ángulo en una serie.',
    };
  }

  if (!highReach && highEngagement) {
    return {
      label: 'Mejorar gancho',
      tone: 'amber',
      reason: 'Buena interacción pero bajo alcance. El mensaje funciona, así que necesita una apertura más fuerte.',
    };
  }

  if (highReach && !highEngagement) {
    return {
      label: 'Mejorar mensaje',
      tone: 'sky',
      reason: 'El alcance es saludable, pero la respuesta es baja. Aclara el beneficio, la prueba o el llamado a la acción.',
    };
  }

  return {
    label: 'Detener o pivotar',
    tone: 'rose',
    reason: 'Bajo alcance y baja interacción. Replantea el ángulo antes de publicar contenido similar.',
  };
}

export function buildDashboard(items) {
  const thresholds = getThresholds(items);
  const withDecisions = items.map((item) => ({
    ...item,
    decision: decisionFor(item, thresholds),
  }));
  const byTopic = summarizeBy(withDecisions, 'category');
  const byPlatform = summarizeBy(withDecisions, 'platform');
  const bestHooks = [...withDecisions]
    .sort((a, b) => b.engagementRate * b.reach - a.engagementRate * a.reach)
    .slice(0, 5);

  return {
    thresholds,
    content: withDecisions,
    byTopic,
    byPlatform,
    bestHooks,
    repeat: withDecisions.filter((item) => item.decision.label === 'Repetir'),
    improveHook: withDecisions.filter((item) => item.decision.label === 'Mejorar gancho'),
    improveMessage: withDecisions.filter((item) => item.decision.label === 'Mejorar mensaje'),
    stop: withDecisions.filter((item) => item.decision.label === 'Detener o pivotar'),
  };
}

function pickBest(items, fallback) {
  return items[0]?.name ?? fallback;
}

export function generateRecommendations(dashboard) {
  const bestReachTopic = pickBest(dashboard.byTopic, 'Meta Ads');
  const bestEngagementTopic =
    [...dashboard.byTopic].sort((a, b) => b.engagementRate - a.engagementRate)[0]?.name ??
    'ROAS / Analítica';
  const bestPlatform = pickBest(dashboard.byPlatform, 'Instagram');
  const hookToImprove = dashboard.improveHook[0] ?? dashboard.bestHooks[0];
  const messageToImprove = dashboard.improveMessage[0] ?? dashboard.bestHooks[1];
  const repeatItem = dashboard.repeat[0] ?? dashboard.bestHooks[0];

  if (!repeatItem || !hookToImprove || !messageToImprove) {
    return [];
  }

  return [
    {
      id: 'rec-1',
      title: `La razón oculta por la que ${bestReachTopic} atrae atención pero no prospectos`,
      hook: 'Tener vistas no es lo mismo que conseguir compradores',
      topic: bestReachTopic,
      platform: bestPlatform,
      objective: 'Convertir alcance amplio en seguidores calificados y prospectos',
      reason: `${bestReachTopic} lidera el alcance del periodo. El próximo reel debe mantener el tema ganador y explicar mejor la consecuencia comercial.`,
    },
    {
      id: 'rec-2',
      title: `Repite el ángulo ganador: ${repeatItem.hook}`,
      hook: 'Esta es la parte que muchas marcas corrigen demasiado tarde',
      topic: repeatItem.category,
      platform: repeatItem.platform,
      objective: 'Crear una secuela de un concepto con alto alcance y alta interacción',
      reason: `${repeatItem.category} logró alto alcance y alta interacción, la señal más clara para repetir contenido.`,
    },
    {
      id: 'rec-3',
      title: `Mejora la apertura de: ${hookToImprove.topic}`,
      hook: 'Estás perdiendo compradores antes de que empiece la explicación',
      topic: hookToImprove.category,
      platform: hookToImprove.platform,
      objective: 'Aumentar alcance en un tema que ya genera guardados, compartidos o comentarios',
      reason: `${hookToImprove.category} tiene interacción por encima del promedio, pero necesita un empaque más fuerte para ganar alcance.`,
    },
    {
      id: 'rec-4',
      title: `Haz que ${messageToImprove.category} sea más accionable`,
      hook: 'La mayoría mira la métrica equivocada antes de optimizar',
      topic: messageToImprove.category,
      platform: messageToImprove.platform,
      objective: 'Convertir visibilidad amplia en comentarios, guardados y crecimiento de seguidores',
      reason: `${messageToImprove.category} consiguió alcance, pero la interacción quedó rezagada. Un marco más concreto debería mejorar la respuesta.`,
    },
    {
      id: 'rec-5',
      title: `Guía práctica de ${bestEngagementTopic} para marcas de comercio minorista`,
      hook: 'Guarda esto antes de lanzar tu próxima campaña',
      topic: bestEngagementTopic,
      platform: bestPlatform === 'TikTok' ? 'Instagram' : 'TikTok',
      objective: 'Reutilizar un tema de alta interacción en la otra plataforma prioritaria',
      reason: `${bestEngagementTopic} tiene la mejor tasa de interacción. Adaptarlo puede ayudar a encontrar crecimiento de seguidores en el otro canal.`,
    },
  ];
}
