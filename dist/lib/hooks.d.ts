type Phase = "pre" | "post";
type Operation = "recall" | "retro" | "organize" | "show" | "pull" | "push" | "init";
type HookKey = `${Phase}:${Operation}`;
type HookFn = () => Promise<void>;
export declare class HookRegistry {
    private hooks;
    on(key: HookKey, fn: HookFn): void;
    run(phase: Phase, operation: Operation): Promise<void>;
}
export {};
