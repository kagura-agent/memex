import type { CardStore } from "./store.js";
/**
 * Generic embedding provider interface.
 * Implementations convert text arrays into vector arrays.
 */
export interface EmbeddingProvider {
    readonly model: string;
    embed(texts: string[]): Promise<number[][]>;
}
export type EmbeddingProviderType = "openai" | "local" | "ollama";
export declare class OpenAIEmbeddingProvider implements EmbeddingProvider {
    readonly model: string;
    private apiKey;
    private baseHostname;
    private basePath;
    private basePort;
    private useHttp;
    constructor(apiKey?: string, model?: string, baseUrl?: string);
    embed(texts: string[]): Promise<number[][]>;
    private requestEmbeddings;
}
/**
 * Check whether node-llama-cpp is available (installed and importable).
 */
export declare function isNodeLlamaCppAvailable(): Promise<boolean>;
/**
 * Split text into chunks that fit within a character limit.
 * Splits on paragraph boundaries (double newlines) when possible,
 * falling back to hard truncation for very long paragraphs.
 */
export declare function chunkText(text: string, maxChars: number): string[];
/**
 * Local embedding provider using node-llama-cpp with a GGUF model.
 *
 * - Lazily loads node-llama-cpp and the model on first embed() call
 * - Downloads the model automatically on first use (~328 MB)
 * - Produces 768-dimensional vectors (with embeddinggemma-300m)
 * - Requires node-llama-cpp as an optional dependency
 * - Automatically chunks long texts that exceed the model's context window
 */
export declare class LocalEmbeddingProvider implements EmbeddingProvider {
    readonly model: string;
    private modelPath;
    private context;
    private initPromise;
    /** Maximum safe character length for a single embedding call. */
    private _maxChars;
    constructor(modelPath?: string);
    /** Expose maxChars for testing and diagnostics. */
    get maxChars(): number;
    private ensureContext;
    embed(texts: string[]): Promise<number[][]>;
}
/**
 * Ollama embedding provider — calls a local Ollama server's /api/embed endpoint.
 *
 * Lightweight alternative that requires only a running Ollama instance.
 * No native dependencies needed.
 */
export declare class OllamaEmbeddingProvider implements EmbeddingProvider {
    readonly model: string;
    private baseUrl;
    constructor(options?: {
        model?: string;
        baseUrl?: string;
    });
    embed(texts: string[]): Promise<number[][]>;
}
export interface CreateProviderOptions {
    type?: EmbeddingProviderType;
    openaiApiKey?: string;
    openaiBaseUrl?: string;
    openaiModel?: string;
    localModelPath?: string;
    ollamaModel?: string;
    ollamaBaseUrl?: string;
}
/**
 * Create an embedding provider based on the requested type.
 *
 * Resolution order when type is not specified:
 * 1. If OPENAI_API_KEY is available → OpenAI
 * 2. If node-llama-cpp is installed → Local
 * 3. Error with helpful message
 */
export declare function createEmbeddingProvider(options?: CreateProviderOptions): Promise<EmbeddingProvider>;
interface CacheEntry {
    vector: number[];
    contentHash: string;
    updatedAt: string;
}
/**
 * File-backed embedding cache.
 * Stores vectors keyed by card slug with content-hash invalidation.
 */
export declare class EmbeddingCache {
    private memexHome;
    private cacheModel;
    private data;
    private filePath;
    constructor(memexHome: string, cacheModel: string);
    load(): Promise<void>;
    save(): Promise<void>;
    get(slug: string): CacheEntry | undefined;
    set(slug: string, vector: number[], contentHash: string): void;
    remove(slug: string): void;
    needsUpdate(slug: string, currentHash: string): boolean;
    /** Returns all cached slugs (for stale-entry detection). */
    slugs(): string[];
}
/** Compute SHA-256 hex digest of a string. */
export declare function contentHash(text: string): string;
/** Cosine similarity between two vectors of equal length. */
export declare function cosineSimilarity(a: number[], b: number[]): number;
export interface EmbedCardsResult {
    embedded: number;
    removed: number;
    total: number;
}
/**
 * Scan all cards, embed new/changed ones, remove stale cache entries.
 */
export declare function embedCards(store: CardStore, provider: EmbeddingProvider, cache: EmbeddingCache): Promise<EmbedCardsResult>;
export {};
