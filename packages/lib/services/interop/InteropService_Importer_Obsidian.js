"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const InteropService_Importer_Md_frontmatter_1 = __importDefault(require("./InteropService_Importer_Md_frontmatter"));
const Tag_1 = __importDefault(require("../../models/Tag"));
const Note_1 = __importDefault(require("../../models/Note"));
const markdownUtils_1 = __importDefault(require("../../markdownUtils"));
const mime_utils_1 = require("../../mime-utils");
const path_utils_1 = require("../../path-utils");
const shim_1 = __importDefault(require("../../shim"));
const string_utils_1 = require("../../string-utils");
const yaml = __importStar(require("js-yaml"));
const path_1 = require("path");
const html_1 = require("@joplin/utils/html");
const markdown_it_1 = __importDefault(require("markdown-it"));
const uslug_1 = __importDefault(require("@joplin/fork-uslug/lib/uslug"));
const tagRegex = /(?:^|\s)#((?:[\p{L}\p{M}\p{N}\p{So}_/-]|\u200D|\p{Emoji_Modifier})+)/gu;
const numberOnlyTagRegex = /^\p{N}+$/u;
const normalizedTag = (tag) => tag.toLowerCase();
// Obsidian resolves internal links case-insensitively, so index and look up wikilink targets in lower case.
const normalizedWikilinkTarget = (target) => target.toLowerCase();
const wikilinkRegex = /(?<![!\\])(!?)\[\[([^|\r\n]+?)(?:\|([^\r\n]+?))?\]\]/g;
const imageDimensionRegex = /^\d+(?:x\d+)?$/;
const joplinItemIdRegex = /^[0-9a-f]{32}$/i;
const markdownLinkTargetRegex = /\[([^\]\r\n]+)\]\(([^)\r\n]+)\)/g;
const inlineCodeRegex = /(`+)[^\r\n]*?\1/g;
const withoutMarkdownExtension = (path) => path.replace(/\.md$/i, '');
const ignoredFolderNames = new Set(['.obsidian', '.trash']);
const markdownIt = new markdown_it_1.default('commonmark', { html: false });
const readFrontMatter = (text) => {
    const lines = text.split(/\r?\n/);
    if (lines[0] !== '---')
        return '';
    const end = lines.findIndex((line, index) => index > 0 && line.startsWith('---'));
    return end < 0 ? '' : lines.slice(1, end).join('\n');
};
const replaceMarkdownNoteLinks = (text, replace) => {
    let output = '';
    let previousEnd = 0;
    const labelStarts = [];
    for (let labelEnd = 0; labelEnd < text.length; labelEnd++) {
        // Find one Markdown link and where it end.
        if (text[labelEnd] === '[')
            labelStarts.push(labelEnd);
        if (text[labelEnd] !== ']')
            continue;
        const linkStart = labelStarts.pop();
        if (text[labelEnd + 1] !== '(')
            continue;
        if (linkStart === undefined)
            continue;
        if (linkStart < previousEnd)
            continue;
        if (text[linkStart - 1] === '!')
            continue;
        const linkEnd = text.indexOf(')', labelEnd + 2);
        if (linkEnd < 0)
            continue;
        // Read link label and target. Skip invalid link.
        const label = text.slice(linkStart + 1, labelEnd);
        const fullTarget = text.slice(labelEnd + 2, linkEnd);
        const hasLineBreak = label.includes('\r') || label.includes('\n') || fullTarget.includes('\r') || fullTarget.includes('\n');
        if (!label || hasLineBreak)
            continue;
        // Separate optional #heading from note link.
        const fragmentStart = fullTarget.indexOf('#');
        const target = fragmentStart < 0 ? fullTarget : fullTarget.slice(0, fragmentStart);
        const fragment = fragmentStart < 0 ? '' : fullTarget.slice(fragmentStart);
        if (target.length <= '.md'.length || !target.toLowerCase().endsWith('.md') || fragment === '#')
            continue;
        // Add changed link. Then search after this link.
        output += text.slice(previousEnd, linkStart);
        output += replace(text.slice(linkStart, linkEnd + 1), label, target, fragment);
        previousEnd = linkEnd + 1;
        labelEnd = linkEnd;
    }
    return output + text.slice(previousEnd);
};
const replaceJoplinInternalLinkAnchors = (text, resourceIds) => text.replace(markdownLinkTargetRegex, (link, label, target) => {
    const anchorStart = target.indexOf('#');
    if (!target.startsWith(':/') || anchorStart < 0)
        return link;
    const itemId = target.slice(2, anchorStart);
    const anchor = target.slice(anchorStart + 1);
    if (!joplinItemIdRegex.test(itemId) || !anchor)
        return link;
    if (resourceIds.includes(itemId))
        return link;
    return `[${label}](:/${itemId}#${(0, uslug_1.default)(anchor)})`;
});
const replaceOutsideInlineCode = (body, replace) => {
    let output = '';
    let previousEnd = 0;
    for (const code of body.matchAll(inlineCodeRegex)) {
        output += replace(body.slice(previousEnd, code.index));
        output += code[0];
        previousEnd = code.index + code[0].length;
    }
    return output + replace(body.slice(previousEnd));
};
const replaceOutsideCode = (body, replace) => {
    const lines = body.split('\n');
    const result = [];
    let previousEnd = 0;
    for (const token of markdownIt.parse(body, {})) {
        // Only process normal text so code blocks stay unchanged
        if (token.type !== 'inline' || !token.map)
            continue;
        const [start, end] = token.map;
        result.push(...lines.slice(previousEnd, start));
        result.push(...replaceOutsideInlineCode(lines.slice(start, end).join('\n'), replace).split('\n'));
        previousEnd = end;
    }
    result.push(...lines.slice(previousEnd));
    return result.join('\n');
};
const addToIndex = (index, key, noteId) => {
    const noteIds = index.get(key) || [];
    noteIds.push(noteId);
    index.set(key, noteIds);
};
const findFilePath = (filePaths, target) => {
    const matchingPaths = filePaths.filter(path => path === target || path.endsWith(`/${target}`));
    return matchingPaths.length === 1 ? matchingPaths[0] : '';
};
// Obsidian-specific import behaviour belongs in this class. This keeps it from
// changing the normal Markdown and Markdown + Front Matter importers.
class InteropService_Importer_Obsidian extends InteropService_Importer_Md_frontmatter_1.default {
    async isDirectoryEmpty(dirPath) {
        if (ignoredFolderNames.has((0, path_utils_1.basename)(dirPath)))
            return true;
        return super.isDirectoryEmpty(dirPath);
    }
    async exec(result) {
        await super.exec(result);
        await this.convertWikilinks();
        return result;
    }
    async buildNoteIdsByWikilinkTarget(vaultPathPrefix) {
        const noteIdsByWikilinkTarget = new Map();
        for (const [sourcePath, note] of Object.entries(this.importedNotes)) {
            const normalizedSourcePath = (0, path_utils_1.toForwardSlashes)(sourcePath);
            if (!normalizedSourcePath.startsWith(vaultPathPrefix))
                continue;
            const relativePath = withoutMarkdownExtension(normalizedSourcePath.slice(vaultPathPrefix.length));
            const pathParts = relativePath.split('/');
            for (let index = 0; index < pathParts.length; index++) {
                addToIndex(noteIdsByWikilinkTarget, normalizedWikilinkTarget(pathParts.slice(index).join('/')), note.id);
            }
        }
        return noteIdsByWikilinkTarget;
    }
    async convertWikilinks() {
        const vaultPath = (0, path_utils_1.toForwardSlashes)(shim_1.default.fsDriver().resolve(this.sourcePath_));
        const vaultPathPrefix = `${vaultPath}/`;
        const noteIdsByWikilinkTarget = await this.buildNoteIdsByWikilinkTarget(vaultPathPrefix);
        for (const [sourcePath, note] of Object.entries(this.importedNotes)) {
            if (!(0, path_utils_1.toForwardSlashes)(sourcePath).startsWith(vaultPathPrefix))
                continue;
            let body = replaceOutsideCode(note.body, text => text.replace(wikilinkRegex, (wikilink, _embed, target, shownName) => {
                const [noteTarget, ...headings] = target.split('#');
                const heading = headings[headings.length - 1];
                if (heading === null || heading === void 0 ? void 0 : heading.startsWith('^'))
                    return wikilink;
                const normalizedTarget = normalizedWikilinkTarget(withoutMarkdownExtension(noteTarget));
                const matchingNoteIds = noteTarget ? noteIdsByWikilinkTarget.get(normalizedTarget) : [note.id];
                if ((matchingNoteIds === null || matchingNoteIds === void 0 ? void 0 : matchingNoteIds.length) !== 1)
                    return wikilink;
                const label = markdownUtils_1.default.escapeTitleText(shownName || target);
                const anchor = heading ? `#${(0, uslug_1.default)(heading)}` : '';
                return `[${label}](:/${matchingNoteIds[0]}${anchor})`;
            }));
            // Obsidian can find the linked note in another folder when no other note has the same name.
            body = replaceOutsideCode(body, text => replaceMarkdownNoteLinks(text, (markdownLink, label, target, fragment) => {
                const normalizedTarget = normalizedWikilinkTarget(withoutMarkdownExtension(markdownUtils_1.default.unescapeLinkUrl(target)));
                const matchingNoteIds = noteIdsByWikilinkTarget.get(normalizedTarget);
                return (matchingNoteIds === null || matchingNoteIds === void 0 ? void 0 : matchingNoteIds.length) === 1 ? `[${label}](:/${matchingNoteIds[0]}${fragment})` : markdownLink;
            }));
            // Make link anchors match the way Joplin writes heading links.
            const resourceIds = await Note_1.default.linkedResourceIds(body);
            body = replaceOutsideCode(body, text => replaceJoplinInternalLinkAnchors(text, resourceIds));
            if (body === note.body)
                continue;
            this.importedNotes[sourcePath] = await Note_1.default.save(Object.assign(Object.assign({}, note), { body }), { isNew: false, autoTimestamp: false });
        }
    }
    async loadVaultFilePaths() {
        const vaultItems = await shim_1.default.fsDriver().readDirStats(this.sourcePath_, { recursive: true });
        const vaultFiles = vaultItems.filter(item => !item.isDirectory());
        const filePaths = vaultFiles.map(file => (0, path_utils_1.toForwardSlashes)(file.path));
        return filePaths.filter(filePath => {
            const topFolderName = filePath.split('/')[0];
            return !ignoredFolderNames.has(topFolderName);
        });
    }
    convertSizedImageEmbed(target, shownName, attachmentPath) {
        if (!shownName || !imageDimensionRegex.test(shownName))
            return null;
        const [width, height] = shownName.split('x');
        const escapedAttachmentPath = markdownUtils_1.default.escapeLinkUrl(encodeURI(attachmentPath));
        return `<img src="${escapedAttachmentPath}" width="${(0, html_1.htmlentities)(width)}"${height ? ` height="${(0, html_1.htmlentities)(height)}"` : ''} alt="${(0, html_1.htmlentities)(target)}"/>`;
    }
    async importLocalFiles(filePath, body, parentFolderId) {
        if (!this.vaultFilePaths_) {
            this.vaultFilePaths_ = await this.loadVaultFilePaths();
        }
        const markdownBody = replaceOutsideCode(body, text => text.replace(wikilinkRegex, (wikilink, embed, target, shownName) => {
            var _a;
            // Convert [[guide.pdf]], but leave [[Note]] and [[Note.md]] for convertWikilinks().
            if (!/\.[^/]+$/.test(target) || /\.md$/i.test(target))
                return wikilink;
            // Change [[guide.pdf|Open guide]] to [Open guide](guide.pdf).
            const imagePrefix = embed && ((_a = (0, mime_utils_1.fromFilename)(target)) === null || _a === void 0 ? void 0 : _a.startsWith('image/')) ? '!' : '';
            const foundPath = findFilePath(this.vaultFilePaths_, target);
            const absolutePath = foundPath ? shim_1.default.fsDriver().resolve(this.sourcePath_, foundPath) : '';
            const attachmentPath = absolutePath ? (0, path_1.relative)((0, path_utils_1.dirname)(filePath), absolutePath) : target;
            const sizedImageEmbed = imagePrefix && this.convertSizedImageEmbed(target, shownName, attachmentPath);
            if (sizedImageEmbed)
                return sizedImageEmbed;
            return `${imagePrefix}[${markdownUtils_1.default.escapeTitleText(shownName || target)}](${markdownUtils_1.default.escapeLinkUrl(attachmentPath)})`;
        }));
        return super.importLocalFiles(filePath, markdownBody, parentFolderId);
    }
    async handleCssClasses(filePath, note) {
        var _a;
        const frontMatter = readFrontMatter((0, string_utils_1.stripBom)(await shim_1.default.fsDriver().readFile(filePath)));
        const { cssclasses = [] } = (_a = yaml.load(frontMatter, { schema: yaml.FAILSAFE_SCHEMA })) !== null && _a !== void 0 ? _a : {};
        if (!cssclasses.length)
            return note;
        note.body = `---\n${yaml.dump({ cssclasses }, { schema: yaml.FAILSAFE_SCHEMA }).trimEnd()}\n---\n\n${note.body}`;
        await Note_1.default.save(note, { isNew: false, autoTimestamp: false });
        return note;
    }
    async importFile(filePath, parentFolderId) {
        const note = await super.importFile(filePath, parentFolderId);
        const existingTags = await Tag_1.default.tagsByNoteId(note.id);
        const existingTagNames = new Set(existingTags.map(tag => normalizedTag(tag.title)));
        const bodyTags = [];
        replaceOutsideCode(note.body, text => {
            for (const [, tag] of text.matchAll(tagRegex))
                bodyTags.push(tag);
            return text;
        });
        for (const tag of bodyTags) {
            if (numberOnlyTagRegex.test(tag))
                continue;
            const key = normalizedTag(tag);
            if (existingTagNames.has(key))
                continue;
            await Tag_1.default.addNoteTagByTitle(note.id, tag);
            existingTagNames.add(key);
        }
        return this.handleCssClasses(filePath, note);
    }
}
exports.default = InteropService_Importer_Obsidian;
//# sourceMappingURL=InteropService_Importer_Obsidian.js.map