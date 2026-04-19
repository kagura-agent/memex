import matter from "gray-matter";
export function parseFrontmatter(raw) {
    try {
        const { data, content } = matter(raw);
        return { data, content };
    }
    catch {
        // Frontmatter parse failed (e.g. YAML special chars like # in values).
        // Fall back: treat entire file as content with empty metadata.
        const stripped = raw.replace(/^---[\s\S]*?---\n?/, "");
        return { data: {}, content: stripped || raw };
    }
}
export function stringifyFrontmatter(content, data) {
    // Build YAML manually to avoid gray-matter/js-yaml block scalars (>-)
    // which break simple frontmatter parsers
    const yamlLines = [];
    for (const [key, value] of Object.entries(data)) {
        if (value === undefined || value === null)
            continue;
        const str = String(value).replace(/\n/g, " ").trim();
        if (str === "" || /[:#{}[\],&*?|>!%@`']/.test(str)) {
            yamlLines.push(`${key}: '${str.replace(/'/g, "''")}'`);
        }
        else {
            yamlLines.push(`${key}: ${str}`);
        }
    }
    return `---\n${yamlLines.join("\n")}\n---\n${content}`;
}
export function extractLinks(body) {
    const re = /\[\[([^\]]+)\]\]/g;
    const links = new Set();
    let match;
    while ((match = re.exec(body)) !== null) {
        links.add(match[1]);
    }
    return [...links];
}
//# sourceMappingURL=parser.js.map