import { BaseModel } from 'src/base-model.js';
import { Log } from 'src/log.js';
import { promiseChain } from 'src/promise-utils.js';
import { Note } from 'src/models/note.js';
import { Setting } from 'src/models/setting.js';
import { _ } from 'src/locale.js';
import moment from 'moment';
import { BaseItem } from 'src/models/base-item.js';

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

	static delete(folderId, options = null) {
		return this.load(folderId).then((folder) => {
			if (!folder) throw new Error('Trying to delete non-existing folder: ' + folderId);

			if (!!folder.is_default) {
				throw new Error(_('Cannot delete the default list'));
			}
		}).then(() => {
			return this.noteIds(folderId);
		}).then((ids) => {
			let chain = [];
			for (let i = 0; i < ids.length; i++) {
				chain.push(() => {
					return Note.delete(ids[i]);
				});
			}

			return promiseChain(chain);
		}).then(() => {
			return super.delete(folderId, options);
		}).then(() => {
			this.dispatch({
				type: 'FOLDER_DELETE',
				folderId: folderId,
			});
		});
	}

	static loadNoteByField(folderId, field, value) {
		return this.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 0 AND `parent_id` = ? AND `' + field + '` = ?', [folderId, value]);
	}

	static async all(includeNotes = false) {
		let folders = await Folder.modelSelectAll('SELECT * FROM folders');
		if (!includeNotes) return folders;

		let notes = await Note.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 0');
		return folders.concat(notes);
	}

	static save(o, options = null) {
		return Folder.loadByField('title', o.title).then((existingFolder) => {
			if (existingFolder && existingFolder.id != o.id) throw new Error(_('A folder with title "%s" already exists', o.title));

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