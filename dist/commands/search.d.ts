import { CardStore } from "../lib/store.js";
import { MemexConfig } from "../lib/config.js";
import { type EmbeddingProvider } from "../lib/embeddings.js";
export interface ManifestFilter {
    category?: string;
    tag?: string;
    author?: string;
    since?: string;
    before?: string;
}
interface SearchOptions {
    limit?: number;
    all?: boolean;
    config?: MemexConfig;
    memexHome?: string;
    semantic?: boolean;
    compact?: boolean;
    /** Override embedding provider (for testing). */
    _embeddingProvider?: EmbeddingProvider;
    filter?: ManifestFilter;
}
interface SearchResult {
    output: string;
    exitCode: number;
}
export declare function searchCommand(store: CardStore, query: string | undefined, options?: SearchOptions): Promise<SearchResult>;
export {};
