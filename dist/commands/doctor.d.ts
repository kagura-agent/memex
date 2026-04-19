interface DoctorResult {
    exitCode: number;
    output?: string;
}
export declare function doctorCommand(cardsDir: string, archiveDir: string): Promise<DoctorResult>;
export {};
