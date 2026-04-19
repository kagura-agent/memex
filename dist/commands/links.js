import { parseFrontmatter, extractLinks } from "../lib/parser.js";
import { formatLinkStats, formatCardLinks } from "../lib/formatter.js";
export async function linksCommand(store, slug) {
    const cards = await store.scanAll();
    if (cards.length === 0)
        return { output: "", exitCode: 0 };
    const outboundMap = new Map();
    const inboundMap = new Map();
    for (const card of cards) {
        inboundMap.set(card.slug, []);
    }
    for (const card of cards) {
        const raw = await store.readCard(card.slug);
        const { content } = parseFrontmatter(raw);
        const links = extractLinks(content);
        outboundMap.set(card.slug, links);
        for (const link of links) {
            const existing = inboundMap.get(link) || [];
            existing.push(card.slug);
            inboundMap.set(link, existing);
        }
    }
    if (slug) {
        const outbound = outboundMap.get(slug) || [];
        const inbound = inboundMap.get(slug) || [];
        return { output: formatCardLinks(slug, outbound, inbound), exitCode: 0 };
    }
    const stats = cards.map((card) => ({
        slug: card.slug,
        outbound: (outboundMap.get(card.slug) || []).length,
        inbound: (inboundMap.get(card.slug) || []).length,
    }));
    return { output: formatLinkStats(stats), exitCode: 0 };
}
//# sourceMappingURL=links.js.map