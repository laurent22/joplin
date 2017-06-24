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
		return this.modelSelectOne('SELECT * FROM notes WHERE is_conflict = 0 AND `parent_id` = ? AND `' + field + '` = ?', [folderId, value]);
	}

	static async all(includeNotes = false) {
		let folders = await Folder.modelSelectAll('SELECT * FROM folders');
		if (!includeNotes) return folders;

		let notes = await Note.modelSelectAll('SELECT * FROM notes WHERE is_conflict = 0');
		return folders.concat(notes);
	}

	static async defaultFolder() {
		return this.modelSelectOne('SELECT * FROM folders WHERE is_default = 1');
	}

	static save(o, options = null) {
		return Folder.loadByField('title', o.title).then((existingFolder) => {
			if (existingFolder && existingFolder.id != o.id) throw new Error(_('A folder with title "%s" already exists', o.title));

			if ('is_default' in o) {
				if (!o.is_default) {
					o = Object.assign({}, o);
					delete o.is_default;
					Log.warn('is_default property cannot be set to 0 directly. Instead, set the folder that should become the default to 1.');
				} else {
					options = this.modOptions(options);
					options.transactionNextQueries.push(
						{ sql: 'UPDATE folders SET is_default = 0 WHERE id != ?', params: [o.id] },
					);
				}
			}

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