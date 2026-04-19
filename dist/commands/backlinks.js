import { CardStore } from "../lib/store.js";
import { parseFrontmatter, extractLinks } from "../lib/parser.js";
import { join } from "node:path";
export async function backlinksCommand(store, slug, options = {}) {
    // Gather all stores to scan
    const storesToSearch = [
        { store, dirPrefix: "cards" },
    ];
    // Add additional search directories if --all is set
    if (options.all && options.config?.searchDirs && options.config.searchDirs.length > 0 && options.memexHome) {
        const archiveDir = join(options.memexHome, "archive");
        for (const searchDir of options.config.searchDirs) {
            const fullPath = join(options.memexHome, searchDir);
            const additionalStore = new CardStore(fullPath, archiveDir, store["nestedSlugs"]);
            const dirName = searchDir.split("/").pop() || searchDir;
            storesToSearch.push({ store: additionalStore, dirPrefix: dirName });
        }
    }
    const backlinks = [];
    for (const { store: s, dirPrefix } of storesToSearch) {
        const cards = await s.scanAll();
        for (const card of cards) {
            const raw = await s.readCard(card.slug);
            const { content } = parseFrontmatter(raw);
            const links = extractLinks(content);
            if (links.includes(slug)) {
                backlinks.push({ slug: card.slug, dirPrefix });
            }
        }
    }
    if (backlinks.length === 0) {
        return { output: `No backlinks found for ${slug}`, exitCode: 0 };
    }
    const lines = backlinks.map((b) => `  - ${b.slug} (${b.dirPrefix}/)`);
    const output = `Backlinks for ${slug}:\n${lines.join("\n")}`;
    return { output, exitCode: 0 };
}
//# sourceMappingURL=backlinks.js.map