const HUB_THRESHOLD = 10;
export function formatCardList(cards) {
    if (cards.length === 0)
        return "";
    const maxSlugLen = Math.max(...cards.map((c) => c.slug.length));
    return cards.map((c) => `${c.slug.padEnd(maxSlugLen + 2)}${c.title}`).join("\n");
}
export function formatSearchResult(result) {
    const lines = [];
    lines.push(`## ${result.slug}`);
    lines.push(result.title);
    lines.push(result.firstParagraph);
    if (result.matchLine) {
        lines.push(`> 匹配行: ${result.matchLine}`);
    }
    if (result.links.length > 0) {
        lines.push(`Links: ${result.links.map((l) => `[[${l}]]`).join(", ")}`);
    }
    return lines.join("\n");
}
export function formatLinkStats(stats) {
    if (stats.length === 0)
        return "";
    const maxSlugLen = Math.max(...stats.map((s) => s.slug.length));
    const header = `${"slug".padEnd(maxSlugLen + 2)}${"out".padEnd(5)}${"in".padEnd(5)}status`;
    const rows = stats.map((s) => {
        let status = "";
        if (s.inbound === 0)
            status = "orphan";
        else if (s.inbound >= HUB_THRESHOLD)
            status = "hub";
        return `${s.slug.padEnd(maxSlugLen + 2)}${String(s.outbound).padEnd(5)}${String(s.inbound).padEnd(5)}${status}`;
    });
    return [header, ...rows].join("\n");
}
export function formatCompactSearchResult(result, score) {
    const scorePart = score !== undefined ? `  [${score.toFixed(2)}]` : "";
    return `${result.slug}  ${result.title}${scorePart}`;
}
export function formatCardLinks(slug, outbound, inbound) {
    const lines = [];
    lines.push(`## ${slug}`);
    lines.push(`Outbound: ${outbound.map((l) => `[[${l}]]`).join(", ") || "(none)"}`);
    lines.push(`Inbound:  ${inbound.map((l) => `[[${l}]]`).join(", ") || "(none)"}`);
    return lines.join("\n");
}
//# sourceMappingURL=formatter.js.map