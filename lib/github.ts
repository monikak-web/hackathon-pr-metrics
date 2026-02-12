import { timingSafeEqual, createHmac } from "crypto";

export function verifySignature(
  payload: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) {
    console.error("[github] No signature header provided");
    return false;
  }

  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;

  if (expected.length !== signature.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

interface TimelineEvent {
  event: string;
  created_at: string;
}

export async function fetchReadyAt(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/timeline`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!res.ok) {
    console.error(`[github] Timeline API failed: ${res.status} ${res.statusText}`);
    const errBody = await res.text();
    console.error("[github] Response body:", errBody);
    return null;
  }

  const events: TimelineEvent[] = await res.json();
  console.log(`[github] Timeline returned ${events.length} events`);

  // Find the last ready_for_review event
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].event === "ready_for_review") {
      return events[i].created_at;
    }
  }

  return null;
}
