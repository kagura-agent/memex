import { CardStore } from "../lib/store.js";
interface OrganizeResult {
    output: string;
    exitCode: number;
}
export declare function organizeCommand(store: CardStore, lastOrganize: string | null): Promise<OrganizeResult>;
export {};
