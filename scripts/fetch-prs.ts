#!/usr/bin/env npx tsx

/**
 * Fetches PRs from the last 7 days via GitHub API, enriches with Jira data
 * (priority, due_date), and outputs SQL matching the pr_metrics table schema.
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_xxx JIRA_EMAIL=you@company.com JIRA_API_TOKEN=xxx \
 *     npx tsx scripts/fetch-prs.ts owner/repo [owner/repo2 ...]
 *
 * Or with gh CLI token:
 *   GITHUB_TOKEN=$(gh auth token) JIRA_EMAIL=… JIRA_API_TOKEN=… \
 *     npx tsx scripts/fetch-prs.ts owner/repo
 */

const GITHUB_API = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN;
const JIRA_BASE = "https://ketryx.atlassian.net";
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

if (!TOKEN) {
  console.error("GITHUB_TOKEN env variable is required");
  process.exit(1);
}

if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error("JIRA_EMAIL and JIRA_API_TOKEN env variables are required");
  process.exit(1);
}

const repos = process.argv.length > 2
  ? process.argv.slice(2)
  : ["Ketryx/ketryx"];

interface GitHubUser {
  login: string;
}

interface GitHubPR {
  number: number;
  title: string;
  body: string | null;
  state: string;
  draft: boolean;
  user: GitHubUser;
  created_at: string;
  merged_at: string | null;
  requested_reviewers: GitHubUser[];
}

function parseJiraTicket(body: string | null): string | null {
  if (!body) return null;
  // Match patterns like "Related Jira issue: KP-13760" or just "KP-13760"
  const match = body.match(/(?:Related Jira issue:\s*)?([A-Z][A-Z0-9]+-\d+)/);
  return match ? match[1] : null;
}

// ── Jira API ──────────────────────────────────────────────────────────

interface JiraIssue {
  fields: {
    priority?: { name: string } | null;
    duedate?: string | null; // "2026-02-20"
  };
}

type Priority = "low" | "medium" | "high" | "highest" | "lowest";

const JIRA_PRIORITY_MAP: Record<string, Priority> = {
  lowest: "lowest",
  low: "low",
  medium: "medium",
  high: "high",
  highest: "highest",
  critical: "highest",
  blocker: "highest",
};

function mapJiraPriority(name: string | undefined | null): Priority {
  if (!name) return "medium";
  return JIRA_PRIORITY_MAP[name.toLowerCase()] ?? "medium";
}

const jiraCache = new Map<string, JiraIssue | null>();

async function fetchJiraIssue(ticketKey: string): Promise<JiraIssue | null> {
  if (jiraCache.has(ticketKey)) return jiraCache.get(ticketKey)!;

  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");
  try {
    const res = await fetch(
      `${JIRA_BASE}/rest/api/3/issue/${ticketKey}?fields=priority,duedate`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) {
      console.error(`  [jira] ${ticketKey}: ${res.status} ${res.statusText}`);
      jiraCache.set(ticketKey, null);
      return null;
    }
    const issue = (await res.json()) as JiraIssue;
    jiraCache.set(ticketKey, issue);
    return issue;
  } catch (err) {
    console.error(`  [jira] ${ticketKey}: fetch failed`, err);
    jiraCache.set(ticketKey, null);
    return null;
  }
}

// ── GitHub Reviews ────────────────────────────────────────────────────

interface GitHubReview {
  user: GitHubUser;
  state: string; // APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED
  submitted_at: string;
}

interface TimelineEvent {
  event: string;
  created_at: string;
}

async function ghFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${res.statusText} – ${url}`);
  }
  return res.json() as Promise<T>;
}

async function fetchAllPages<T>(baseUrl: string): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  while (true) {
    const sep = baseUrl.includes("?") ? "&" : "?";
    const batch = await ghFetch<T[]>(`${baseUrl}${sep}per_page=100&page=${page}`);
    items.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return items;
}

async function fetchReadyAt(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string | null> {
  try {
    const events = await ghFetch<TimelineEvent[]>(
      `${GITHUB_API}/repos/${owner}/${repo}/issues/${prNumber}/timeline`,
    );
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].event === "ready_for_review") {
        return events[i].created_at;
      }
    }
  } catch {
    // timeline API may fail for some repos
  }
  return null;
}

function escapeSQL(s: string): string {
  return s.replace(/'/g, "''");
}

function sqlVal(v: string | null): string {
  return v === null ? "NULL" : `'${escapeSQL(v)}'`;
}

type ReviewStatus = "pending" | "approved" | "changes_requested";

function mapReviewState(ghState: string): ReviewStatus {
  switch (ghState) {
    case "APPROVED":
      return "approved";
    case "CHANGES_REQUESTED":
      return "changes_requested";
    default:
      return "pending";
  }
}

const QA_REVIEWERS = new Set([
  "manuelv-ketryx",
  "georgezketryx",
  "krishnaketryx",
  "arzumorales",
  "dmrock",
]);

function splitReviews(reviews: GitHubReview[]): {
  qaReviews: GitHubReview[];
  devReviews: GitHubReview[];
} {
  const qaReviews: GitHubReview[] = [];
  const devReviews: GitHubReview[] = [];
  for (const r of reviews) {
    if (QA_REVIEWERS.has(r.user.login)) {
      qaReviews.push(r);
    } else {
      devReviews.push(r);
    }
  }
  return { qaReviews, devReviews };
}

function latestReviewState(reviews: GitHubReview[]): ReviewStatus {
  for (let i = reviews.length - 1; i >= 0; i--) {
    const s = reviews[i].state;
    if (s === "APPROVED" || s === "CHANGES_REQUESTED") {
      return mapReviewState(s);
    }
  }
  return "pending";
}

async function main() {
  const since = new Date();
  since.setDate(since.getDate() - 365);
  const sinceISO = since.toISOString();

  const rows: string[] = [];

  for (const repoFull of repos) {
    const [owner, repo] = repoFull.split("/");
    console.error(`Fetching PRs for ${repoFull} since ${sinceISO.slice(0, 10)}…`);

    const prs = await fetchAllPages<GitHubPR>(
      `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=all&sort=created&direction=desc&since=${sinceISO}`,
    );

    // Filter to PRs created in the last 7 days
    const recentPRs = prs.filter((pr) => new Date(pr.created_at) >= since);
    console.error(`  Found ${recentPRs.length} PRs created in the last 7 days`);

    for (const pr of recentPRs) {
      // Fetch reviews
      let reviews: GitHubReview[] = [];
      try {
        reviews = await ghFetch<GitHubReview[]>(
          `${GITHUB_API}/repos/${owner}/${repo}/pulls/${pr.number}/reviews`,
        );
      } catch {
        // reviews endpoint may fail
      }

      // Determine ready_at
      let readyAt: string | null = null;
      if (pr.draft) {
        readyAt = await fetchReadyAt(owner, repo, pr.number);
      } else {
        readyAt = pr.created_at;
      }

      // Duration
      let durationMs: number | null = null;
      if (pr.merged_at && readyAt) {
        durationMs =
          new Date(pr.merged_at).getTime() - new Date(readyAt).getTime();
      }

      // Split reviews into QA vs dev based on reviewer username
      const { qaReviews, devReviews } = splitReviews(reviews);
      const devReview = latestReviewState(devReviews);
      const qaReview = latestReviewState(qaReviews);

      // Jira ticket from PR description → fetch priority & due_date
      const jiraTicket = parseJiraTicket(pr.body);

      let priority: Priority = "medium";
      let dueDate: string | null = null;

      if (jiraTicket) {
        const jiraIssue = await fetchJiraIssue(jiraTicket);
        if (jiraIssue) {
          priority = mapJiraPriority(jiraIssue.fields.priority?.name);
          dueDate = jiraIssue.fields.duedate
            ? `${jiraIssue.fields.duedate}T17:00:00+00`
            : null;
          console.error(`  [jira] ${jiraTicket}: priority=${priority}, due=${dueDate ?? "none"}`);
        }
      }

      rows.push(
        `('${escapeSQL(repoFull)}', ${pr.number}, '${escapeSQL(pr.title)}', '${escapeSQL(pr.user.login)}', ` +
          `'${pr.created_at}', ${sqlVal(readyAt)}, ${sqlVal(pr.merged_at)}, ${durationMs}, ` +
          `${pr.draft}, '${priority}', ${sqlVal(dueDate)}, '${qaReview}', '${devReview}', ${sqlVal(jiraTicket)})`,
      );
    }
  }

  if (rows.length === 0) {
    console.error("No PRs found in the last 7 days.");
    process.exit(0);
  }

  // Output SQL
  console.log(`-- Schema
CREATE TABLE IF NOT EXISTS pr_metrics (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  repo text NOT NULL,
  pr_number integer NOT NULL,
  title text NOT NULL,
  author text NOT NULL,
  opened_at timestamptz NOT NULL,
  ready_at timestamptz,
  merged_at timestamptz,
  duration_ms bigint,
  was_draft boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'medium',
  due_date timestamptz,
  qa_review text NOT NULL DEFAULT 'pending',
  dev_review text NOT NULL DEFAULT 'pending',
  jira_ticket text,
  UNIQUE (repo, pr_number)
);
`);
  console.log(
    "INSERT INTO pr_metrics (repo, pr_number, title, author, opened_at, ready_at, merged_at, duration_ms, was_draft, priority, due_date, qa_review, dev_review, jira_ticket) VALUES",
  );
  console.log(rows.join(",\n"));
  console.log(`ON CONFLICT (repo, pr_number) DO UPDATE SET
  title = EXCLUDED.title,
  author = EXCLUDED.author,
  opened_at = EXCLUDED.opened_at,
  ready_at = EXCLUDED.ready_at,
  merged_at = EXCLUDED.merged_at,
  duration_ms = EXCLUDED.duration_ms,
  was_draft = EXCLUDED.was_draft,
  priority = EXCLUDED.priority,
  due_date = EXCLUDED.due_date,
  qa_review = EXCLUDED.qa_review,
  dev_review = EXCLUDED.dev_review,
  jira_ticket = EXCLUDED.jira_ticket;`);

  console.error(`\nDone – ${rows.length} rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});