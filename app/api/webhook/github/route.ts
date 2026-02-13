import { NextRequest, NextResponse } from "next/server";
import { verifySignature, fetchReadyAt } from "@/lib/github";
import { supabase } from "@/lib/supabase";
import type { Priority, ReviewStatus } from "@/lib/types";

const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];
const REVIEW_STATUSES: ReviewStatus[] = ["pending", "approved", "changes_requested"];

function randomPriority(): Priority {
  return PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)];
}

function randomReviewStatus(): ReviewStatus {
  return REVIEW_STATUSES[Math.floor(Math.random() * REVIEW_STATUSES.length)];
}

function randomDueDate(openedAt: string): string | null {
  // 80% chance of having a due date, 3-14 days after opened
  if (Math.random() < 0.2) return null;
  const opened = new Date(openedAt);
  const daysAhead = 3 + Math.floor(Math.random() * 12);
  opened.setDate(opened.getDate() + daysAhead);
  opened.setHours(17, 0, 0, 0);
  return opened.toISOString();
}

export async function POST(req: NextRequest) {
  console.log("[webhook] Received POST request");

  const body = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  console.log("[webhook] Signature present:", !!signature);
  console.log("[webhook] Body length:", body.length);

  if (!verifySignature(body, signature, process.env.GITHUB_WEBHOOK_SECRET!)) {
    console.error("[webhook] Signature verification FAILED");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  console.log("[webhook] Signature verified OK");

  const payload = JSON.parse(body);

  console.log("[webhook] Event action:", payload.action);
  console.log("[webhook] Is PR:", !!payload.pull_request);
  console.log("[webhook] PR merged:", payload.pull_request?.merged);

  if (!payload.pull_request) {
    console.log("[webhook] Ignored — not a PR event");
    return NextResponse.json({ message: "Ignored" });
  }

  const pr = payload.pull_request;
  const repoFullName = payload.repository.full_name;
  const [owner, repo] = repoFullName.split("/");
  const prNumber: number = pr.number;

  // Handle PR opened
  if (payload.action === "opened") {
    console.log(`[webhook] Processing opened PR #${prNumber} in ${repoFullName}`);

    const row = {
      repo: repoFullName,
      pr_number: prNumber,
      title: pr.title,
      author: pr.user.login,
      opened_at: pr.created_at,
      ready_at: pr.draft ? null : pr.created_at,
      merged_at: null,
      duration_ms: null,
      was_draft: pr.draft ?? false,
      priority: randomPriority(),
      due_date: randomDueDate(pr.created_at),
      qa_review: "pending" as ReviewStatus,
      dev_review: "pending" as ReviewStatus,
    };

    console.log("[webhook] Upserting opened PR to Supabase:", JSON.stringify(row));

    const { error } = await supabase
      .from("pr_metrics")
      .upsert(row, { onConflict: "repo,pr_number" });

    if (error) {
      console.error("[webhook] Supabase upsert FAILED:", JSON.stringify(error));
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    console.log("[webhook] Upsert successful (opened)");
    return NextResponse.json({ message: "Recorded (opened)", repo: repoFullName, pr_number: prNumber });
  }

  // Handle PR merged
  if (payload.action !== "closed" || !pr.merged) {
    console.log("[webhook] Ignored — not an opened or merged PR");
    return NextResponse.json({ message: "Ignored" });
  }

  console.log(`[webhook] Processing merged PR #${prNumber} in ${repoFullName}`);
  console.log(`[webhook] PR title: "${pr.title}" by ${pr.user.login}`);
  console.log(`[webhook] PR created_at: ${pr.created_at}, merged_at: ${pr.merged_at}`);

  // Try to find ready_for_review event from timeline
  console.log("[webhook] Fetching timeline events...");
  const readyFromTimeline = await fetchReadyAt(owner, repo, prNumber);
  console.log("[webhook] ready_for_review from timeline:", readyFromTimeline);

  let readyAt: string;
  if (readyFromTimeline) {
    readyAt = readyFromTimeline;
  } else {
    // PR was never a draft — use created_at
    readyAt = pr.created_at;
  }

  const readyAtMs = new Date(readyAt).getTime();
  const mergedAtMs = new Date(pr.merged_at).getTime();
  const durationMs = mergedAtMs - readyAtMs;

  console.log(`[webhook] ready_at: ${readyAt}, duration_ms: ${durationMs}`);

  const row = {
    repo: repoFullName,
    pr_number: prNumber,
    title: pr.title,
    author: pr.user.login,
    opened_at: pr.created_at,
    ready_at: readyAt,
    merged_at: pr.merged_at,
    duration_ms: durationMs,
    was_draft: readyFromTimeline !== null,
    priority: randomPriority(),
    due_date: randomDueDate(pr.created_at),
    qa_review: randomReviewStatus(),
    dev_review: "approved" as ReviewStatus,
  };

  console.log("[webhook] Upserting to Supabase:", JSON.stringify(row));

  const { error } = await supabase
    .from("pr_metrics")
    .upsert(row, { onConflict: "repo,pr_number" });

  if (error) {
    console.error("[webhook] Supabase upsert FAILED:", JSON.stringify(error));
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  console.log("[webhook] Upsert successful");

  return NextResponse.json({
    message: "Recorded",
    repo: repoFullName,
    pr_number: prNumber,
    duration_ms: durationMs,
  });
}
