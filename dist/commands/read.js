export async function readCommand(store, slug) {
    try {
        const content = await store.readCard(slug);
        return { success: true, content };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
}
//# sourceMappingURL=read.js.map