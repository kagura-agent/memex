import { autoSync } from "../lib/sync.js";
import { dirname } from "node:path";
export async function archiveCommand(store, slug) {
    try {
        await store.archiveCard(slug);
        await autoSync(dirname(store.cardsDir));
        return { success: true };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
}
//# sourceMappingURL=archive.js.map