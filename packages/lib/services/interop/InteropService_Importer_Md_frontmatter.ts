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

// The YAML FAILSAFE_SCHEMA returns all values as strings, so the raw parsed
// icon object has string keys that don't exactly match FolderIcon (e.g.
// "dataurl" vs "dataUrl"). This interface represents the raw YAML shape.
interface RawYamlFolderIcon {
	type?: string;
	emoji?: string;
	name?: string;
	dataurl?: string;
}

interface FolderMetadata {
	icon?: RawYamlFolderIcon;
}

// Maps the string labels written by the exporter to FolderIconType enum values.
const folderIconTypeFromString = (typeStr: string): FolderIconType | null => {
	switch (typeStr) {
	case 'emoji': return FolderIconType.Emoji;
	case 'fontawesome': return FolderIconType.FontAwesome;
	case 'dataurl': return FolderIconType.DataUrl;
	default: return null;
	}
};

export default class InteropService_Importer_Md_frontmatter extends InteropService_Importer_Md {

	public async importDirectory(dirPath: string, parentFolderId: string) {
		// Apply folder metadata (_folder.yml) before importing directory contents.
		// super.importDirectory() recurses via this.importDirectory(), so metadata
		// is applied to every subdirectory automatically through polymorphism.
		await this.applyFolderMetadata(dirPath, parentFolderId);
		await super.importDirectory(dirPath, parentFolderId);
	}

	private async applyFolderMetadata(dirPath: string, folderId: string) {
		const metadataPath = `${dirPath}/_folder.yml`;
		if (!(await shim.fsDriver().exists(metadataPath))) return;

		try {
			const content = await shim.fsDriver().readFile(metadataPath, 'utf-8');
			const metadata = yaml.load(content, { schema: yaml.FAILSAFE_SCHEMA }) as FolderMetadata;
			if (!metadata || !metadata.icon) return;

			const folder = await Folder.load(folderId);
			if (!folder || folder.icon) return; // Don't overwrite existing icon

			const folderIcon = this.parseFolderIcon(metadata.icon);
			if (folderIcon) {
				await Folder.save({ id: folderId, icon: JSON.stringify(folderIcon) }, { isNew: false });
			}
		} catch (e) {
			logger.warn(`Failed to import folder metadata from ${metadataPath}:`, e);
		}
	}

	private parseFolderIcon(raw: RawYamlFolderIcon): FolderIcon | null {
		if (!raw || typeof raw !== 'object') return null;

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
