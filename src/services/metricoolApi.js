export async function fetchMetricoolContent({ start, end, timezone = 'America/Lima', signal }) {
  const params = new URLSearchParams({
    from: start,
    to: end,
    timezone,
  });

  const response = await fetch(`/api/metricool/content?${params.toString()}`, { signal });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message ?? 'No se pudo conectar con Metricool.');
  }

  return payload;
}

export function isMetricoolEnabled() {
  return import.meta.env.VITE_CONTENT_SOURCE === 'metricool';
}

export function getClientTimezone() {
  return import.meta.env.VITE_METRICOOL_TIMEZONE ?? 'America/Lima';
}
