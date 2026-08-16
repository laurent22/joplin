import InteropService_Importer_Md_frontmatter from './InteropService_Importer_Md_frontmatter';
import { ImportExportResult } from './types';
import Tag from '../../models/Tag';
import Note from '../../models/Note';
import markdownUtils from '../../markdownUtils';
import { fromFilename } from '../../mime-utils';
import { basename, dirname, toForwardSlashes } from '../../path-utils';
import shim from '../../shim';
import * as yaml from 'js-yaml';
import { NoteEntity } from '../database/types';
import { relative } from 'path';

const uslug = require('@joplin/fork-uslug');
const tagRegex = /(?:^|\s)#([\p{L}\p{M}\p{N}\p{Pc}\p{Pd}\p{S}\u200D/]+)/gu;
const normalizedTag = (tag: string) => tag.toLowerCase();
const wikilinkRegex = /(?<![!\\])(!?)\[\[([^|\r\n]+?)(?:\|([^\r\n]+?))?\]\]/g;
const markdownLinkRegex = /(?<!!)\[([^\]\r\n]+)\]\(([^)\r\n]+\.md)\)/gi;
const internalLinkAnchorRegex = /(\[[^\]\r\n]+\]\(:\/[0-9a-f]{32})#([^)\r\n]+)\)/gi;
const codeRegex = /^ {0,3}(`{3,}|~{3,})[^\r\n]*(?:\r?\n|$)[\s\S]*?(?:^ {0,3}\1[ \t]*(?:\r?\n|$)|(?![\s\S]))|^(?: {4}|\t)[^\r\n]*(?:\r?\n|$)|(`+)[^\r\n]*?\2/gm;
const frontMatterRegex = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const withoutMarkdownExtension = (path: string) => path.replace(/\.md$/i, '');
const ignoredFolderNames = new Set(['.obsidian', '.trash']);

const replaceOutsideCode = (body: string, replace: (text: string)=> string) => {
	let output = '';
	let previousEnd = 0;
	for (const code of body.matchAll(codeRegex)) {
		output += replace(body.slice(previousEnd, code.index));
		output += code[0];
		previousEnd = code.index + code[0].length;
	}
	return output + replace(body.slice(previousEnd));
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

	private async supportAliases(sourcePath: string, noteId: string, noteIdsByWikilinkTarget: Map<string, string[]>) {
		const frontMatter = (await shim.fsDriver().readFile(sourcePath)).match(frontMatterRegex);
		if (!frontMatter) return;

		const { aliases = [] } = yaml.load(frontMatter[1], { schema: yaml.FAILSAFE_SCHEMA }) as { aliases?: string[] };
		for (const alias of aliases) if (!noteIdsByWikilinkTarget.get(alias)?.includes(noteId)) addToIndex(noteIdsByWikilinkTarget, alias, noteId);
	}

	private async buildNoteIdsByWikilinkTarget(vaultPathPrefix: string) {
		const noteIdsByWikilinkTarget = new Map<string, string[]>();

		for (const [sourcePath, note] of Object.entries(this.importedNotes)) {
			const normalizedSourcePath = toForwardSlashes(sourcePath);
			if (!normalizedSourcePath.startsWith(vaultPathPrefix)) continue;

			const relativePath = withoutMarkdownExtension(normalizedSourcePath.slice(vaultPathPrefix.length));
			const pathParts = relativePath.split('/');
			for (let index = 0; index < pathParts.length; index++) {
				addToIndex(noteIdsByWikilinkTarget, pathParts.slice(index).join('/'), note.id);
			}

			await this.supportAliases(sourcePath, note.id, noteIdsByWikilinkTarget);
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
				const normalizedTarget = withoutMarkdownExtension(noteTarget);
				const matchingNoteIds = noteIdsByWikilinkTarget.get(normalizedTarget);
				if (matchingNoteIds?.length !== 1) return wikilink;

				const label = markdownUtils.escapeTitleText(shownName || target);
				const anchor = heading ? `#${uslug(heading)}` : '';
				return `[${label}](:/${matchingNoteIds[0]}${anchor})`;
			}));
			// Obsidian can find the linked note in another folder when no other note has the same name.
			body = replaceOutsideCode(body, text => text.replace(markdownLinkRegex, (markdownLink, label: string, target: string) => {
				const normalizedTarget = withoutMarkdownExtension(markdownUtils.unescapeLinkUrl(target));
				const matchingNoteIds = noteIdsByWikilinkTarget.get(normalizedTarget);
				return matchingNoteIds?.length === 1 ? `[${label}](:/${matchingNoteIds[0]})` : markdownLink;
			}));
			// Make link anchors match the way Joplin writes heading links.
			body = replaceOutsideCode(body, text => text.replace(internalLinkAnchorRegex, (_link, linkStart: string, anchor: string) => `${linkStart}#${uslug(anchor)})`));

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
			return `${imagePrefix}[${markdownUtils.escapeTitleText(shownName || target)}](${markdownUtils.escapeLinkUrl(attachmentPath)})`;
		}));
		return super.importLocalFiles(filePath, markdownBody, parentFolderId);
	}

	private async handleCssClasses(filePath: string, note: NoteEntity) {
		const frontMatter = (await shim.fsDriver().readFile(filePath)).match(frontMatterRegex);
		const { cssclasses = [] } = frontMatter ? yaml.load(frontMatter[1], { schema: yaml.FAILSAFE_SCHEMA }) as { cssclasses?: string[] } : {};
		if (!cssclasses.length) return note;

		note.body = `---\n${yaml.dump({ cssclasses }, { schema: yaml.FAILSAFE_SCHEMA }).trimEnd()}\n---\n\n${note.body}`;
		await Note.save(note, { isNew: false, autoTimestamp: false });
		return note;
	}

	public async importFile(filePath: string, parentFolderId: string) {
		const note = await super.importFile(filePath, parentFolderId);
		const existingTags = await Tag.tagsByNoteId(note.id);
		const existingTagNames = new Set(existingTags.map(tag => normalizedTag(tag.title)));

		for (const [, tag] of note.body.replace(codeRegex, '').matchAll(tagRegex)) {
			if (/^\p{N}+$/u.test(tag)) continue;

			const key = normalizedTag(tag);
			if (existingTagNames.has(key)) continue;

			await Tag.addNoteTagByTitle(note.id, tag);
			existingTagNames.add(key);
		}

		return this.handleCssClasses(filePath, note);
	}
}
