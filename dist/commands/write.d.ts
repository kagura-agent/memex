import { CardStore } from "../lib/store.js";
interface WriteResult {
    success: boolean;
    error?: string;
}
export declare function writeCommand(store: CardStore, slug: string, input: string): Promise<WriteResult>;
export {};
