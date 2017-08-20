import { BaseItem } from 'lib/models/base-item.js';
import { BaseModel } from 'lib/base-model.js';
import { Resource } from 'lib/models/resource.js';
import { Folder } from 'lib/models/folder.js';
import { NoteTag } from 'lib/models/note-tag.js';
import { Note } from 'lib/models/note.js';
import { Tag } from 'lib/models/tag.js';
import { basename } from 'lib/path-utils.js';
import fs from 'fs-extra';

class Exporter {

	async export(options) {
		const destDir = options.destDir ? options.destDir : null;
		const resourceDir = destDir ? destDir + '/resources' : null;
		const writeFile = options.writeFile ? options.writeFile : null;
		const copyFile = options.copyFile ? options.copyFile : null;
		const sourceFolderIds = options.sourceFolderIds ? options.sourceFolderIds : [];
		const sourceNoteIds = options.sourceNoteIds ? options.sourceNoteIds : [];

		let result = {
			warnings: [],
		};

		await fs.mkdirp(destDir);
		await fs.mkdirp(resourceDir);

		const exportItem = async (itemType, itemOrId) => {
			const ItemClass = BaseItem.getClassByItemType(itemType);
			const item = typeof itemOrId === 'object' ? itemOrId : await ItemClass.load(itemOrId);

			if (!item) {
				result.warnings.push('Cannot find item with type ' + itemType + ' and ID ' + JSON.stringify(itemOrId));
				return;
			}

			const serialized = await ItemClass.serialize(item);
			const filePath = destDir + '/' + ItemClass.systemPath(item);
			await writeFile(filePath, serialized);

			if (itemType == BaseModel.TYPE_RESOURCE) {
				const sourceResourcePath = Resource.fullPath(item);
				const destResourcePath = resourceDir + '/' + basename(sourceResourcePath);
				await copyFile(sourceResourcePath, destResourcePath);
			}
		}

		let exportedNoteIds = [];
		let resourceIds = [];
		const folderIds = await Folder.allIds();

		for (let folderIndex = 0; folderIndex < folderIds.length; folderIndex++) {
			const folderId = folderIds[folderIndex];
			if (sourceFolderIds.length && sourceFolderIds.indexOf(folderId) < 0) continue;

			if (!sourceNoteIds.length) await exportItem(BaseModel.TYPE_FOLDER, folderId);

			const noteIds = await Folder.noteIds(folderId);

			for (let noteIndex = 0; noteIndex < noteIds.length; noteIndex++) {
				const noteId = noteIds[noteIndex];
				if (sourceNoteIds.length && sourceNoteIds.indexOf(noteId) < 0) continue;
				const note = await Note.load(noteId);
				await exportItem(BaseModel.TYPE_NOTE, note);
				exportedNoteIds.push(noteId);

				const rids = Note.linkedResourceIds(note.body);
				resourceIds = resourceIds.concat(rids);
			}
		}

		for (let i = 0; i < resourceIds.length; i++) {
			await exportItem(BaseModel.TYPE_RESOURCE, resourceIds[i]);
		}

		const noteTags = await NoteTag.all();

		let exportedTagIds = [];

		for (let i = 0; i < noteTags.length; i++) {
			const noteTag = noteTags[i];
			if (exportedNoteIds.indexOf(noteTag.note_id) < 0) continue;
			await exportItem(BaseModel.TYPE_NOTE_TAG, noteTag.id);
			exportedTagIds.push(noteTag.tag_id);
		}

		for (let i = 0; i < exportedTagIds.length; i++) {
			await exportItem(BaseModel.TYPE_TAG, exportedTagIds[i]);
		}

		return result;
	}

}

export { Exporter }