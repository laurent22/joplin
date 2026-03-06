import InteropService_Importer_Md from './InteropService_Importer_Md';
import Note from '../../models/Note';
import Folder from '../../models/Folder';
import Tag from '../../models/Tag';
import shim from '../../shim';
import { parse } from '../../utils/frontMatter';
import { defaultFolderIcon, FolderIconType } from '../database/types';
import * as yaml from 'js-yaml';
import Logger from '@joplin/utils/Logger';
import { basename, fileExtension } from '../../path-utils';

const logger = Logger.create('InteropService_Importer_Md_frontmatter');

export default class InteropService_Importer_Md_frontmatter extends InteropService_Importer_Md {

	public async importDirectory(dirPath: string, parentFolderId: string) {
		// Check for _notebook.yml and apply folder metadata (icon)
		await this.applyNotebookMetadata(dirPath, parentFolderId);

		// Proceed with normal directory import
		const supportedFileExtension = this.metadata().fileExtensions;
		const stats = await shim.fsDriver().readDirStats(dirPath);
		for (let i = 0; i < stats.length; i++) {
			const stat = stats[i];

			if (stat.isDirectory()) {
				if (await this.isDirectoryEmpty(`${dirPath}/${stat.path}`)) {
					continue;
				}
				const folderTitle = await Folder.findUniqueItemTitle(basename(stat.path));
				const folder = await Folder.save({ title: folderTitle, parent_id: parentFolderId });
				await this.importDirectory(`${dirPath}/${basename(stat.path)}`, folder.id);
			} else if (supportedFileExtension.indexOf(fileExtension(stat.path).toLowerCase()) >= 0) {
				await this.importFile(`${dirPath}/${stat.path}`, parentFolderId);
			}
		}
	}

	private async applyNotebookMetadata(dirPath: string, folderId: string) {
		const metadataPath = `${dirPath}/_notebook.yml`;
		if (!(await shim.fsDriver().exists(metadataPath))) return;

		try {
			const content = await shim.fsDriver().readFile(metadataPath, 'utf-8');
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic YAML content
			const metadata: any = yaml.load(content, { schema: yaml.FAILSAFE_SCHEMA });
			if (!metadata || !metadata.icon) return;

			const folder = await Folder.load(folderId);
			if (!folder || folder.icon) return; // Don't overwrite existing icon

			const folderIcon = await this.parseFolderIcon(metadata.icon, dirPath);
			if (folderIcon) {
				await Folder.save({ id: folderId, icon: JSON.stringify(folderIcon) }, { isNew: false });
			}
		} catch (e) {
			logger.warn(`Failed to import folder metadata from ${metadataPath}:`, e);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic YAML content
	private async parseFolderIcon(iconData: any, dirPath: string) {
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
			const fileName = String(iconData.dataurl || '');
			if (!fileName) return null;
			const iconFilePath = `${dirPath}/${fileName}`;
			if (!(await shim.fsDriver().exists(iconFilePath))) {
				logger.warn(`Icon file not found: ${iconFilePath}`);
				return null;
			}
			try {
				const ext = fileExtension(fileName).toLowerCase();
				const mimeTypes: Record<string, string> = {
					'png': 'image/png',
					'jpg': 'image/jpeg',
					'jpeg': 'image/jpeg',
					'gif': 'image/gif',
					'svg': 'image/svg+xml',
					'webp': 'image/webp',
				};
				const mimeType = mimeTypes[ext] || 'image/png';
				const base64Data = await shim.fsDriver().readFile(iconFilePath, 'base64');
				icon.type = FolderIconType.DataUrl;
				icon.dataUrl = `data:${mimeType};base64,${base64Data}`;
			} catch (e) {
				logger.warn(`Failed to read icon file ${iconFilePath}:`, e);
				return null;
			}
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
