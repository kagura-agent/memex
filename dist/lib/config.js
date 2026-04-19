import { readFile, readdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
/**
 * Read config from $MEMEX_HOME/.memexrc
 * Returns default config if file doesn't exist or is invalid.
 */
export async function readConfig(memexHome) {
    const configPath = join(memexHome, ".memexrc");
    try {
        const content = await readFile(configPath, "utf-8");
        const parsed = JSON.parse(content);
        return {
            nestedSlugs: parsed.nestedSlugs === true,
            searchDirs: Array.isArray(parsed.searchDirs) ? parsed.searchDirs : undefined,
            openaiApiKey: typeof parsed.openaiApiKey === "string" ? parsed.openaiApiKey : undefined,
            openaiBaseUrl: typeof parsed.openaiBaseUrl === "string" ? parsed.openaiBaseUrl : undefined,
            embeddingModel: typeof parsed.embeddingModel === "string" ? parsed.embeddingModel : undefined,
            embeddingProvider: isValidProvider(parsed.embeddingProvider) ? parsed.embeddingProvider : undefined,
            ollamaModel: typeof parsed.ollamaModel === "string" ? parsed.ollamaModel : undefined,
            ollamaBaseUrl: typeof parsed.ollamaBaseUrl === "string" ? parsed.ollamaBaseUrl : undefined,
            localModelPath: typeof parsed.localModelPath === "string" ? parsed.localModelPath : undefined,
        };
    }
    catch {
        // File doesn't exist or invalid JSON - return defaults
        return {
            nestedSlugs: false,
        };
    }
}
function isValidProvider(value) {
    return value === "openai" || value === "local" || value === "ollama";
}
/**
 * Walk up from `startDir` looking for a `.memexrc` file.
 * Returns the directory containing the file, or undefined if not found.
 * Stops at the filesystem root.
 */
export async function findMemexrcUp(startDir) {
    let dir = startDir;
    for (;;) {
        try {
            await access(join(dir, ".memexrc"));
            return dir;
        }
        catch {
            // not found, keep walking
        }
        const parent = dirname(dir);
        if (parent === dir)
            break; // reached filesystem root
        dir = parent;
    }
    return undefined;
}
/**
 * Resolve the memex home directory.
 * Precedence: MEMEX_HOME env var > walk-up .memexrc discovery > ~/.memex fallback.
 */
export async function resolveMemexHome() {
    if (process.env.MEMEX_HOME) {
        return process.env.MEMEX_HOME;
    }
    const found = await findMemexrcUp(process.cwd());
    if (found) {
        return found;
    }
    return join(homedir(), ".memex");
}
/**
 * Warn to stderr if the cards directory doesn't exist or is empty.
 */
export async function warnIfEmptyCards(home) {
    const cardsDir = join(home, "cards");
    try {
        const entries = await readdir(cardsDir);
        if (entries.length === 0) {
            process.stderr.write(`Warning: cards directory is empty (${cardsDir})\n`);
        }
    }
    catch {
        process.stderr.write(`Warning: cards directory not found (${cardsDir})\n`);
    }
}
//# sourceMappingURL=config.js.map