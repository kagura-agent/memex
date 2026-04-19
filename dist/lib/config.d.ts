import type { EmbeddingProviderType } from "./embeddings.js";
export interface MemexConfig {
    nestedSlugs: boolean;
    searchDirs?: string[];
    openaiApiKey?: string;
    openaiBaseUrl?: string;
    embeddingModel?: string;
    /** Embedding provider: "openai" | "local" | "ollama". Auto-detected if omitted. */
    embeddingProvider?: EmbeddingProviderType;
    /** Ollama model name (default: "nomic-embed-text"). */
    ollamaModel?: string;
    /** Ollama base URL (default: "http://localhost:11434"). */
    ollamaBaseUrl?: string;
    /** Local GGUF model path or HuggingFace URI for node-llama-cpp. */
    localModelPath?: string;
}
/**
 * Read config from $MEMEX_HOME/.memexrc
 * Returns default config if file doesn't exist or is invalid.
 */
export declare function readConfig(memexHome: string): Promise<MemexConfig>;
/**
 * Walk up from `startDir` looking for a `.memexrc` file.
 * Returns the directory containing the file, or undefined if not found.
 * Stops at the filesystem root.
 */
export declare function findMemexrcUp(startDir: string): Promise<string | undefined>;
/**
 * Resolve the memex home directory.
 * Precedence: MEMEX_HOME env var > walk-up .memexrc discovery > ~/.memex fallback.
 */
export declare function resolveMemexHome(): Promise<string>;
/**
 * Warn to stderr if the cards directory doesn't exist or is empty.
 */
export declare function warnIfEmptyCards(home: string): Promise<void>;
