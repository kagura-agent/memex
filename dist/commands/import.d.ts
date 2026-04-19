import { CardStore } from "../lib/store.js";
interface ImportCommandResult {
    success: boolean;
    output?: string;
    error?: string;
}
export declare function importCommand(store: CardStore, source: string | undefined, opts: {
    dryRun?: boolean;
    dir?: string;
}): Promise<ImportCommandResult>;
export {};
