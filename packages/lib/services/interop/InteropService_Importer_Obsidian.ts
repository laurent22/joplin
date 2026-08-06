import InteropService_Importer_Md_frontmatter from './InteropService_Importer_Md_frontmatter';
import { ImportExportResult } from './types';
import Tag from '../../models/Tag';
import Note from '../../models/Note';
import markdownUtils from '../../markdownUtils';
import { toForwardSlashes } from '../../path-utils';
import shim from '../../shim';

const emojiRegex = /\p{Extended_Pictographic}/u;
const tagRegex = new RegExp(`(?:^|\\s)#([\\w\\p{L}${emojiRegex.source}/-]+)`, 'gu');
const normalizedTag = (tag: string) => tag.toLowerCase();
const wikilinkRegex = /(?<![!\\])\[\[([^|\r\n]+?)(?:\|([^\r\n]+?))?\]\]/g;
// Matches Obsidian file embeds such as ![[photo.png]].
const embedRegex = /(?<!\\)!\[\[([^|\r\n]+?)\]\]/g;
const withoutMarkdownExtension = (path: string) => path.replace(/\.md$/i, '');

const addToIndex = (index: Map<string, string[]>, key: string, noteId: string) => {
	const noteIds = index.get(key) || [];
	noteIds.push(noteId);
	index.set(key, noteIds);
};

// Obsidian-specific import behaviour belongs in this class. This keeps it from
// changing the normal Markdown and Markdown + Front Matter importers.
export default class InteropService_Importer_Obsidian extends InteropService_Importer_Md_frontmatter {
	public async exec(result: ImportExportResult) {
		await super.exec(result);
		await this.convertWikilinks();
		return result;
	}

	private buildNoteIdsByWikilinkTarget(vaultPathPrefix: string) {
		const noteIdsByWikilinkTarget = new Map<string, string[]>();

		for (const [sourcePath, note] of Object.entries(this.importedNotes)) {
			const normalizedSourcePath = toForwardSlashes(sourcePath);
			if (!normalizedSourcePath.startsWith(vaultPathPrefix)) continue;

			const relativePath = withoutMarkdownExtension(normalizedSourcePath.slice(vaultPathPrefix.length));
			const pathParts = relativePath.split('/');
			for (let index = 0; index < pathParts.length; index++) {
				addToIndex(noteIdsByWikilinkTarget, pathParts.slice(index).join('/'), note.id);
			}
		}

		return noteIdsByWikilinkTarget;
	}

	private async convertWikilinks() {
		const vaultPath = toForwardSlashes(shim.fsDriver().resolve(this.sourcePath_));
		const vaultPathPrefix = `${vaultPath}/`;
		const noteIdsByWikilinkTarget = this.buildNoteIdsByWikilinkTarget(vaultPathPrefix);

		for (const [sourcePath, note] of Object.entries(this.importedNotes)) {
			if (!toForwardSlashes(sourcePath).startsWith(vaultPathPrefix)) continue;

			const body = note.body.replace(wikilinkRegex, (wikilink, target: string, shownName?: string) => {
				const normalizedTarget = withoutMarkdownExtension(target);
				const matchingNoteIds = noteIdsByWikilinkTarget.get(normalizedTarget);
				if (matchingNoteIds?.length !== 1) return wikilink;

				const label = markdownUtils.escapeTitleText(shownName || target);
				return `[${label}](:/${matchingNoteIds[0]})`;
			});

			if (body === note.body) continue;
			this.importedNotes[sourcePath] = await Note.save({ ...note, body }, { isNew: false, autoTimestamp: false });
		}
	}

	public async importLocalFiles(filePath: string, body: string, parentFolderId: string) {
		// Convert Obsidian embeds to Markdown so the existing importer can import the linked files.
		const markdownBody = body.replace(embedRegex, '![$1]($1)');
		return super.importLocalFiles(filePath, markdownBody, parentFolderId);
	}

	public async importFile(filePath: string, parentFolderId: string) {
		const note = await super.importFile(filePath, parentFolderId);
		const existingTags = await Tag.tagsByNoteId(note.id);
		const existingTagNames = new Set(existingTags.map(tag => normalizedTag(tag.title)));

		for (const [, tag] of note.body.matchAll(tagRegex)) {
			if (/^\d+$/.test(tag)) continue;

			const key = normalizedTag(tag);
			if (existingTagNames.has(key)) continue;

			await Tag.addNoteTagByTitle(note.id, tag);
			existingTagNames.add(key);
		}

		return note;
	}
}
