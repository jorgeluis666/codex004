export const categories = [
  'Google Ads',
  'Meta Ads',
  'TikTok Ads',
  'Comparisons',
  'Errors',
  'Investment',
  'ROAS / Analytics',
  'Ecommerce',
  'Leads / WhatsApp',
  'Case studies',
  'Educational',
  'Agency services',
];

const categoryMatchers = [
  ['Google Ads', ['google', 'search ads', 'keywords', 'pmax']],
  ['Meta Ads', ['meta', 'facebook', 'instagram ads', 'campaign']],
  ['TikTok Ads', ['tiktok', 'first three seconds']],
  ['Comparisons', [' vs ', 'versus', 'which to use', 'compare']],
  ['Errors', ['mistake', 'error', 'fail', 'wrong', 'killing']],
  ['Investment', ['invest', 'budget', 'spend']],
  ['ROAS / Analytics', ['roas', 'analytics', 'attribution', 'cpa']],
  ['Ecommerce', ['ecommerce', 'store', 'product']],
  ['Leads / WhatsApp', ['lead', 'whatsapp', 'sales handoff']],
  ['Case studies', ['case', 'we lowered', 'proof']],
  ['Educational', ['how', 'why', 'understand', 'teach', 'fixes']],
  ['Agency services', ['growth team', 'agency', 'partner']],
];

export function classifyContent(item) {
  const source = `${item.topic} ${item.hook} ${item.objective}`.toLowerCase();
  const match = categoryMatchers.find(([, keywords]) =>
    keywords.some((keyword) => source.includes(keyword)),
  );

  return match?.[0] ?? item.topic ?? 'Educational';
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
  return new Intl.NumberFormat('en-US', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 10000 ? 1 : 0,
  }).format(value);
}

export function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
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
      label: 'Repeat',
      tone: 'emerald',
      reason: 'High reach and high engagement. Turn this angle into a series.',
    };
  }

  if (!highReach && highEngagement) {
    return {
      label: 'Improve hook',
      tone: 'amber',
      reason: 'Strong engagement but low reach. The message works, so package it with a sharper opening.',
    };
  }

  if (highReach && !highEngagement) {
    return {
      label: 'Improve message',
      tone: 'sky',
      reason: 'Reach is healthy but the response is light. Clarify the payoff, proof, or CTA.',
    };
  }

  return {
    label: 'Stop or pivot',
    tone: 'rose',
    reason: 'Low reach and low engagement. Rework the angle before publishing similar content.',
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
    repeat: withDecisions.filter((item) => item.decision.label === 'Repeat'),
    improveHook: withDecisions.filter((item) => item.decision.label === 'Improve hook'),
    improveMessage: withDecisions.filter((item) => item.decision.label === 'Improve message'),
    stop: withDecisions.filter((item) => item.decision.label === 'Stop or pivot'),
  };
}

function pickBest(items, fallback) {
  return items[0]?.name ?? fallback;
}

export function generateRecommendations(dashboard) {
  const bestReachTopic = pickBest(dashboard.byTopic, 'Meta Ads');
  const bestEngagementTopic =
    [...dashboard.byTopic].sort((a, b) => b.engagementRate - a.engagementRate)[0]?.name ??
    'ROAS / Analytics';
  const bestPlatform = pickBest(dashboard.byPlatform, 'Instagram');
  const hookToImprove = dashboard.improveHook[0] ?? dashboard.bestHooks[0];
  const messageToImprove = dashboard.improveMessage[0] ?? dashboard.bestHooks[1];
  const repeatItem = dashboard.repeat[0] ?? dashboard.bestHooks[0];

  return [
    {
      id: 'rec-1',
      title: `The hidden reason your ${bestReachTopic} content gets attention but not leads`,
      hook: 'Getting views is not the same as getting buyers',
      topic: bestReachTopic,
      platform: bestPlatform,
      objective: 'Convert broad reach into qualified followers and leads',
      reason: `${bestReachTopic} leads the account in reach. The next reel should keep the popular topic but make the sales consequence clearer.`,
    },
    {
      id: 'rec-2',
      title: `Repeat the winning angle: ${repeatItem.hook}`,
      hook: 'Here is the part most brands repeat too late',
      topic: repeatItem.category,
      platform: repeatItem.platform,
      objective: 'Create a sequel from a proven high-reach, high-engagement concept',
      reason: `${repeatItem.category} produced both high reach and high engagement, which is the strongest repeat signal in the dataset.`,
    },
    {
      id: 'rec-3',
      title: `Fix the opening for: ${hookToImprove.topic}`,
      hook: 'You are losing buyers before the lesson even starts',
      topic: hookToImprove.category,
      platform: hookToImprove.platform,
      objective: 'Increase reach on a topic that already earns saves, shares, or comments',
      reason: `${hookToImprove.category} has above-average engagement but needs stronger packaging to earn more reach.`,
    },
    {
      id: 'rec-4',
      title: `Make ${messageToImprove.category} more actionable`,
      hook: 'Most advice skips the one metric that tells you what to do next',
      topic: messageToImprove.category,
      platform: messageToImprove.platform,
      objective: 'Turn broad visibility into comments, saves, and follower growth',
      reason: `${messageToImprove.category} reached people, but engagement lagged. A more concrete framework should improve response quality.`,
    },
    {
      id: 'rec-5',
      title: `A practical guide to ${bestEngagementTopic} for retail brands`,
      hook: 'Save this before you launch your next campaign',
      topic: bestEngagementTopic,
      platform: bestPlatform === 'TikTok' ? 'Instagram' : 'TikTok',
      objective: 'Repurpose high-engagement thinking on the other priority platform',
      reason: `${bestEngagementTopic} has the strongest engagement rate. Repurposing it can help find follower growth on the other channel.`,
    },
  ];
}
