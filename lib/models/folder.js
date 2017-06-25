import { BaseModel } from 'lib/base-model.js';
import { Log } from 'lib/log.js';
import { promiseChain } from 'lib/promise-utils.js';
import { Note } from 'lib/models/note.js';
import { Setting } from 'lib/models/setting.js';
import { _ } from 'lib/locale.js';
import moment from 'moment';
import { BaseItem } from 'lib/models/base-item.js';

class Folder extends BaseItem {

	static tableName() {
		return 'folders';
	}

	static serialize(folder) {
		return super.serialize(folder, 'folder', ['id', 'created_time', 'updated_time', 'type_']);
	}

	static itemType() {
		return BaseModel.MODEL_TYPE_FOLDER;
	}

	static trackChanges() {
		return true;
	}

	static trackDeleted() {
		return true;
	}
	
	static newFolder() {
		return {
			id: null,
			title: '',
		}
	}

	static syncedNoteIds() {
		return this.db().selectAll('SELECT id FROM notes WHERE is_conflict = 0 AND sync_time > 0').then((rows) => {
			let output = [];
			for (let i = 0; i < rows.length; i++) {
				output.push(rows[i].id);
			}
			return output;
		});
	}

	static noteIds(parentId) {
		return this.db().selectAll('SELECT id FROM notes WHERE is_conflict = 0 AND parent_id = ?', [parentId]).then((rows) => {			
			let output = [];
			for (let i = 0; i < rows.length; i++) {
				let row = rows[i];
				output.push(row.id);
			}
			return output;
		});
	}

	static async delete(folderId, options = null) {
		let folder = await Folder.load(folderId);
		if (!folder) throw new Error('Trying to delete non-existing notebook: ' + folderId);

		let count = await Folder.count();
		if (count <= 1) throw new Error(_('Cannot delete the last notebook'));

		let noteIds = await Folder.noteIds(folderId);
		for (let i = 0; i < noteIds.length; i++) {
			await Note.delete(noteIds[i]);
		}

		super.delete(folderId, options);

		this.dispatch({
			type: 'FOLDER_DELETE',
			folderId: folderId,
		});
	}

	static loadNoteByField(folderId, field, value) {
		return this.modelSelectOne('SELECT * FROM notes WHERE is_conflict = 0 AND `parent_id` = ? AND `' + field + '` = ?', [folderId, value]);
	}

	static async all(includeNotes = false) {
		let folders = await Folder.modelSelectAll('SELECT * FROM folders');
		if (!includeNotes) return folders;

		let notes = await Note.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 0');
		return folders.concat(notes);
	}

	static async defaultFolder() {
		return this.modelSelectOne('SELECT * FROM folders ORDER BY created_time DESC LIMIT 1');
	}

	static save(o, options = null) {
		return Folder.loadByField('title', o.title).then((existingFolder) => {
			if (existingFolder && existingFolder.id != o.id) throw new Error(_('A notebook with title "%s" already exists', o.title));

			return super.save(o, options).then((folder) => {
				this.dispatch({
					type: 'FOLDERS_UPDATE_ONE',
					folder: folder,
				});
				return folder;
			});
		});
	}

}

export { Folder };