/**
 * `memex extract` — Post-session fact extraction (Phase 2).
 *
 * Reads a session transcript from stdin, uses LLM to extract 0-3 facts,
 * then routes each fact to existing cards (reinforce + append) or creates
 * new draft cards.
 *
 * Usage:
 *   cat session.md | memex extract
 *   memex extract < session.md
 *   memex extract --file session.md
 *   memex extract --dry-run < session.md
 */

import { CardStore } from "../lib/store.js";
import { parseFrontmatter, stringifyFrontmatter } from "../lib/parser.js";
import { chatCompletion, type LLMConfig, type ChatMessage } from "../lib/llm.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
import { MemexConfig } from "../lib/config.js";
import {
  EmbeddingCache,
  embedCards,
  cosineSimilarity,
  createEmbeddingProvider,
  type EmbeddingProvider,
} from "../lib/embeddings.js";
import { autoSync } from "../lib/sync.js";
import { dirname, join } from "node:path";

// --- Types ---

interface ExtractedFact {
  slug: string;
  title: string;
  type: string; // identity | preference | goal | project | decision | insight | pattern
  content: string;
  confidence: number;
  tags: string[];
  links: string[]; // suggested [[wikilinks]]
}

interface ExtractResult {
  output: string;
  exitCode: number;
}

interface ExtractOptions {
  dryRun?: boolean;
  model?: string;
  memexHome: string;
  config: MemexConfig & { llmCommand?: string };
}

// --- Extraction Prompt ---

const SYSTEM_PROMPT = `You are a knowledge extraction agent for a Zettelkasten (memex) system. Your job is to extract durable, reusable facts from session transcripts.

Rules:
- Extract 0-3 facts per session. Quality over quantity. Zero is fine if nothing is worth remembering.
- Each fact must be a standalone insight, decision, pattern, or piece of knowledge — NOT a log entry or task status.
- Skip ephemeral information (debugging steps, temporary workarounds, routine operations).
- Focus on: architectural decisions, design patterns, tool behaviors, ecosystem insights, reusable knowledge, identity/preference updates.
- Each fact needs a slug (kebab-case, descriptive), title, type, content (2-5 sentences), confidence (0-1), relevant tags, and suggested wikilinks.

Fact types:
- identity: who the agent/user is, values, principles
- preference: how they like things done
- goal: what they're working toward
- project: project-specific knowledge (architecture, API, quirks)
- decision: an important decision and its rationale
- insight: a cross-cutting realization or discovery
- pattern: a reusable approach or workflow

Respond in JSON:
{
  "facts": [
    {
      "slug": "kebab-case-slug",
      "title": "Human-readable title",
      "type": "insight|decision|pattern|project|identity|preference|goal",
      "content": "2-5 sentences describing the fact. Include context and reasoning.",
      "confidence": 0.7,
      "tags": ["tag1", "tag2"],
      "links": ["existing-card-slug-1", "related-concept"]
    }
  ]
}

If nothing is worth extracting, respond: { "facts": [] }`;

// --- Similarity threshold for matching existing cards ---
const SIMILARITY_THRESHOLD = 0.78;

// --- Core Logic ---

/**
 * Extract facts from a session transcript and route them to memex cards.
 */
export async function extractCommand(
  store: CardStore,
  transcript: string,
  options: ExtractOptions,
): Promise<ExtractResult> {
  if (!transcript.trim()) {
    return { output: "No input provided. Pipe a session transcript to stdin.", exitCode: 1 };
  }

  // Truncate very long transcripts to ~4000 chars to keep LLM costs low
  const maxChars = 6000;
  const truncated = transcript.length > maxChars
    ? transcript.slice(0, maxChars) + "\n\n[... truncated ...]"
    : transcript;

  // Step 1: LLM extraction
  const apiKey = options.config.openaiApiKey ?? process.env.OPENAI_API_KEY;
  const llmCommandAvail = options.config.llmCommand ?? process.env.MEMEX_LLM_COMMAND;
  if (!apiKey && !llmCommandAvail) {
    return { output: "Error: No LLM configured. Set openaiApiKey in .memexrc, OPENAI_API_KEY env, or set llmCommand/.env MEMEX_LLM_COMMAND.", exitCode: 1 };
  }

  const llmConfig: LLMConfig = {
    apiKey: apiKey ?? "",
    baseUrl: options.config.openaiBaseUrl ?? process.env.OPENAI_BASE_URL,
    model: options.model ?? "gpt-4o-mini",
  };

  let facts: ExtractedFact[];
  try {
    const fullPrompt = `${SYSTEM_PROMPT}\n\nExtract facts from this session transcript:\n\n${truncated}\n\nRespond with JSON only.`;

    // Determine LLM backend: shell command or OpenAI API
    const llmCommand = options.config.llmCommand ?? process.env.MEMEX_LLM_COMMAND;
    let response: string;

    if (llmCommand) {
      // Shell command mode: pipe prompt to command, read stdout
      // Supports e.g. "openclaw capability model run --gateway --prompt"
      const args = llmCommand.split(/\s+/);
      const cmd = args.shift()!;
      args.push("--prompt", fullPrompt);
      const { stdout } = await execFileAsync(cmd, args, {
        timeout: 60_000,
        maxBuffer: 1024 * 1024,
      });
      // Strip any prefix lines (like "model.run via gateway\nprovider: ...")
      // and extract the actual response content
      response = stdout.trim();
    } else {
      // OpenAI API mode
      const messages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Extract facts from this session transcript:\n\n${truncated}` },
      ];

      response = await chatCompletion(messages, llmConfig, {
        temperature: 0.2,
        maxTokens: 1500,
        jsonMode: true,
      });
    }

    // Extract JSON from response (may have non-JSON prefix/suffix)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { output: `LLM returned no valid JSON:\n${response.slice(0, 500)}`, exitCode: 1 };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    facts = Array.isArray(parsed.facts) ? parsed.facts : [];

    // Validate facts
    facts = facts.filter(f =>
      typeof f.slug === "string" && f.slug.length > 0 &&
      typeof f.title === "string" &&
      typeof f.content === "string" &&
      typeof f.confidence === "number" && f.confidence >= 0 && f.confidence <= 1
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { output: `LLM extraction failed: ${msg}`, exitCode: 1 };
  }

  if (facts.length === 0) {
    return { output: "No facts extracted from this session (nothing worth remembering).", exitCode: 0 };
  }

  // Step 2: For each fact, semantic search for existing cards
  let provider: EmbeddingProvider | null = null;
  let cache: EmbeddingCache | null = null;

  try {
    provider = await createEmbeddingProvider({
      type: options.config.embeddingProvider,
      openaiApiKey: options.config.openaiApiKey,
      openaiBaseUrl: options.config.openaiBaseUrl,
      localModelPath: options.config.localModelPath,
      ollamaModel: options.config.ollamaModel,
      ollamaBaseUrl: options.config.ollamaBaseUrl,
    });
    cache = new EmbeddingCache(options.memexHome, provider.model);
    await cache.load();
    await embedCards(store, provider, cache);
    await cache.save();
  } catch {
    // Semantic search unavailable, fall back to keyword matching
    provider = null;
    cache = null;
  }

  const results: string[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const fact of facts) {
    // Search for similar existing card
    let bestMatch: { slug: string; score: number } | null = null;

    if (provider && cache) {
      try {
        const [queryVector] = await provider.embed([`${fact.title}\n${fact.content}`]);
        const allCards = await store.scanAll();

        for (const card of allCards) {
          const entry = cache.get(card.slug);
          if (!entry) continue;
          const score = cosineSimilarity(queryVector, entry.vector);
          if (score > (bestMatch?.score ?? 0)) {
            bestMatch = { slug: card.slug, score };
          }
        }
      } catch {
        // embedding failed for this fact, skip matching
      }
    }

    if (bestMatch && bestMatch.score >= SIMILARITY_THRESHOLD) {
      // Route: reinforce existing card
      if (options.dryRun) {
        results.push(`[DRY RUN] Would reinforce "${bestMatch.slug}" (similarity: ${bestMatch.score.toFixed(3)}) with:\n  ${fact.title}`);
      } else {
        try {
          const raw = await store.readCard(bestMatch.slug);
          const { data, content } = parseFrontmatter(raw);

          // Increment evidence
          const count = (typeof data.evidence_count === "number" ? data.evidence_count : 0) + 1;
          data.evidence_count = count;
          data.last_reinforced = today;
          data.modified = today;

          // Auto-promote
          if (count >= 3 && data.status !== "active") data.status = "active";
          if (data.status === "stale") data.status = count >= 3 ? "active" : "draft";

          // Append new evidence as a section
          const appendix = `\n\n## Evidence (${today})\n\n${fact.content}`;
          const output = stringifyFrontmatter(content + appendix, data);
          await store.writeCard(bestMatch.slug, output);

          results.push(`✓ Reinforced "${bestMatch.slug}" (similarity: ${bestMatch.score.toFixed(3)}, evidence: ${count})`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          results.push(`✗ Failed to reinforce "${bestMatch.slug}": ${msg}`);
        }
      }
    } else {
      // Route: create new draft card
      const tags = Array.isArray(fact.tags) ? fact.tags : [];
      if (!tags.includes(fact.type)) tags.unshift(fact.type);
      if (!tags.includes("auto-extracted")) tags.push("auto-extracted");

      const links = Array.isArray(fact.links) ? fact.links : [];
      const linksSection = links.length > 0
        ? `\n\n## Related\n\n${links.map(l => `- [[${l}]]`).join("\n")}`
        : "";

      const cardContent = `---
title: ${fact.title}
slug: ${fact.slug}
tags: [${tags.join(", ")}]
created: ${today}
modified: ${today}
source: auto-extraction
evidence_count: 1
last_reinforced: ${today}
confidence: ${fact.confidence}
status: draft
---

# ${fact.title}

${fact.content}${linksSection}
`;

      if (options.dryRun) {
        results.push(`[DRY RUN] Would create draft card "${fact.slug}":\n  ${fact.title}\n  confidence: ${fact.confidence}, tags: [${tags.join(", ")}]`);
      } else {
        try {
          // Check if slug already exists
          const existing = await store.resolve(fact.slug);
          if (existing) {
            results.push(`⊘ Skipped "${fact.slug}" (card already exists)`);
            continue;
          }

          await store.writeCard(fact.slug, cardContent);
          results.push(`✓ Created draft card "${fact.slug}" (confidence: ${fact.confidence})`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          results.push(`✗ Failed to create "${fact.slug}": ${msg}`);
        }
      }
    }
  }

  // Sync if we made changes
  if (!options.dryRun) {
    await autoSync(dirname(store.cardsDir));
  }

  const header = options.dryRun ? "# Extraction Preview (dry run)" : "# Extraction Results";
  return {
    output: `${header}\n\nExtracted ${facts.length} fact(s) from session:\n\n${results.join("\n")}`,
    exitCode: 0,
  };
}
