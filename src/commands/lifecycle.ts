import { CardStore } from "../lib/store.js";
import { parseFrontmatter, stringifyFrontmatter } from "../lib/parser.js";
import { autoSync } from "../lib/sync.js";
import { dirname } from "node:path";

/**
 * Lifecycle frontmatter fields (Phase 1 of auto fact extraction):
 *   evidence_count: number   — how many independent sessions reinforced this card
 *   last_reinforced: string  — YYYY-MM-DD of last reinforcement
 *   confidence: number       — 0-1 confidence score
 *   status: string           — active | draft | stale | archived
 *
 * Rules:
 *   - evidence_count >= 3 → auto-promote to "active"
 *   - 30 days without reinforce → "stale"
 *   - stale + 90 days + confidence < 0.5 → "archived"
 */

const STALE_DAYS = 30;
const ARCHIVE_DAYS = 90; // after going stale
const AUTO_PROMOTE_EVIDENCE = 3;

interface LifecycleFields {
  evidence_count: number;
  last_reinforced: string | null;
  confidence: number;
  status: string; // active | draft | stale | archived
}

function extractLifecycle(data: Record<string, unknown>): LifecycleFields {
  return {
    evidence_count: typeof data.evidence_count === "number" ? data.evidence_count : 0,
    last_reinforced: typeof data.last_reinforced === "string" ? data.last_reinforced
      : data.last_reinforced instanceof Date ? data.last_reinforced.toISOString().split("T")[0]
      : null,
    confidence: typeof data.confidence === "number" ? data.confidence : 0,
    status: typeof data.status === "string" ? data.status : "",
  };
}

function daysBetween(dateStr: string, now: Date): number {
  const d = new Date(dateStr + "T00:00:00Z");
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function computeExpectedStatus(lc: LifecycleFields, created: string | null, now: Date): string {
  const current = lc.status;
  if (current === "archived") return "archived"; // archived stays archived unless manually changed

  // Determine reference date for staleness
  const refDate = lc.last_reinforced || created;
  const daysSinceRef = refDate ? daysBetween(refDate, now) : Infinity;

  // Check archive condition: stale + 90 days + low confidence
  if (current === "stale" && daysSinceRef >= STALE_DAYS + ARCHIVE_DAYS && lc.confidence < 0.5) {
    return "archived";
  }

  // Check stale condition
  if (daysSinceRef >= STALE_DAYS && current !== "draft") {
    // But if evidence_count is high, don't stale it (well-established knowledge)
    if (lc.evidence_count >= AUTO_PROMOTE_EVIDENCE) {
      return "active"; // well-established cards stay active
    }
    return "stale";
  }

  // Check auto-promote
  if (lc.evidence_count >= AUTO_PROMOTE_EVIDENCE) {
    return "active";
  }

  // Default: keep current or draft
  return current || "draft";
}

interface LifecycleResult {
  output: string;
  exitCode: number;
}

export async function lifecycleAuditCommand(store: CardStore): Promise<LifecycleResult> {
  const cards = await store.scanAll();
  if (cards.length === 0) return { output: "No cards.", exitCode: 0 };

  const now = new Date();
  const statusCounts: Record<string, number> = { active: 0, draft: 0, stale: 0, archived: 0, untracked: 0 };
  const needsAttention: { slug: string; current: string; suggested: string; reason: string }[] = [];
  const recentlyReinforced: { slug: string; date: string; count: number }[] = [];

  for (const card of cards) {
    const raw = await store.readCard(card.slug);
    const { data } = parseFrontmatter(raw);
    const lc = extractLifecycle(data);
    const created = data.created instanceof Date
      ? data.created.toISOString().split("T")[0]
      : typeof data.created === "string" ? data.created : null;

    // Count current status
    if (lc.status && statusCounts[lc.status] !== undefined) {
      statusCounts[lc.status]++;
    } else {
      statusCounts.untracked++;
    }

    // Check if status should change
    const expected = computeExpectedStatus(lc, created, now);
    if (expected !== (lc.status || "draft") && lc.status !== "") {
      let reason = "";
      if (expected === "stale") reason = `no reinforcement in ${STALE_DAYS}+ days`;
      else if (expected === "active") reason = `evidence_count >= ${AUTO_PROMOTE_EVIDENCE}`;
      else if (expected === "archived") reason = "stale + 90d + low confidence";
      needsAttention.push({ slug: card.slug, current: lc.status || "(none)", suggested: expected, reason });
    }

    // Track recently reinforced
    if (lc.last_reinforced) {
      const days = daysBetween(lc.last_reinforced, now);
      if (days <= 7) {
        recentlyReinforced.push({ slug: card.slug, date: lc.last_reinforced, count: lc.evidence_count });
      }
    }
  }

  const sections: string[] = [];
  sections.push("# Lifecycle Audit Report\n");

  sections.push(
    `## Status Distribution\n` +
    `- Active: ${statusCounts.active}\n` +
    `- Draft: ${statusCounts.draft}\n` +
    `- Stale: ${statusCounts.stale}\n` +
    `- Archived: ${statusCounts.archived}\n` +
    `- Untracked (no lifecycle fields): ${statusCounts.untracked}\n` +
    `- Total: ${cards.length}`
  );

  if (needsAttention.length > 0) {
    sections.push(
      `## Needs Attention (${needsAttention.length} cards)\n` +
      needsAttention.map(n =>
        `- **${n.slug}**: ${n.current} → ${n.suggested} (${n.reason})`
      ).join("\n")
    );
  }

  if (recentlyReinforced.length > 0) {
    sections.push(
      `## Recently Reinforced (last 7 days)\n` +
      recentlyReinforced.map(r =>
        `- ${r.slug}: ${r.date} (evidence: ${r.count})`
      ).join("\n")
    );
  }

  return { output: sections.join("\n\n"), exitCode: 0 };
}

export async function lifecycleReinforceCommand(store: CardStore, slug: string): Promise<LifecycleResult> {
  let raw: string;
  try {
    raw = await store.readCard(slug);
  } catch {
    return { output: `Card not found: ${slug}`, exitCode: 1 };
  }

  const { data, content } = parseFrontmatter(raw);
  const today = new Date().toISOString().split("T")[0];

  // Update lifecycle fields
  const count = (typeof data.evidence_count === "number" ? data.evidence_count : 0) + 1;
  data.evidence_count = count;
  data.last_reinforced = today;
  data.modified = today;

  // Auto-promote if threshold reached
  if (count >= AUTO_PROMOTE_EVIDENCE && data.status !== "active") {
    data.status = "active";
  }

  // If was stale, reinforce resets to active or draft
  if (data.status === "stale") {
    data.status = count >= AUTO_PROMOTE_EVIDENCE ? "active" : "draft";
  }

  const output = stringifyFrontmatter(content, data);
  await store.writeCard(slug, output);
  await autoSync(dirname(store.cardsDir));

  return {
    output: `Reinforced ${slug}: evidence_count=${count}, last_reinforced=${today}` +
      (data.status ? `, status=${data.status}` : ""),
    exitCode: 0,
  };
}

export async function lifecycleInitCommand(store: CardStore, opts: { dryRun?: boolean }): Promise<LifecycleResult> {
  const cards = await store.scanAll();
  const today = new Date().toISOString().split("T")[0];
  let updated = 0;
  const changes: string[] = [];

  for (const card of cards) {
    const raw = await store.readCard(card.slug);
    const { data, content } = parseFrontmatter(raw);

    // Skip if already has lifecycle fields
    if (data.evidence_count !== undefined && data.status !== undefined) continue;

    // Initialize lifecycle fields
    if (data.evidence_count === undefined) data.evidence_count = 1;
    if (data.last_reinforced === undefined) data.last_reinforced = data.modified || data.created || today;
    if (data.confidence === undefined) data.confidence = 0.5;
    if (data.status === undefined) data.status = "draft";

    // Normalize dates
    if (data.last_reinforced instanceof Date) {
      data.last_reinforced = data.last_reinforced.toISOString().split("T")[0];
    }

    if (!opts.dryRun) {
      const output = stringifyFrontmatter(content, data);
      await store.writeCard(card.slug, output);
    }

    changes.push(`- ${card.slug}: initialized (evidence=1, status=draft)`);
    updated++;
  }

  if (updated === 0) {
    return { output: "All cards already have lifecycle fields.", exitCode: 0 };
  }

  const prefix = opts.dryRun ? "[DRY RUN] " : "";
  return {
    output: `${prefix}Initialized lifecycle fields on ${updated} cards:\n${changes.join("\n")}`,
    exitCode: 0,
  };
}
