import { CardStore } from "../lib/store.js";
interface LinksResult {
    output: string;
    exitCode: number;
}
export declare function linksCommand(store: CardStore, slug: string | undefined): Promise<LinksResult>;
export {};
