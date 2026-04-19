import { CardStore } from "../lib/store.js";
interface ReadResult {
    success: boolean;
    content?: string;
    error?: string;
}
export declare function readCommand(store: CardStore, slug: string): Promise<ReadResult>;
export {};
