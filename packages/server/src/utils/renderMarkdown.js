"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MarkdownIt = require("markdown-it");
function default_1(md) {
    const markdownIt = new MarkdownIt({
        linkify: true,
    });
    return markdownIt.render(md);
}
exports.default = default_1;
//# sourceMappingURL=renderMarkdown.js.map