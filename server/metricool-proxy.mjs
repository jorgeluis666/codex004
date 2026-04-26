import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const METRICOOL_BASE_URL = 'https://app.metricool.com/api';
const PORT = Number(process.env.METRICOOL_PROXY_PORT ?? 8787);

await loadDotEnv();

const endpoints = [
  {
    platform: 'Instagram',
    contentType: 'reel',
    path: '/v2/analytics/reels/instagram',
  },
  {
    platform: 'Instagram',
    contentType: 'post',
    path: '/v2/analytics/posts/instagram',
  },
  {
    platform: 'Instagram',
    contentType: 'historia',
    path: '/v2/analytics/stories/instagram',
  },
  {
    platform: 'TikTok',
    contentType: 'reel',
    path: '/v2/analytics/posts/tiktok',
  },
];

createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5173');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname !== '/api/metricool/content') {
    sendJson(response, 404, { message: 'Ruta no encontrada.' });
    return;
  }

  try {
    assertConfig();
    const from = requiredParam(url, 'from');
    const to = requiredParam(url, 'to');
    const timezone = url.searchParams.get('timezone') ?? process.env.METRICOOL_TIMEZONE ?? 'America/Lima';
    const result = await fetchAllMetricoolContent({ from, to, timezone });
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, error.statusCode ?? 500, {
      message: error.message ?? 'Error inesperado consultando Metricool.',
    });
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Metricool proxy listo en http://127.0.0.1:${PORT}`);
});

async function fetchAllMetricoolContent({ from, to, timezone }) {
  const calls = endpoints.map(async (endpoint) => {
    try {
      const raw = await metricoolRequest(endpoint.path, { from, to, timezone });
      const records = extractRecords(raw).map((record, index) =>
        normalizeMetricoolRecord(record, endpoint, `${endpoint.path}-${index}`),
      );
      return { endpoint, records, error: null };
    } catch (error) {
      return { endpoint, records: [], error: error.message };
    }
  });

  const results = await Promise.all(calls);
  const items = results.flatMap((result) => result.records);

  return {
    source: 'metricool',
    fetchedAt: new Date().toISOString(),
    dateRange: { from, to, timezone },
    items,
    counts: Object.fromEntries(
      results.map((result) => [
        `${result.endpoint.platform} ${result.endpoint.contentType}`,
        result.records.length,
      ]),
    ),
    warnings: results
      .filter((result) => result.error)
      .map((result) => `${result.endpoint.platform} ${result.endpoint.contentType}: ${result.error}`),
  };
}

async function metricoolRequest(path, params) {
  const url = new URL(`${METRICOOL_BASE_URL}${path}`);
  url.searchParams.set('userId', process.env.METRICOOL_USER_ID);
  url.searchParams.set('blogId', process.env.METRICOOL_BLOG_ID);
  url.searchParams.set('from', toMetricoolDateTime(params.from, '00:00:00'));
  url.searchParams.set('to', toMetricoolDateTime(params.to, '23:59:59'));
  url.searchParams.set('timezone', params.timezone);

  const response = await fetch(url, {
    headers: {
      'X-Mc-Auth': process.env.METRICOOL_USER_TOKEN,
      'Content-Type': 'application/json',
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = body?.message ?? body?.error ?? response.statusText;
    throw new Error(`Metricool ${response.status}: ${message}`);
  }

  return body;
}

function normalizeMetricoolRecord(record, endpoint, fallbackId) {
  const text = firstString(
    record.text,
    record.caption,
    record.description,
    record.title,
    record.message,
    record.permalink,
    record.url,
  );
  const publishedAt = toDateOnly(
    firstValue(record.publishedAt, record.publicationDate, record.date, record.createdAt, record.timestamp),
  );
  const reach = numberFrom(record.reach, record.reached, record.uniqueImpressions);
  const likes = numberFrom(record.likes, record.likeCount);
  const comments = numberFrom(record.comments, record.commentCount);
  const saves = numberFrom(record.saves, record.saved, record.savedCount);
  const shares = numberFrom(record.shares, record.shareCount);

  return {
    id: firstString(record.id, record.postId, record.mediaId, record.shortcode, fallbackId),
    platform: endpoint.platform,
    contentType: endpoint.contentType,
    topic: inferTopic(text, endpoint),
    hook: text ? cleanText(text).slice(0, 110) : `${endpoint.platform} importado desde Metricool`,
    objective: 'Analizar rendimiento real importado desde Metricool',
    impressions: numberFrom(record.impressions, record.impression, record.views, record.videoViews),
    reach,
    views: numberFrom(record.views, record.videoViews, record.videos, record.plays, record.video_views),
    likes,
    comments,
    saves,
    shares,
    followersGained: numberFrom(record.followersGained, record.followers_delta_count, record.followersDelta),
    publishedAt: publishedAt ?? new Date().toISOString().slice(0, 10),
  };
}

function extractRecords(payload) {
  if (Array.isArray(payload)) return payload;

  const direct = [
    payload?.data,
    payload?.data?.data,
    payload?.data?.items,
    payload?.items,
    payload?.posts,
    payload?.results,
    payload?.response,
  ].find(Array.isArray);

  if (direct) return direct;

  return findFirstRecordArray(payload) ?? [];
}

function findFirstRecordArray(value) {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value) && value.some((item) => item && typeof item === 'object')) return value;

  for (const child of Object.values(value)) {
    const found = findFirstRecordArray(child);
    if (found) return found;
  }

  return null;
}

function inferTopic(text, endpoint) {
  const source = cleanText(text).toLowerCase();
  if (source.includes('google')) return 'Google Ads';
  if (source.includes('meta') || source.includes('facebook')) return 'Meta Ads';
  if (source.includes('tiktok')) return 'TikTok Ads';
  if (source.includes('whatsapp') || source.includes('lead') || source.includes('prospecto')) {
    return 'Prospectos / WhatsApp';
  }
  if (source.includes('roas') || source.includes('cpa') || source.includes('analítica')) {
    return 'ROAS / Analítica';
  }
  if (source.includes('ecommerce') || source.includes('tienda') || source.includes('comercio')) {
    return 'Comercio electrónico';
  }
  if (source.includes('error') || source.includes('fall')) return 'Errores';
  if (source.includes('presupuesto') || source.includes('invert')) return 'Inversión';
  return endpoint.platform === 'TikTok' ? 'TikTok Ads' : 'Educativo';
}

function toMetricoolDateTime(value, time) {
  return value.includes('T') ? value : `${value}T${time}`;
}

function toDateOnly(value) {
  const raw = typeof value === 'object' && value !== null ? value.dateTime ?? value.date ?? value.value : value;
  if (!raw) return null;
  return String(raw).slice(0, 10);
}

function cleanText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function firstString(...values) {
  const found = values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
  return found === undefined ? '' : String(found);
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function numberFrom(...values) {
  const value = values.find((candidate) => candidate !== undefined && candidate !== null && candidate !== '');
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function requiredParam(url, name) {
  const value = url.searchParams.get(name);
  if (!value) {
    const error = new Error(`Falta el parámetro ${name}.`);
    error.statusCode = 400;
    throw error;
  }
  return value;
}

function assertConfig() {
  const missing = ['METRICOOL_USER_TOKEN', 'METRICOOL_USER_ID', 'METRICOOL_BLOG_ID'].filter(
    (key) => !process.env[key],
  );

  if (missing.length) {
    const error = new Error(`Faltan variables de entorno: ${missing.join(', ')}.`);
    error.statusCode = 400;
    throw error;
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function loadDotEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  const file = await readFile(envPath, 'utf8');
  file
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .forEach((line) => {
      const index = line.indexOf('=');
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = process.env[key] ?? value;
    });
}
