/**
 * Lightweight LLM chat completion client using OpenAI-compatible API.
 * Reuses the same config (apiKey, baseUrl) already used for embeddings.
 * No external dependencies — uses native Node `http`/`https` modules.
 */
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

const DEFAULT_MODEL = "gpt-4o-mini";

export async function chatCompletion(
  messages: ChatMessage[],
  config: LLMConfig,
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean },
): Promise<string> {
  const url = config.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com";
  const parsed = new URL(url);
  const useHttp = parsed.protocol === "http:";
  const reqFn = useHttp ? httpRequest : httpsRequest;

  const body = JSON.stringify({
    model: config.model ?? DEFAULT_MODEL,
    messages,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 2000,
    ...(options?.jsonMode ? { response_format: { type: "json_object" } } : {}),
  });

  return new Promise((resolve, reject) => {
    const reqOptions: Record<string, unknown> = {
      hostname: parsed.hostname,
      path: `${parsed.pathname.replace(/\/$/, "")}/v1/chat/completions`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    if (parsed.port) reqOptions.port = Number(parsed.port);

    const req = reqFn(reqOptions as Parameters<typeof httpsRequest>[0], (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf-8");
        try {
          const data = JSON.parse(raw);
          if (data.error) {
            reject(new Error(`LLM API error: ${data.error.message ?? JSON.stringify(data.error)}`));
            return;
          }
          const content = data.choices?.[0]?.message?.content;
          if (typeof content !== "string") {
            reject(new Error(`Unexpected LLM response: ${raw.slice(0, 200)}`));
            return;
          }
          resolve(content);
        } catch (e) {
          reject(new Error(`Failed to parse LLM response: ${raw.slice(0, 200)}`));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
