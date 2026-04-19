import { CardStore } from "../lib/store.js";
interface ArchiveResult {
    success: boolean;
    error?: string;
}
export declare function archiveCommand(store: CardStore, slug: string): Promise<ArchiveResult>;
export {};
