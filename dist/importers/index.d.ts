import { CardStore } from "../lib/store.js";
/**
 * Common interface for all memory importers.
 *
 * To add a new importer:
 * 1. Create src/importers/<name>.ts implementing Importer
 * 2. Register it in src/importers/index.ts
 * 3. Run: memex import <name> [--dry-run]
 */
export interface ImportResult {
    created: number;
    skipped: number;
}
export interface ImportOptions {
    store: CardStore;
    sourceDir: string;
    dryRun?: boolean;
    onLog?: (msg: string) => void;
}
export interface Importer {
    name: string;
    description: string;
    /** Default source directory (resolved from homedir) */
    defaultSourceDir: string;
    /** Run the import */
    run(opts: ImportOptions): Promise<ImportResult>;
}
export declare function getImporter(name: string): Importer | undefined;
export declare function listImporters(): Importer[];
