import { CardStore } from "../lib/store.js";
import { MemexConfig } from "../lib/config.js";
interface BacklinksOptions {
    all?: boolean;
    config?: MemexConfig;
    memexHome?: string;
}
interface BacklinksResult {
    output: string;
    exitCode: number;
}
export declare function backlinksCommand(store: CardStore, slug: string, options?: BacklinksOptions): Promise<BacklinksResult>;
export {};
