# PR Metrics Dashboard

A hackathon project built to track and visualize pull request review bottlenecks, helping engineering teams merge code faster and ship value to customers sooner.

**Live demo:** [hackethon-pr-metrics.vercel.app](https://hackethon-pr-metrics.vercel.app/)

## Goal

Track the R&D objective: **Fast iteration with maximal AI use** — PRs are merged within 48 hours after being ready for review (p90).

## Why

Slow PR reviews create bottlenecks that delay deployments, increase context switching, and hurt developer productivity. Without visibility into where reviews stall, teams can't improve.

This dashboard makes PR review performance transparent so engineering managers can identify and act on bottlenecks.

## Value to Organisation and Customer

- **Identify bottlenecks** — Understand where and why PR reviews get stuck, filtered by priority, author, repo, due date, and review status
- **Faster code to customer** — Reducing review time means features and fixes reach production sooner
- **Less context switching** — Developers notified promptly spend less time revisiting stale PRs, leading to happier devs and more efficient work
- **QA transparency** — QA and dev review statuses are tracked, making the review pipeline visible to the whole team
- **Data-driven improvement** — Historical trends show whether process changes are actually working

## How It Works

1. **GitHub Webhook** receives PR events (opened, merged) and saves metrics to the database
2. **Supabase (PostgreSQL)** stores all PR metrics including timestamps, priority, due dates, and review statuses
3. **Dashboard** displays interactive D3.js charts with date range filtering
4. **Slack Notifications** — Alerts when a PR has been open > 48 hours without review

### Architecture

![Architecture diagram](./architecture.png)

### Dashboard Charts

| Chart | What it shows |
|---|---|
| Merge Time Trend | Duration from ready to merge over time |
| Weekly Throughput | Number of PRs merged per week |
| Duration Distribution | Merge times bucketed by duration (<1h, 1-4h, ... >7d) |
| Draft vs Non-Draft | Average merge time comparison |
| Author Leaderboard | Average merge time per author |
| Repo Comparison | Average merge time per repository |
| Priority Breakdown | PR count by priority level with avg merge time |
| Priority vs Merge Time | Average merge time by priority (critical, high, medium, low) |
| Due Date Compliance | PRs merged on time vs late relative to due date |
| Review Status Overview | QA and Dev review status distribution |

### Filters

- **Date range** — Filter PRs by opened date
- **Priority** — critical, high, medium, low
- **Due date tracking** — Compare merged date against due date
- **Review statuses** — QA review and Dev review (pending, approved, changes requested)

### Slack Notifications (PR > 48h without review)

A GitHub Actions workflow sends a Slack message for any PR that has been open longer than 48 hours without being merged.

- **Workflow:** `.github/workflows/pr-review-reminder.yml` — runs daily at 09:00 UTC + supports manual trigger
- **Setup:** Add the `SLACK_WEBHOOK_URL` secret to the repo (Slack Incoming Webhook)
- **Details:** See [docs/PLAN-SLACK-NOTIFICATIONS.md](docs/PLAN-SLACK-NOTIFICATIONS.md)

## Tech Stack

| Tool | Purpose |
|---|---|
| **Next.js + TypeScript** | App framework |
| **D3.js** | Data visualization |
| **Supabase** | Hosted PostgreSQL database |
| **Vercel** | Deployment |
| **GitHub Webhooks** | Real-time PR event ingestion |
| **GitHub Actions** | Scheduled Slack notifications |
| **Slack Incoming Webhooks** | PR review reminders |
| **Claude AI** | AI-assisted development |

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project (for PostgreSQL)
- GitHub webhook configured on target repos

### Environment Variables

```
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
GITHUB_WEBHOOK_SECRET=<your-webhook-secret>
GITHUB_TOKEN=<your-github-token>
```

### Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

### Deploy

Deploy to Vercel:

```bash
vercel
```