export interface CardListItem {
    slug: string;
    title: string;
}
export interface SearchResultItem {
    slug: string;
    title: string;
    firstParagraph: string;
    matchLine: string | null;
    links: string[];
}
export interface LinkStatsItem {
    slug: string;
    outbound: number;
    inbound: number;
}
export declare function formatCardList(cards: CardListItem[]): string;
export declare function formatSearchResult(result: SearchResultItem): string;
export declare function formatLinkStats(stats: LinkStatsItem[]): string;
export declare function formatCompactSearchResult(result: SearchResultItem, score?: number): string;
export declare function formatCardLinks(slug: string, outbound: string[], inbound: string[]): string;
