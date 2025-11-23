"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownTableJustify = void 0;
const renderer_1 = require("@joplin/renderer");
const stringPadding = require('string-padding');
const urlUtils = require('./urlUtils');
const MarkdownIt = require('markdown-it');
// Taken from codemirror/addon/edit/continuelist.js
const listRegex = /^(\s*)([*+-] \[[x ]\]\s|[*+-]\s|(\d+)([.)]\s))(\s*)/;
const emptyListRegex = /^(\s*)([*+-] \[[x ]\]|[*+-]|(\d+)[.)])(\s+)$/;
var MarkdownTableJustify;
(function (MarkdownTableJustify) {
    MarkdownTableJustify["Left"] = "left";
    MarkdownTableJustify["Center"] = "center";
    MarkdownTableJustify["Right"] = "right,";
})(MarkdownTableJustify || (exports.MarkdownTableJustify = MarkdownTableJustify = {}));
const markdownUtils = {
    // Titles for markdown links only need escaping for [ and ]
    escapeTitleText(text) {
        return text.replace(/(\[|\])/g, '\\$1');
    },
    escapeLinkUrl(url) {
        url = url.replace(/\(/g, '%28');
        url = url.replace(/\)/g, '%29');
        url = url.replace(/ /g, '%20');
        return url;
    },
    escapeTableCell(text, escapeHtml = true) {
        // Disable HTML code
        if (escapeHtml) {
            text = text.replace(/</g, '&lt;');
            text = text.replace(/>/g, '&gt;');
        }
        // Table cells can't contain new lines so replace with <br/>
        text = text.replace(/\n/g, '<br/>');
        // "|" is a reserved characters that should be escaped
        text = text.replace(/\|/g, '\\|');
        return text;
    },
    escapeInlineCode(text) {
        // https://github.com/github/markup/issues/363#issuecomment-55499909
        return text.replace(/`/g, '``');
    },
    unescapeLinkUrl(url) {
        url = url.replace(/%28/g, '(');
        url = url.replace(/%29/g, ')');
        url = url.replace(/%20/g, ' ');
        return url;
    },
    prependBaseUrl(md, baseUrl) {
        // eslint-disable-next-line no-useless-escape, @typescript-eslint/no-explicit-any -- Old code before rule was applied
        return md.replace(/(\]\()([^\s\)]+)(.*?\))/g, (_match, before, url, after) => {
            return before + urlUtils.prependBaseUrl(url, baseUrl) + after;
        });
    },
    // Returns the **encoded** URLs, so to be useful they should be decoded again before use.
    extractFileUrls(md, onlyType = null) {
        const markdownIt = new MarkdownIt();
        markdownIt.validateLink = renderer_1.validateLinks; // Necessary to support file:/// links
        const env = {};
        const tokens = markdownIt.parse(md, env);
        const output = [];
        let linkType = onlyType;
        if (linkType === 'pdf')
            linkType = 'link_open';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const searchUrls = (tokens) => {
            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                if ((!onlyType && (token.type === 'link_open' || token.type === 'image')) || (!!onlyType && token.type === onlyType) || (onlyType === 'pdf' && token.type === 'link_open')) {
                    // Pdf embeds are a special case, they are represented as 'link_open' tokens but are marked with 'embedded_pdf' as link name by the parser
                    // We are making sure if its in the proper pdf link format, only then we add it to the list
                    if (onlyType === 'pdf' && !(tokens.length > i + 1 && tokens[i + 1].type === 'text' && tokens[i + 1].content === 'embedded_pdf'))
                        continue;
                    for (let j = 0; j < token.attrs.length; j++) {
                        const a = token.attrs[j];
                        if ((a[0] === 'src' || a[0] === 'href') && a.length >= 2 && a[1]) {
                            output.push(a[1]);
                        }
                    }
                }
                if (token.children && token.children.length) {
                    searchUrls(token.children);
                }
            }
        };
        searchUrls(tokens);
        return output;
    },
    replaceResourceUrl(md, urlToReplace, id) {
        const linkRegex = `(?<=\\]\\()\\<?${urlToReplace}\\>?(?=.*\\))`;
        const reg = new RegExp(linkRegex, 'g');
        return md.replace(reg, `:/${id}`);
    },
    extractImageUrls(md) {
        return markdownUtils.extractFileUrls(md, 'image');
    },
    extractPdfUrls(md) {
        return markdownUtils.extractFileUrls(md, 'pdf');
    },
    // The match results has 5 items
    // Full match array is
    // [Full match, whitespace, list token, ol line number, whitespace following token]
    olLineNumber(line) {
        const match = line.match(listRegex);
        return match ? Number(match[3]) : 0;
    },
    extractListToken(line) {
        const match = line.match(listRegex);
        return match ? match[2] : '';
    },
    isListItem(line) {
        return listRegex.test(line);
    },
    isEmptyListItem(line) {
        return emptyListRegex.test(line);
    },
    createMarkdownTable(headers, rows) {
        const output = [];
        const minCellWidth = 5;
        const headersMd = [];
        const lineMd = [];
        for (let i = 0; i < headers.length; i++) {
            const h = headers[i];
            let label = h.label;
            if (h.labelUrl) {
                label = `[${h.label}](${h.labelUrl})`;
            }
            headersMd.push(stringPadding(label, minCellWidth, ' ', stringPadding.RIGHT));
            const justify = h.justify ? h.justify : MarkdownTableJustify.Left;
            if (justify === MarkdownTableJustify.Left) {
                lineMd.push('-----');
            }
            else if (justify === MarkdownTableJustify.Center) {
                lineMd.push(':---:');
            }
            else {
                lineMd.push('----:');
            }
        }
        output.push(`| ${headersMd.join(' | ')} |`);
        output.push(`| ${lineMd.join(' | ')} |`);
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowMd = [];
            for (let j = 0; j < headers.length; j++) {
                const h = headers[j];
                const value = (h.filter ? h.filter(row[h.name]) : row[h.name]) || '';
                const valueMd = h.disableEscape ? value : markdownUtils.escapeTableCell(value, !h.disableHtmlEscape);
                rowMd.push(stringPadding(valueMd, minCellWidth, ' ', stringPadding.RIGHT));
            }
            output.push(`| ${rowMd.join(' | ')} |`);
        }
        return output.join('\n');
    },
    countTableColumns(line) {
        if (!line)
            return 0;
        const trimmed = line.trim();
        let pipes = (line.match(/\|/g) || []).length;
        if (trimmed[0] === '|') {
            pipes -= 1;
        }
        if (trimmed[trimmed.length - 1] === '|') {
            pipes -= 1;
        }
        return pipes + 1;
    },
    matchingTableDivider(header, divider) {
        if (!header || !divider)
            return false;
        const invalidChars = divider.match(/[^\s\-:|]/g);
        if (invalidChars) {
            return false;
        }
        const columns = markdownUtils.countTableColumns(header);
        const cols = markdownUtils.countTableColumns(divider);
        return cols > 0 && (cols >= columns);
    },
    titleFromBody(body) {
        if (!body)
            return '';
        const spaceEntities = /&nbsp;/g;
        body = body.replace(spaceEntities, ' ');
        const lines = body.trim().split('\n');
        const title = lines[0].trim();
        const mdLinkRegex = /!?\[([^\]]+?)\]\(.+?\)/g;
        const emptyMdLinkRegex = /!?\[\]\((.+?)\)/g;
        const filterRegex = /^[# \n\t*`-]*/;
        return title
            .replace(filterRegex, '')
            .replace(mdLinkRegex, '$1')
            .replace(emptyMdLinkRegex, '$1')
            .substring(0, 80);
    },
};
exports.default = markdownUtils;
