export interface SyncConfig {
    remote?: string;
    adapter: string;
    auto: boolean;
    lastSync?: string;
}
export interface SyncResult {
    success: boolean;
    message: string;
}
export interface SyncStatus {
    configured: boolean;
    remote?: string;
    adapter: string;
    auto: boolean;
    lastSync?: string;
}
export interface SyncAdapter {
    init(remote?: string): Promise<void>;
    pull(): Promise<SyncResult>;
    push(): Promise<SyncResult>;
    sync(): Promise<SyncResult>;
    status(): Promise<SyncStatus>;
}
export declare function readSyncConfig(home: string): Promise<SyncConfig>;
export declare function writeSyncConfig(home: string, config: SyncConfig): Promise<void>;
export declare class GitAdapter implements SyncAdapter {
    private home;
    constructor(home: string);
    init(remote?: string): Promise<void>;
    pull(): Promise<SyncResult>;
    push(): Promise<SyncResult>;
    sync(): Promise<SyncResult>;
    status(): Promise<SyncStatus>;
}
export declare function autoSync(home: string): Promise<void>;
export declare function autoFetch(home: string): Promise<void>;
