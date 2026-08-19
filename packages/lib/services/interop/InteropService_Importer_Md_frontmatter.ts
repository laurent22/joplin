import InteropService_Importer_Md from './InteropService_Importer_Md';
import Note from '../../models/Note';
import Folder from '../../models/Folder';
import Tag from '../../models/Tag';
import shim from '../../shim';
import { parse } from '../../utils/frontMatter';
import { FolderIcon, FolderIconType } from '../database/types';
import * as yaml from 'js-yaml';
import Logger from '@joplin/utils/Logger';


const logger = Logger.create('InteropService_Importer_Md_frontmatter');

// Maps the string labels written by the exporter back to FolderIconType enum values.
const folderIconTypeFromString = (typeStr: string): FolderIconType | null => {
	switch (typeStr) {
	case 'emoji': return FolderIconType.Emoji;
	case 'fontawesome': return FolderIconType.FontAwesome;
	case 'dataurl': return FolderIconType.DataUrl;
	default: return null;
	}
};

// Parses the raw YAML-parsed value into a FolderIcon. The YAML FAILSAFE_SCHEMA
// returns all values as strings and uses lowercase keys (e.g. "dataurl" instead
// of "dataUrl"), so we normalise immediately after parsing to avoid carrying two
// separate interfaces around.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- The raw YAML output is untyped
const parseRawYamlToFolderIcon = (raw: any): FolderIcon | null => {
	if (!raw || typeof raw !== 'object') return null;
	if (typeof raw.type !== 'string') return null;

	const iconType = folderIconTypeFromString(raw.type);
	if (iconType === null) return null;

	switch (iconType) {
	case FolderIconType.Emoji:
		if (!raw.emoji) return null;
		return { type: FolderIconType.Emoji, emoji: raw.emoji, name: '', dataUrl: '' };
	case FolderIconType.FontAwesome:
		if (!raw.name) return null;
		return { type: FolderIconType.FontAwesome, emoji: '', name: raw.name, dataUrl: '' };
	case FolderIconType.DataUrl:
		if (!raw.dataurl) return null;
		return { type: FolderIconType.DataUrl, emoji: '', name: '', dataUrl: raw.dataurl };
	default: {
		const exhaustivenessCheck: never = iconType;
		throw new Error(`Unknown folder icon type: ${exhaustivenessCheck}`);
	}
	}
};

export default class InteropService_Importer_Md_frontmatter extends InteropService_Importer_Md {

	public async importDirectory(dirPath: string, parentFolderId: string) {
		// super.importDirectory() imports files and recursively processes
		// subdirectories. It must run first so that all child folders exist
		// before we try to apply metadata to them.
		await super.importDirectory(dirPath, parentFolderId);

		// The _folder.yml file inside `dirPath` describes the folder that
		// corresponds to `dirPath` itself. In the import flow,
		// `parentFolderId` is the DB ID of that folder (it was created by the
		// caller — either `exec()` for the root, or the parent
		// `importDirectory` for subdirectories).
		await this.applyFolderMetadata(dirPath, parentFolderId);
	}

	private async applyFolderMetadata(dirPath: string, folderId: string) {
		const metadataPath = `${dirPath}/_folder.yml`;
		if (!(await shim.fsDriver().exists(metadataPath))) return;

		try {
			const content = await shim.fsDriver().readFile(metadataPath, 'utf-8');
			const metadata = yaml.load(content, { schema: yaml.FAILSAFE_SCHEMA }) as Record<string, unknown>;
			if (!metadata || !metadata.icon) return;

			const folderIcon = parseRawYamlToFolderIcon(metadata.icon);
			if (folderIcon) {
				await Folder.save({ id: folderId, icon: JSON.stringify(folderIcon) }, { isNew: false });
			}
		} catch (e) {
			logger.warn(`Failed to import folder metadata from ${metadataPath}:`, e);
		}
	}

	public async importFile(filePath: string, parentFolderId: string) {
		try {
			const note = await super.importFile(filePath, parentFolderId);
			const { metadata, tags } = parse(note.body);

			const updatedNote = {
				...note,
				...metadata,
				title: metadata.title ? metadata.title : note.title,
			};

			const noteItem = await Note.save(updatedNote, { isNew: false, autoTimestamp: false });

			const resolvedPath = shim.fsDriver().resolve(filePath);
			this.importedNotes[resolvedPath] = noteItem;

			for (const tag of tags) { await Tag.addNoteTagByTitle(noteItem.id, tag); }

			return noteItem;
		} catch (error) {
			error.message = `On ${filePath}: ${error.message}`;
			throw error;
		}
	}
}
