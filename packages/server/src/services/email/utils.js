"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markdownBodyToHtml = exports.markdownBodyToPlainText = void 0;
const MarkdownIt = require("markdown-it");
function markdownBodyToPlainText(md) {
    // Just convert the links to plain URLs
    return md.replace(/\[.*\]\((.*)\)/g, '$1');
}
exports.markdownBodyToPlainText = markdownBodyToPlainText;
// TODO: replace with renderMarkdown()
function markdownBodyToHtml(md) {
    const markdownIt = new MarkdownIt({
        linkify: true,
    });
    return markdownIt.render(md);
}
exports.markdownBodyToHtml = markdownBodyToHtml;
//# sourceMappingURL=utils.js.map