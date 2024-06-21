import InteropService_Importer_Md from './InteropService_Importer_Md';
import Note from '../../models/Note';
import Tag from '../../models/Tag';
import shim from '../../shim';
import { parse } from '../../utils/frontMatter';

export default class InteropService_Importer_Md_frontmatter extends InteropService_Importer_Md {

	public async importFile(filePath: string, parentFolderId: string) {
		try {
			const note = await super.importFile(filePath, parentFolderId);
			const { metadata, tags } = parse(note.body);

			const updatedNote = { ...note, ...metadata };

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
