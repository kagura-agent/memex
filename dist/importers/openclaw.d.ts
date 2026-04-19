import type { Importer, ImportOptions, ImportResult } from "./index.js";
export interface Section {
    title: string;
    body: string;
}
export declare function slugify(text: string): string;
export declare function extractH2Sections(content: string): Section[];
export declare function extractDateFromFilename(filename: string): string | null;
export declare function yamlEscape(str: string): string;
export declare function buildCard(date: string | null, title: string, body: string, siblingLinks: string[]): string;
export declare function generateSlugs(sections: Section[], date: string | null, fallbackName: string): string[];
export declare class OpenClawImporter implements Importer {
    name: string;
    description: string;
    defaultSourceDir: string;
    run(opts: ImportOptions): Promise<ImportResult>;
}
