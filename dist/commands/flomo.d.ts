import { CardStore } from "../lib/store.js";
interface FlomoConfig {
    webhookUrl?: string;
}
export declare function readFlomoConfig(memexHome: string): Promise<FlomoConfig>;
export declare function writeFlomoConfig(memexHome: string, webhookUrl: string): Promise<{
    success: boolean;
    error?: string;
}>;
export declare function flomoConfigCommand(memexHome: string, opts: {
    setWebhook?: string;
    show?: boolean;
}): Promise<{
    output: string;
    exitCode: number;
}>;
export interface FlomoMemo {
    timestamp: string;
    content: string;
    tags: string[];
    slug: string;
    title: string;
}
/**
 * Parse flomo HTML export into structured memos.
 * Flomo HTML structure:
 *   <div class="memos">
 *     <div class="memo">
 *       <div class="time">2021-03-29 18:07:06</div>
 *       <div class="content"><p>...</p></div>
 *       <div class="files">...</div>
 *     </div>
 *   </div>
 */
export declare function parseFlomoHtml(html: string): FlomoMemo[];
export declare function flomoImportCommand(store: CardStore, filePath: string, opts: {
    dryRun?: boolean;
}): Promise<{
    output: string;
    exitCode: number;
}>;
export declare function flomoPushCommand(store: CardStore, memexHome: string, slugOrOpts: string | undefined, opts: {
    all?: boolean;
    source?: string;
    tag?: string;
    dryRun?: boolean;
    fetchFn?: typeof globalThis.fetch;
}): Promise<{
    output: string;
    exitCode: number;
}>;
export {};
