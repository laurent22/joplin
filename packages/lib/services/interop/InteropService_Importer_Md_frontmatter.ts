import InteropService_Importer_Md from './InteropService_Importer_Md';
import Note from '../../models/Note';
import Folder from '../../models/Folder';
import Tag from '../../models/Tag';
import shim from '../../shim';
import { parse } from '../../utils/frontMatter';
import { defaultFolderIcon, FolderIconType } from '../database/types';
import * as yaml from 'js-yaml';
import Logger from '@joplin/utils/Logger';


const logger = Logger.create('InteropService_Importer_Md_frontmatter');

interface FolderIconData {
	type?: string;
	emoji?: string;
	name?: string;
	dataurl?: string;
}

interface FolderMetadata {
	icon?: FolderIconData;
}

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

	private parseFolderIcon(iconData: FolderIconData) {
		if (!iconData || typeof iconData !== 'object') return null;

		const typeStr = String(iconData.type || '').toLowerCase();
		const icon = defaultFolderIcon();

		switch (typeStr) {
		case 'emoji':
			icon.type = FolderIconType.Emoji;
			icon.emoji = String(iconData.emoji || '');
			if (!icon.emoji) return null;
			break;
		case 'fontawesome':
			icon.type = FolderIconType.FontAwesome;
			icon.name = String(iconData.name || '');
			if (!icon.name) return null;
			break;
		case 'dataurl': {
			const dataUrl = String(iconData.dataurl || '');
			if (!dataUrl) return null;
			icon.type = FolderIconType.DataUrl;
			icon.dataUrl = dataUrl;
			break;
		}
		default:
			return null;
		}

		return icon;
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
