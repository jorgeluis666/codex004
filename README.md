# Content Growth Planner

Content Growth Planner is a React and Tailwind CSS frontend for Lima Retail, a digital marketing agency that wants to improve TikTok and Instagram content strategy using real performance data.

The app currently uses mock data shaped like a future Google Sheets plus Metricool import. It analyzes content topics, hooks, platforms, reach, engagement, follower growth, and turns those signals into tactical next-reel recommendations.

## What It Includes

- Dashboard with topic, platform, hook, and decision insights
- Auto-classification into strategic content categories
- Reach vs engagement decision matrix
- Content performance table with search and category filters
- Recommendation engine for new reel ideas
- Editable Next Reels planning view
- Mock data ready to replace with Google Sheets and Metricool inputs

## Strategy Rules

- Good engagement but low reach: improve hooks
- High reach but low engagement: improve message
- High reach and high engagement: repeat content
- Low reach and low engagement: stop or pivot

## Setup

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Build

```bash
npm run build
```

## Future Google Sheets Integration

The frontend expects content rows with this shape:

- platform
- contentType
- topic
- hook
- objective
- impressions
- reach
- views
- likes
- comments
- saves
- shares
- followersGained

Replace `src/data/mockContent.js` with fetched rows from Google Sheets, then pass them through `enrichContent` and `buildDashboard` from `src/utils/analytics.js`.
