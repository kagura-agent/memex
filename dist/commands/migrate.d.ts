interface MigrateResult {
    success: boolean;
    output?: string;
    error?: string;
}
export declare function migrateCommand(memexHome: string, cardsDir: string, archiveDir: string): Promise<MigrateResult>;
export {};
