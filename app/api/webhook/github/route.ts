import { NextRequest, NextResponse } from "next/server";
import { verifySignature, fetchReadyAt } from "@/lib/github";
import { supabase } from "@/lib/supabase";

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

  // Only process merged PRs
  if (payload.action !== "closed" || !payload.pull_request?.merged) {
    console.log("[webhook] Ignored — not a merged PR");
    return NextResponse.json({ message: "Ignored" });
  }

  const pr = payload.pull_request;
  const repoFullName = payload.repository.full_name;
  const [owner, repo] = repoFullName.split("/");
  const prNumber: number = pr.number;

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
    ready_at: readyAt,
    merged_at: pr.merged_at,
    duration_ms: durationMs,
    was_draft: readyFromTimeline !== null,
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
