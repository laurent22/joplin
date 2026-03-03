import InteropService_Importer_Md from './InteropService_Importer_Md';
import Note from '../../models/Note';
import Folder from '../../models/Folder';
import Tag from '../../models/Tag';
import shim from '../../shim';
import { parse } from '../../utils/frontMatter';
import { defaultFolderIcon, FolderIconType } from '../database/types';

export default class InteropService_Importer_Md_frontmatter extends InteropService_Importer_Md {

	public async importFile(filePath: string, parentFolderId: string) {
		try {
			const note = await super.importFile(filePath, parentFolderId);
			const { metadata, tags, notebookIcon } = parse(note.body);

			const updatedNote = {
				...note,
				...metadata,
				title: metadata.title ? metadata.title : note.title,
			};

			const noteItem = await Note.save(updatedNote, { isNew: false, autoTimestamp: false });

			const resolvedPath = shim.fsDriver().resolve(filePath);
			this.importedNotes[resolvedPath] = noteItem;

			for (const tag of tags) { await Tag.addNoteTagByTitle(noteItem.id, tag); }

			// Restore notebook icon if present in frontmatter
			if (notebookIcon && parentFolderId) {
				const folder = await Folder.load(parentFolderId);
				if (folder && !folder.icon) {
					const icon = defaultFolderIcon();
					icon.type = FolderIconType.Emoji;
					icon.emoji = notebookIcon;
					await Folder.save({ id: parentFolderId, icon: JSON.stringify(icon) }, { isNew: false });
				}
			}

			return noteItem;
		} catch (error) {
			error.message = `On ${filePath}: ${error.message}`;
			throw error;
		}
	}
}
