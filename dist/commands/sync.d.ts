interface SyncOptions {
    init?: boolean;
    remote?: string;
    auto?: string;
    status?: boolean;
    action?: "push" | "pull";
}
interface SyncCommandResult {
    success: boolean;
    output?: string;
    error?: string;
}
export declare function syncCommand(home: string, opts: SyncOptions): Promise<SyncCommandResult>;
export {};
