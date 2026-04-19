/**
 * Validate a slug before writing. Throws on invalid slugs.
 *
 * Rules:
 *  - Must not be empty or whitespace-only after trimming
 *  - Must not consist solely of dots and/or slashes
 *  - Must not contain OS-reserved characters (: * ? " < > |)
 *  - Must not contain empty path segments (e.g. "a//b", "/foo", "foo/")
 */
export declare function validateSlug(slug: string): void;
interface ScannedCard {
    slug: string;
    path: string;
}
export declare class CardStore {
    readonly cardsDir: string;
    private archiveDir;
    private nestedSlugs;
    private scanCache;
    constructor(cardsDir: string, archiveDir: string, nestedSlugs?: boolean);
    /** Invalidate scan cache after writes/deletes */
    invalidateCache(): void;
    scanAll(): Promise<ScannedCard[]>;
    private walkDir;
    resolve(slug: string): Promise<string | null>;
    readCard(slug: string): Promise<string>;
    private assertSafePath;
    writeCard(slug: string, content: string): Promise<void>;
    archiveCard(slug: string): Promise<void>;
}
export {};
