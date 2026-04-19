// --- Importer registry ---
import { OpenClawImporter } from "./openclaw.js";
const importers = {};
function register(importer) {
    importers[importer.name] = importer;
}
register(new OpenClawImporter());
// register(new ObsidianImporter());  // future
// register(new NotionImporter());    // future
export function getImporter(name) {
    return importers[name];
}
export function listImporters() {
    return Object.values(importers);
}
//# sourceMappingURL=index.js.map