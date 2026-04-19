export interface ParsedCard {
    data: Record<string, unknown>;
    content: string;
}
export declare function parseFrontmatter(raw: string): ParsedCard;
export declare function stringifyFrontmatter(content: string, data: Record<string, unknown>): string;
export declare function extractLinks(body: string): string[];
