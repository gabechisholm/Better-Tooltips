/**
 * Lightweight, self-contained Markdown parser and HTML sanitizer.
 * Designed specifically for Power BI custom visuals to prevent Webpack bundling issues.
 */

/**
 * Sanitizes HTML string using browser DOMParser to strip unsafe elements, event attributes, and javascript: links.
 */
export function sanitizeHtml(html: string): string {
    if (typeof document === "undefined" || !html) {
        return html || "";
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Set of allowed HTML tags for the rich tooltip
        const allowedTags = new Set([
            "h1", "h2", "h3", "h4", "h5", "h6",
            "p", "br", "span", "div", "blockquote",
            "strong", "em", "b", "i", "u", "code", "pre",
            "ul", "ol", "li",
            "a", "img",
            "table", "thead", "tbody", "tr", "th", "td"
        ]);

        // Whitelist of allowed attributes per tag
        const allowedAttributes: { [key: string]: string[] } = {
            "a": ["href", "target", "title", "rel", "style"],
            "img": ["src", "alt", "title", "width", "height", "style"],
            "span": ["style", "class"],
            "div": ["style", "class"],
            "p": ["style", "class"],
            "table": ["style", "class", "border", "cellpadding", "cellspacing"],
            "td": ["style", "class", "colspan", "rowspan", "align"],
            "th": ["style", "class", "colspan", "rowspan", "align"]
        };

        const cleanNode = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return;
            }

            if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                const tagName = el.tagName.toLowerCase();

                // If tag is not allowed
                if (!allowedTags.has(tagName)) {
                    // Check if it is highly dangerous - remove entirely
                    if (["script", "style", "iframe", "object", "embed", "form", "button", "input", "textarea", "meta", "link"].indexOf(tagName) !== -1) {
                        el.parentNode?.removeChild(el);
                        return;
                    }

                    // Otherwise, keep children but unwrap the element
                    while (el.firstChild) {
                        el.parentNode?.insertBefore(el.firstChild, el);
                    }
                    el.parentNode?.removeChild(el);
                    return;
                }

                // Clean attributes
                const attrs = Array.from(el.attributes);
                const allowedAttrs = allowedAttributes[tagName] || [];

                for (const attr of attrs) {
                    const attrName = attr.name.toLowerCase();

                    // Remove event handlers (onclick, onerror, etc.)
                    if (attrName.startsWith("on")) {
                        el.removeAttribute(attr.name);
                        continue;
                    }

                    // Strip non-whitelisted attributes
                    if (allowedAttrs.indexOf(attrName) === -1) {
                        el.removeAttribute(attr.name);
                        continue;
                    }

                    // Secure link and image URLs
                    if (attrName === "href" || attrName === "src") {
                        const val = attr.value.trim().toLowerCase();
                        if (
                            val.startsWith("javascript:") ||
                            val.startsWith("vbscript:") ||
                            val.startsWith("file:") ||
                            val.startsWith("data:") && !val.startsWith("data:image/")
                        ) {
                            el.removeAttribute(attr.name);
                        }
                    }
                }

                // Clean children (clone children array because DOM modifications can shift indices)
                const children = Array.from(el.childNodes);
                for (const child of children) {
                    cleanNode(child);
                }
            }
        };

        const body = doc.body;
        const topChildren = Array.from(body.childNodes);
        for (const child of topChildren) {
            cleanNode(child);
        }

        return body.innerHTML;
    } catch (e) {
        console.error("HTML Sanitization Error", e);
        return "";
    }
}

/**
 * Parses inline Markdown constructs (bold, italic, code, links, images) inside an HTML string.
 */
function parseInlineMarkdown(text: string): string {
    if (!text) return "";

    // Escape raw less-than/greater-than signs that aren't parts of HTML tag structures
    // we already support in markdown, but let's do standard markdown inline replacements:

    // 1. Images & GIFs: ![alt](url)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
        return `<img src="${url}" alt="${alt}" style="max-width: 100%; height: auto; display: block; margin: 8px 0;" />`;
    });

    // 2. Links: [text](url)
    text = text.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match, label, url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });

    // 3. Bold: **text** or __text__
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>");

    // 4. Italic: *text* or _text_
    text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    text = text.replace(/_([^_]+)_/g, "<em>$1</em>");

    // 5. Inline Code: `code`
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

    return text;
}

/**
 * Converts a Markdown string into clean, sanitized HTML.
 */
export function markdownToHtml(markdown: string): string {
    if (!markdown) {
        return "";
    }

    const lines = markdown.split(/\r?\n/);
    let htmlResult = "";
    
    let inList = false;
    let listType: "ul" | "ol" | null = null;
    let inBlockquote = false;
    let inCodeBlock = false;
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableAlignment: string[] = []; // left, center, right

    // Helper to close any active blocks before starting a different block
    const closeActiveBlocks = (except: "ul" | "ol" | "blockquote" | "code" | "table" | null) => {
        if (inList && listType !== except) {
            htmlResult += listType === "ul" ? "</ul>\n" : "</ol>\n";
            inList = false;
            listType = null;
        }
        if (inBlockquote && except !== "blockquote") {
            htmlResult += "</blockquote>\n";
            inBlockquote = false;
        }
        if (inCodeBlock && except !== "code") {
            htmlResult += "</code></pre>\n";
            inCodeBlock = false;
        }
        if (inTable && except !== "table") {
            htmlResult += "</tbody></table>\n";
            inTable = false;
            tableHeaders = [];
            tableAlignment = [];
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // 1. Code Blocks (```)
        if (trimmed.startsWith("```")) {
            if (inCodeBlock) {
                closeActiveBlocks(null);
            } else {
                closeActiveBlocks("code");
                inCodeBlock = true;
                htmlResult += "<pre><code>";
            }
            continue;
        }

        if (inCodeBlock) {
            // Escape HTML characters inside code blocks
            const escapedLine = line
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            htmlResult += escapedLine + "\n";
            continue;
        }

        // 2. Empty Lines
        if (trimmed === "") {
            closeActiveBlocks(null);
            continue;
        }

        // 3. Blockquotes (>)
        if (trimmed.startsWith(">")) {
            closeActiveBlocks("blockquote");
            if (!inBlockquote) {
                htmlResult += "<blockquote>\n";
                inBlockquote = true;
            }
            const content = trimmed.substring(1).trim();
            htmlResult += "<p>" + parseInlineMarkdown(content) + "</p>\n";
            continue;
        }

        // 4. Headings (#)
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            closeActiveBlocks(null);
            const level = headingMatch[1].length;
            const content = headingMatch[2];
            htmlResult += `<h${level}>${parseInlineMarkdown(content)}</h${level}>\n`;
            continue;
        }

        // 5. Unordered Lists (- or * or +)
        const ulMatch = trimmed.match(/^([*\-+])\s+(.*)$/);
        if (ulMatch) {
            closeActiveBlocks("ul");
            if (!inList || listType !== "ul") {
                htmlResult += "<ul>\n";
                inList = true;
                listType = "ul";
            }
            const content = ulMatch[2];
            htmlResult += `<li>${parseInlineMarkdown(content)}</li>\n`;
            continue;
        }

        // 6. Ordered Lists (1.)
        const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (olMatch) {
            closeActiveBlocks("ol");
            if (!inList || listType !== "ol") {
                htmlResult += "<ol>\n";
                inList = true;
                listType = "ol";
            }
            const content = olMatch[2];
            htmlResult += `<li>${parseInlineMarkdown(content)}</li>\n`;
            continue;
        }

        // 7. Tables (| cell | cell |)
        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
            // Check if it's a separator line: |---|---| or |:---|---:|
            const isSeparator = trimmed.split("|").slice(1, -1).every(cell => {
                const c = cell.trim();
                return c.startsWith(":") || c.endsWith(":") || c.split("").every(char => char === "-" || char === ":");
            }) && trimmed.replace(/[\s:|]/g, "").replace(/\-/g, "") === ""; // must only contain spaces, colons, hyphens and pipes

            if (isSeparator) {
                // If it is a separator, we parse the alignments
                if (inTable && tableHeaders.length > 0) {
                    const cells = trimmed.split("|").slice(1, -1);
                    tableAlignment = cells.map(cell => {
                        const c = cell.trim();
                        if (c.startsWith(":") && c.endsWith(":")) return "center";
                        if (c.endsWith(":")) return "right";
                        return "left";
                    });
                }
                continue;
            }

            // Parse cell contents
            const cells = trimmed.split("|").slice(1, -1).map(c => c.trim());

            if (!inTable) {
                closeActiveBlocks("table");
                // Check if next line is a separator line (to verify it's a real table)
                let nextIsSeparator = false;
                if (i + 1 < lines.length) {
                    const nextTrimmed = lines[i + 1].trim();
                    if (nextTrimmed.startsWith("|") && nextTrimmed.endsWith("|")) {
                        nextIsSeparator = nextTrimmed.split("|").slice(1, -1).every(cell => {
                            const c = cell.trim();
                            return c.replace(/[\s:\-]/g, "") === "";
                        });
                    }
                }

                if (nextIsSeparator) {
                    inTable = true;
                    tableHeaders = cells;
                    htmlResult += "<table class=\"markdown-table\">\n<thead>\n<tr>\n";
                    cells.forEach(header => {
                        htmlResult += `<th>${parseInlineMarkdown(header)}</th>\n`;
                    });
                    htmlResult += "</tr>\n</thead>\n<tbody>\n";
                    continue;
                }
            } else {
                // We are inside a table body
                htmlResult += "<tr>\n";
                cells.forEach((cell, index) => {
                    const align = tableAlignment[index] || "left";
                    const style = align !== "left" ? ` style="text-align: ${align};"` : "";
                    htmlResult += `<td${style}>${parseInlineMarkdown(cell)}</td>\n`;
                });
                // Fill in missing cells if row is shorter than headers
                if (cells.length < tableHeaders.length) {
                    for (let j = cells.length; j < tableHeaders.length; j++) {
                        const align = tableAlignment[j] || "left";
                        const style = align !== "left" ? ` style="text-align: ${align};"` : "";
                        htmlResult += `<td${style}></td>\n`;
                    }
                }
                htmlResult += "</tr>\n";
                continue;
            }
        }

        // 8. Paragraphs / Standard Text
        closeActiveBlocks(null);
        htmlResult += `<p>${parseInlineMarkdown(trimmed)}</p>\n`;
    }

    // Close any remaining active blocks
    closeActiveBlocks(null);

    // Apply sanitization to block any malicious scripts/tags
    return sanitizeHtml(htmlResult);
}

/**
 * Strips Markdown formatting from a string to return clean plain text (useful for native tooltips).
 */
export function stripMarkdown(markdown: string): string {
    if (!markdown) return "";
    let text = markdown;
    
    // Replace headings: # title -> title
    text = text.replace(/^#{1,6}\s+(.*)$/gm, "$1");
    // Replace images: ![alt](url) -> alt
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1");
    // Replace links: [text](url) -> text
    text = text.replace(/\[([^\]]*)\]\(([^)]+)\)/g, "$1");
    // Replace bold/italic
    text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
    text = text.replace(/__([^_]+)__/g, "$1");
    text = text.replace(/\*([^*]+)\*/g, "$1");
    text = text.replace(/_([^_]+)_/g, "$1");
    // Replace inline code
    text = text.replace(/`([^`]+)`/g, "$1");
    // Clean table characters
    text = text.replace(/^[|:\-\s]+$/gm, ""); // separator lines
    text = text.replace(/\|/g, " "); // remove pipes
    
    // Clean multiple line breaks
    text = text.replace(/\n{3,}/g, "\n\n");
    
    return text.trim();
}

