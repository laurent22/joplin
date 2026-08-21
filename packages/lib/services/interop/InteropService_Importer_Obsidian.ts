import InteropService_Importer_Md_frontmatter from './InteropService_Importer_Md_frontmatter';
import { ImportExportResult } from './types';
import Tag from '../../models/Tag';
import Note from '../../models/Note';
import markdownUtils from '../../markdownUtils';
import { fromFilename } from '../../mime-utils';
import { basename, dirname, toForwardSlashes } from '../../path-utils';
import shim from '../../shim';
import { stripBom } from '../../string-utils';
import * as yaml from 'js-yaml';
import { NoteEntity } from '../database/types';
import { relative } from 'path';
import { htmlentities } from '@joplin/utils/html';
import MarkdownIt from 'markdown-it';

const uslug = require('@joplin/fork-uslug');
const tagRegex = /(?:^|\s)#([\p{L}\p{M}\p{N}\p{Pc}\p{Pd}\p{S}\u200D/]+)/gu;
const normalizedTag = (tag: string) => tag.toLowerCase();
// Obsidian resolves internal links case-insensitively, so index and look up wikilink targets in lower case.
const normalizedWikilinkTarget = (target: string) => target.toLowerCase();
const wikilinkRegex = /(?<![!\\])(!?)\[\[([^|\r\n]+?)(?:\|([^\r\n]+?))?\]\]/g;
const imageDimensionRegex = /^\d+(?:x\d+)?$/;
const joplinItemIdRegex = /^[0-9a-f]{32}$/i;
const markdownLinkTargetRegex = /\[([^\]\r\n]+)\]\(([^)\r\n]+)\)/g;
const inlineCodeRegex = /(`+)[^\r\n]*?\1/g;
const withoutMarkdownExtension = (path: string) => path.replace(/\.md$/i, '');
const ignoredFolderNames = new Set(['.obsidian', '.trash']);
const markdownIt = new MarkdownIt('commonmark', { html: false });

const readFrontMatter = (text: string) => {
	const lines = text.split(/\r?\n/);
	if (lines[0] !== '---') return '';

	const end = lines.indexOf('---', 1);
	return end < 0 ? '' : lines.slice(1, end).join('\n');
};

const replaceMarkdownNoteLinks = (text: string, replace: (link: string, label: string, target: string, fragment: string)=> string) => {
	let output = '';
	let previousEnd = 0;

	for (let linkStart = 0; linkStart < text.length; linkStart++) {
		// Find one Markdown link and where it end.
		if (text[linkStart] !== '[' || text[linkStart - 1] === '!') continue;
		const labelEnd = text.indexOf('](', linkStart + 1);
		if (labelEnd < 0) continue;
		const linkEnd = text.indexOf(')', labelEnd + 2);
		if (linkEnd < 0) continue;

		// Read link label and target. Skip invalid link.
		const label = text.slice(linkStart + 1, labelEnd);
		const fullTarget = text.slice(labelEnd + 2, linkEnd);
		const hasLineBreak = label.includes('\r') || label.includes('\n') || fullTarget.includes('\r') || fullTarget.includes('\n');
		if (!label || label.includes(']') || hasLineBreak) continue;

		// Separate optional #heading from note link.
		const fragmentStart = fullTarget.indexOf('#');
		const target = fragmentStart < 0 ? fullTarget : fullTarget.slice(0, fragmentStart);
		const fragment = fragmentStart < 0 ? '' : fullTarget.slice(fragmentStart);
		if (target.length <= '.md'.length || !target.toLowerCase().endsWith('.md') || fragment === '#') continue;

		// Add changed link. Then search after this link.
		output += text.slice(previousEnd, linkStart);
		output += replace(text.slice(linkStart, linkEnd + 1), label, target, fragment);
		previousEnd = linkEnd + 1;
		linkStart = linkEnd;
	}

	return output + text.slice(previousEnd);
};

const replaceJoplinInternalLinkAnchors = (text: string) => text.replace(markdownLinkTargetRegex, (link, label: string, target: string) => {
	const anchorStart = target.indexOf('#');
	if (!target.startsWith(':/') || anchorStart < 0) return link;

	const itemId = target.slice(2, anchorStart);
	const anchor = target.slice(anchorStart + 1);
	if (!joplinItemIdRegex.test(itemId) || !anchor) return link;

	return `[${label}](:/${itemId}#${uslug(anchor)})`;
});

const replaceOutsideInlineCode = (body: string, replace: (text: string)=> string) => {
	let output = '';
	let previousEnd = 0;
	for (const code of body.matchAll(inlineCodeRegex)) {
		output += replace(body.slice(previousEnd, code.index));
		output += code[0];
		previousEnd = code.index + code[0].length;
	}
	return output + replace(body.slice(previousEnd));
};

const replaceOutsideCode = (body: string, replace: (text: string)=> string) => {
	const lines = body.split('\n');
	for (const token of markdownIt.parse(body, {})) {
		if (token.type !== 'inline' || !token.map) continue;
		const [start, end] = token.map;
		const replacedLines = replaceOutsideInlineCode(lines.slice(start, end).join('\n'), replace).split('\n');
		lines.splice(start, end - start, ...replacedLines);
	}
	return lines.join('\n');
};

const addToIndex = (index: Map<string, string[]>, key: string, noteId: string) => {
	const noteIds = index.get(key) || [];
	noteIds.push(noteId);
	index.set(key, noteIds);
};

const findFilePath = (filePaths: string[], target: string) => {
	const matchingPaths = filePaths.filter(path => path === target || path.endsWith(`/${target}`));
	return matchingPaths.length === 1 ? matchingPaths[0] : '';
};

// Obsidian-specific import behaviour belongs in this class. This keeps it from
// changing the normal Markdown and Markdown + Front Matter importers.
export default class InteropService_Importer_Obsidian extends InteropService_Importer_Md_frontmatter {
	private vaultFilePaths_: string[];

	protected async isDirectoryEmpty(dirPath: string) {
		if (ignoredFolderNames.has(basename(dirPath))) return true;
		return super.isDirectoryEmpty(dirPath);
	}

	public async exec(result: ImportExportResult) {
		await super.exec(result);
		await this.convertWikilinks();
		return result;
	}

	private async buildNoteIdsByWikilinkTarget(vaultPathPrefix: string) {
		const noteIdsByWikilinkTarget = new Map<string, string[]>();

		for (const [sourcePath, note] of Object.entries(this.importedNotes)) {
			const normalizedSourcePath = toForwardSlashes(sourcePath);
			if (!normalizedSourcePath.startsWith(vaultPathPrefix)) continue;

			const relativePath = withoutMarkdownExtension(normalizedSourcePath.slice(vaultPathPrefix.length));
			const pathParts = relativePath.split('/');
			for (let index = 0; index < pathParts.length; index++) {
				addToIndex(noteIdsByWikilinkTarget, normalizedWikilinkTarget(pathParts.slice(index).join('/')), note.id);
			}
		}

		return noteIdsByWikilinkTarget;
	}

	private async convertWikilinks() {
		const vaultPath = toForwardSlashes(shim.fsDriver().resolve(this.sourcePath_));
		const vaultPathPrefix = `${vaultPath}/`;
		const noteIdsByWikilinkTarget = await this.buildNoteIdsByWikilinkTarget(vaultPathPrefix);

		for (const [sourcePath, note] of Object.entries(this.importedNotes)) {
			if (!toForwardSlashes(sourcePath).startsWith(vaultPathPrefix)) continue;

			let body = replaceOutsideCode(note.body, text => text.replace(wikilinkRegex, (wikilink, _embed: string, target: string, shownName?: string) => {
				const [noteTarget, ...headings] = target.split('#');
				const heading = headings[headings.length - 1];
				if (heading?.startsWith('^')) return wikilink;

				const normalizedTarget = normalizedWikilinkTarget(withoutMarkdownExtension(noteTarget));
				const matchingNoteIds = noteTarget ? noteIdsByWikilinkTarget.get(normalizedTarget) : [note.id];
				if (matchingNoteIds?.length !== 1) return wikilink;

				const label = markdownUtils.escapeTitleText(shownName || target);
				const anchor = heading ? `#${uslug(heading)}` : '';
				return `[${label}](:/${matchingNoteIds[0]}${anchor})`;
			}));
			// Obsidian can find the linked note in another folder when no other note has the same name.
			body = replaceOutsideCode(body, text => replaceMarkdownNoteLinks(text, (markdownLink, label, target, fragment) => {
				const normalizedTarget = normalizedWikilinkTarget(withoutMarkdownExtension(markdownUtils.unescapeLinkUrl(target)));
				const matchingNoteIds = noteIdsByWikilinkTarget.get(normalizedTarget);
				return matchingNoteIds?.length === 1 ? `[${label}](:/${matchingNoteIds[0]}${fragment})` : markdownLink;
			}));
			// Make link anchors match the way Joplin writes heading links.
			body = replaceOutsideCode(body, replaceJoplinInternalLinkAnchors);

			if (body === note.body) continue;
			this.importedNotes[sourcePath] = await Note.save({ ...note, body }, { isNew: false, autoTimestamp: false });
		}
	}

	private async loadVaultFilePaths() {
		const vaultItems = await shim.fsDriver().readDirStats(this.sourcePath_, { recursive: true });
		const vaultFiles = vaultItems.filter(item => !item.isDirectory());
		const filePaths = vaultFiles.map(file => toForwardSlashes(file.path));

		return filePaths.filter(filePath => {
			const topFolderName = filePath.split('/')[0];
			return !ignoredFolderNames.has(topFolderName);
		});
	}

	private convertSizedImageEmbed(target: string, shownName: string | undefined, attachmentPath: string) {
		if (!shownName || !imageDimensionRegex.test(shownName)) return null;
		const [width, height] = shownName.split('x');
		return `<img src="${markdownUtils.escapeLinkUrl(attachmentPath)}" width="${htmlentities(width)}"${height ? ` height="${htmlentities(height)}"` : ''} alt="${markdownUtils.escapeTitleText(target)}"/>`;
	}

	public async importLocalFiles(filePath: string, body: string, parentFolderId: string) {
		if (!this.vaultFilePaths_) {
			this.vaultFilePaths_ = await this.loadVaultFilePaths();
		}

		const markdownBody = replaceOutsideCode(body, text => text.replace(wikilinkRegex, (wikilink, embed: string, target: string, shownName?: string) => {
			// Convert [[guide.pdf]], but leave [[Note]] and [[Note.md]] for convertWikilinks().
			if (!/\.[^/]+$/.test(target) || /\.md$/i.test(target)) return wikilink;
			// Change [[guide.pdf|Open guide]] to [Open guide](guide.pdf).
			const imagePrefix = embed && fromFilename(target)?.startsWith('image/') ? '!' : '';
			const foundPath = findFilePath(this.vaultFilePaths_, target);
			const absolutePath = foundPath ? shim.fsDriver().resolve(this.sourcePath_, foundPath) : '';
			const attachmentPath = absolutePath ? relative(dirname(filePath), absolutePath) : target;
			const sizedImageEmbed = imagePrefix && this.convertSizedImageEmbed(target, shownName, attachmentPath);
			if (sizedImageEmbed) return sizedImageEmbed;
			return `${imagePrefix}[${markdownUtils.escapeTitleText(shownName || target)}](${markdownUtils.escapeLinkUrl(attachmentPath)})`;
		}));
		return super.importLocalFiles(filePath, markdownBody, parentFolderId);
	}

	private async handleCssClasses(filePath: string, note: NoteEntity) {
		const frontMatter = readFrontMatter(stripBom(await shim.fsDriver().readFile(filePath)));
		const { cssclasses = [] } = (yaml.load(frontMatter, { schema: yaml.FAILSAFE_SCHEMA }) as { cssclasses?: string[] }) ?? {};
		if (!cssclasses.length) return note;

		note.body = `---\n${yaml.dump({ cssclasses }, { schema: yaml.FAILSAFE_SCHEMA }).trimEnd()}\n---\n\n${note.body}`;
		await Note.save(note, { isNew: false, autoTimestamp: false });
		return note;
	}

	public async importFile(filePath: string, parentFolderId: string) {
		const note = await super.importFile(filePath, parentFolderId);
		const existingTags = await Tag.tagsByNoteId(note.id);
		const existingTagNames = new Set(existingTags.map(tag => normalizedTag(tag.title)));

		const bodyTags: string[] = [];
		replaceOutsideCode(note.body, text => {
			for (const [, tag] of text.matchAll(tagRegex)) bodyTags.push(tag);
			return text;
		});

		for (const tag of bodyTags) {
			// Obsidian does not allow tags containing only numbers, but tagRegex matches them.
			if (/^\p{N}+$/u.test(tag)) continue;

			const key = normalizedTag(tag);
			if (existingTagNames.has(key)) continue;

			await Tag.addNoteTagByTitle(note.id, tag);
			existingTagNames.add(key);
		}

		return this.handleCssClasses(filePath, note);
	}
}
