export class HookRegistry {
    hooks = new Map();
    on(key, fn) {
        const existing = this.hooks.get(key) || [];
        existing.push(fn);
        this.hooks.set(key, existing);
    }
    async run(phase, operation) {
        const key = `${phase}:${operation}`;
        for (const fn of this.hooks.get(key) || []) {
            try {
                await fn();
            }
            catch {
                // hooks fail silently — they're infrastructure, not business logic
            }
        }
    }
}
//# sourceMappingURL=hooks.js.map